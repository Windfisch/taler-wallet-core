/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import {
  CreateReserveRequest,
  CreateReserveResponse,
  getTimestampNow,
  ConfirmReserveRequest,
  OperationError,
} from "../types/walletTypes";
import { canonicalizeBaseUrl } from "../util/helpers";
import { InternalWalletState } from "./state";
import {
  ReserveRecordStatus,
  ReserveRecord,
  CurrencyRecord,
  Stores,
  WithdrawalSessionRecord,
  initRetryInfo,
  updateRetryInfoTimeout,
} from "../types/dbTypes";
import {
  Database,
  TransactionAbort,
} from "../util/query";
import { Logger } from "../util/logging";
import * as Amounts from "../util/amounts";
import { updateExchangeFromUrl, getExchangeTrust } from "./exchanges";
import { WithdrawOperationStatusResponse, ReserveStatus } from "../types/talerTypes";
import { assertUnreachable } from "../util/assertUnreachable";
import { encodeCrock } from "../crypto/talerCrypto";
import { randomBytes } from "../crypto/primitives/nacl-fast";
import {
  getVerifiedWithdrawDenomList,
  processWithdrawSession,
} from "./withdraw";
import { guardOperationException, OperationFailedAndReportedError } from "./errors";
import { NotificationType } from "../types/notifications";

const logger = new Logger("reserves.ts");

/**
 * Create a reserve, but do not flag it as confirmed yet.
 *
 * Adds the corresponding exchange as a trusted exchange if it is neither
 * audited nor trusted already.
 */
export async function createReserve(
  ws: InternalWalletState,
  req: CreateReserveRequest,
): Promise<CreateReserveResponse> {
  const keypair = await ws.cryptoApi.createEddsaKeypair();
  const now = getTimestampNow();
  const canonExchange = canonicalizeBaseUrl(req.exchange);

  let reserveStatus;
  if (req.bankWithdrawStatusUrl) {
    reserveStatus = ReserveRecordStatus.REGISTERING_BANK;
  } else {
    reserveStatus = ReserveRecordStatus.UNCONFIRMED;
  }

  const currency = req.amount.currency;

  const reserveRecord: ReserveRecord = {
    created: now,
    withdrawAllocatedAmount: Amounts.getZero(currency),
    withdrawCompletedAmount: Amounts.getZero(currency),
    withdrawRemainingAmount: Amounts.getZero(currency),
    exchangeBaseUrl: canonExchange,
    hasPayback: false,
    initiallyRequestedAmount: req.amount,
    reservePriv: keypair.priv,
    reservePub: keypair.pub,
    senderWire: req.senderWire,
    timestampConfirmed: undefined,
    timestampReserveInfoPosted: undefined,
    bankWithdrawStatusUrl: req.bankWithdrawStatusUrl,
    exchangeWire: req.exchangeWire,
    reserveStatus,
    lastSuccessfulStatusQuery: undefined,
    retryInfo: initRetryInfo(),
    lastError: undefined,
  };

  const senderWire = req.senderWire;
  if (senderWire) {
    const rec = {
      paytoUri: senderWire,
    };
    await ws.db.put(Stores.senderWires, rec);
  }

  const exchangeInfo = await updateExchangeFromUrl(ws, req.exchange);
  const exchangeDetails = exchangeInfo.details;
  if (!exchangeDetails) {
    console.log(exchangeDetails);
    throw Error("exchange not updated");
  }
  const { isAudited, isTrusted } = await getExchangeTrust(ws, exchangeInfo);
  let currencyRecord = await ws.db.get(
    Stores.currencies,
    exchangeDetails.currency,
  );
  if (!currencyRecord) {
    currencyRecord = {
      auditors: [],
      exchanges: [],
      fractionalDigits: 2,
      name: exchangeDetails.currency,
    };
  }

  if (!isAudited && !isTrusted) {
    currencyRecord.exchanges.push({
      baseUrl: req.exchange,
      exchangePub: exchangeDetails.masterPublicKey,
    });
  }

  const cr: CurrencyRecord = currencyRecord;

  const resp = await ws.db.runWithWriteTransaction(
    [Stores.currencies, Stores.reserves, Stores.bankWithdrawUris],
    async tx => {
      // Check if we have already created a reserve for that bankWithdrawStatusUrl
      if (reserveRecord.bankWithdrawStatusUrl) {
        const bwi = await tx.get(
          Stores.bankWithdrawUris,
          reserveRecord.bankWithdrawStatusUrl,
        );
        if (bwi) {
          const otherReserve = await tx.get(Stores.reserves, bwi.reservePub);
          if (otherReserve) {
            logger.trace(
              "returning existing reserve for bankWithdrawStatusUri",
            );
            return {
              exchange: otherReserve.exchangeBaseUrl,
              reservePub: otherReserve.reservePub,
            };
          }
        }
        await tx.put(Stores.bankWithdrawUris, {
          reservePub: reserveRecord.reservePub,
          talerWithdrawUri: reserveRecord.bankWithdrawStatusUrl,
        });
      }
      await tx.put(Stores.currencies, cr);
      await tx.put(Stores.reserves, reserveRecord);
      const r: CreateReserveResponse = {
        exchange: canonExchange,
        reservePub: keypair.pub,
      };
      return r;
    },
  );

  ws.notify({ type: NotificationType.ReserveCreated });

  // Asynchronously process the reserve, but return
  // to the caller already.
  processReserve(ws, resp.reservePub, true).catch(e => {
    console.error("Processing reserve failed:", e);
  });

  return resp;
}

/**
 * First fetch information requred to withdraw from the reserve,
 * then deplete the reserve, withdrawing coins until it is empty.
 *
 * The returned promise resolves once the reserve is set to the
 * state DORMANT.
 */
export async function processReserve(
  ws: InternalWalletState,
  reservePub: string,
  forceNow: boolean = false,
): Promise<void> {
  return ws.memoProcessReserve.memo(reservePub, async () => {
    const onOpError = (err: OperationError) =>
      incrementReserveRetry(ws, reservePub, err);
    await guardOperationException(
      () => processReserveImpl(ws, reservePub, forceNow),
      onOpError,
    );
  });
}


async function registerReserveWithBank(
  ws: InternalWalletState,
  reservePub: string,
): Promise<void> {
  let reserve = await ws.db.get(Stores.reserves, reservePub);
  switch (reserve?.reserveStatus) {
    case ReserveRecordStatus.WAIT_CONFIRM_BANK:
    case ReserveRecordStatus.REGISTERING_BANK:
      break;
    default:
      return;
  }
  const bankStatusUrl = reserve.bankWithdrawStatusUrl;
  if (!bankStatusUrl) {
    return;
  }
  console.log("making selection");
  if (reserve.timestampReserveInfoPosted) {
    throw Error("bank claims that reserve info selection is not done");
  }
  const bankResp = await ws.http.postJson(bankStatusUrl, {
    reserve_pub: reservePub,
    selected_exchange: reserve.exchangeWire,
  });
  console.log("got response", bankResp);
  await ws.db.mutate(Stores.reserves, reservePub, r => {
    switch (r.reserveStatus) {
      case ReserveRecordStatus.REGISTERING_BANK:
      case ReserveRecordStatus.WAIT_CONFIRM_BANK:
        break;
      default:
        return;
    }
    r.timestampReserveInfoPosted = getTimestampNow();
    r.reserveStatus = ReserveRecordStatus.WAIT_CONFIRM_BANK;
    r.retryInfo = initRetryInfo();
    return r;
  });
  ws.notify( { type: NotificationType.Wildcard });
  return processReserveBankStatus(ws, reservePub);
}

export async function processReserveBankStatus(
  ws: InternalWalletState,
  reservePub: string,
): Promise<void> {
  const onOpError = (err: OperationError) =>
    incrementReserveRetry(ws, reservePub, err);
  await guardOperationException(
    () => processReserveBankStatusImpl(ws, reservePub),
    onOpError,
  );
}

async function processReserveBankStatusImpl(
  ws: InternalWalletState,
  reservePub: string,
): Promise<void> {
  let reserve = await ws.db.get(Stores.reserves, reservePub);
  switch (reserve?.reserveStatus) {
    case ReserveRecordStatus.WAIT_CONFIRM_BANK:
    case ReserveRecordStatus.REGISTERING_BANK:
      break;
    default:
      return;
  }
  const bankStatusUrl = reserve.bankWithdrawStatusUrl;
  if (!bankStatusUrl) {
    return;
  }

  let status: WithdrawOperationStatusResponse;
  try {
    const statusResp = await ws.http.get(bankStatusUrl);
    if (statusResp.status !== 200) {
      throw Error(`unexpected status ${statusResp.status} for bank status query`);
    }
    status = WithdrawOperationStatusResponse.checked(await statusResp.json());
  } catch (e) {
    throw e;
  }

  ws.notify( { type: NotificationType.Wildcard });

  if (status.selection_done) {
    if (reserve.reserveStatus === ReserveRecordStatus.REGISTERING_BANK) {
      await registerReserveWithBank(ws, reservePub);
      return await processReserveBankStatus(ws, reservePub);
    }
  } else {
    await registerReserveWithBank(ws, reservePub);
    return await processReserveBankStatus(ws, reservePub);
  }

  if (status.transfer_done) {
    await ws.db.mutate(Stores.reserves, reservePub, r => {
      switch (r.reserveStatus) {
        case ReserveRecordStatus.REGISTERING_BANK:
        case ReserveRecordStatus.WAIT_CONFIRM_BANK:
          break;
        default:
          return;
      }
      const now = getTimestampNow();
      r.timestampConfirmed = now;
      r.reserveStatus = ReserveRecordStatus.QUERYING_STATUS;
      r.retryInfo = initRetryInfo();
      return r;
    });
    await processReserveImpl(ws, reservePub, true);
  } else {
    await ws.db.mutate(Stores.reserves, reservePub, r => {
      switch (r.reserveStatus) {
        case ReserveRecordStatus.WAIT_CONFIRM_BANK:
          break;
        default:
          return;
      }
      r.bankWithdrawConfirmUrl = status.confirm_transfer_url;
      return r;
    });
    await incrementReserveRetry(ws, reservePub, undefined);
  }
  ws.notify( { type: NotificationType.Wildcard });
}

async function incrementReserveRetry(
  ws: InternalWalletState,
  reservePub: string,
  err: OperationError | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.reserves], async tx => {
    const r = await tx.get(Stores.reserves, reservePub);
    if (!r) {
      return;
    }
    if (!r.retryInfo) {
      return;
    }
    r.retryInfo.retryCounter++;
    updateRetryInfoTimeout(r.retryInfo);
    r.lastError = err;
    await tx.put(Stores.reserves, r);
  });
  ws.notify({ type: NotificationType.ReserveOperationError });
}

/**
 * Update the information about a reserve that is stored in the wallet
 * by quering the reserve's exchange.
 */
async function updateReserve(
  ws: InternalWalletState,
  reservePub: string,
): Promise<void> {
  const reserve = await ws.db.get(Stores.reserves, reservePub);
  if (!reserve) {
    throw Error("reserve not in db");
  }

  if (reserve.timestampConfirmed === undefined) {
    throw Error("reserve not confirmed yet");
  }

  if (reserve.reserveStatus !== ReserveRecordStatus.QUERYING_STATUS) {
    return;
  }

  const reqUrl = new URL("reserve/status", reserve.exchangeBaseUrl);
  reqUrl.searchParams.set("reserve_pub", reservePub);
  let resp;
  try {
    resp = await ws.http.get(reqUrl.href);
    if (resp.status === 404) {
      const m = "The exchange does not know about this reserve (yet).";
      await incrementReserveRetry(ws, reservePub, undefined);
      return;
    }
    if (resp.status !== 200) {
      throw Error(`unexpected status code ${resp.status} for reserve/status`)
    }
  } catch (e) {
    const m = e.message;
    await incrementReserveRetry(ws, reservePub, {
      type: "network",
      details: {},
      message: m,
    });
    throw new OperationFailedAndReportedError(m);
  }
  const reserveInfo = ReserveStatus.checked(await resp.json());
  const balance = Amounts.parseOrThrow(reserveInfo.balance);
  await ws.db.mutate(Stores.reserves, reserve.reservePub, r => {
    if (r.reserveStatus !== ReserveRecordStatus.QUERYING_STATUS) {
      return;
    }

    // FIXME: check / compare history!
    if (!r.lastSuccessfulStatusQuery) {
      // FIXME: check if this matches initial expectations
      r.withdrawRemainingAmount = balance;
    } else {
      const expectedBalance = Amounts.sub(
        r.withdrawAllocatedAmount,
        r.withdrawCompletedAmount,
      );
      const cmp = Amounts.cmp(balance, expectedBalance.amount);
      if (cmp == 0) {
        // Nothing changed.
        return;
      }
      if (cmp > 0) {
        const extra = Amounts.sub(balance, expectedBalance.amount).amount;
        r.withdrawRemainingAmount = Amounts.add(
          r.withdrawRemainingAmount,
          extra,
        ).amount;
      } else {
        // We're missing some money.
      }
    }
    r.lastSuccessfulStatusQuery = getTimestampNow();
    r.reserveStatus = ReserveRecordStatus.WITHDRAWING;
    r.retryInfo = initRetryInfo();
    return r;
  });
  ws.notify( { type: NotificationType.ReserveUpdated });
}

async function processReserveImpl(
  ws: InternalWalletState,
  reservePub: string,
  forceNow: boolean = false,
): Promise<void> {
  const reserve = await ws.db.get(Stores.reserves, reservePub);
  if (!reserve) {
    console.log("not processing reserve: reserve does not exist");
    return;
  }
  if (!forceNow) {
    const now = getTimestampNow();
    if (reserve.retryInfo.nextRetry.t_ms > now.t_ms) {
      logger.trace("processReserve retry not due yet");
      return;
    }
  }
  logger.trace(
    `Processing reserve ${reservePub} with status ${reserve.reserveStatus}`,
  );
  switch (reserve.reserveStatus) {
    case ReserveRecordStatus.UNCONFIRMED:
      // nothing to do
      break;
    case ReserveRecordStatus.REGISTERING_BANK:
      await processReserveBankStatus(ws, reservePub);
      return await processReserveImpl(ws, reservePub, true);
    case ReserveRecordStatus.QUERYING_STATUS:
      await updateReserve(ws, reservePub);
      return await processReserveImpl(ws, reservePub, true);
    case ReserveRecordStatus.WITHDRAWING:
      await depleteReserve(ws, reservePub);
      break;
    case ReserveRecordStatus.DORMANT:
      // nothing to do
      break;
    case ReserveRecordStatus.WAIT_CONFIRM_BANK:
      await processReserveBankStatus(ws, reservePub);
      break;
    default:
      console.warn("unknown reserve record status:", reserve.reserveStatus);
      assertUnreachable(reserve.reserveStatus);
      break;
  }
}

export async function confirmReserve(
  ws: InternalWalletState,
  req: ConfirmReserveRequest,
): Promise<void> {
  const now = getTimestampNow();
  await ws.db.mutate(Stores.reserves, req.reservePub, reserve => {
    if (reserve.reserveStatus !== ReserveRecordStatus.UNCONFIRMED) {
      return;
    }
    reserve.timestampConfirmed = now;
    reserve.reserveStatus = ReserveRecordStatus.QUERYING_STATUS;
    reserve.retryInfo = initRetryInfo();
    return reserve;
  });

  ws.notify({ type: NotificationType.ReserveUpdated });

  processReserve(ws, req.reservePub, true).catch(e => {
    console.log("processing reserve failed:", e);
  });
}

/**
 * Withdraw coins from a reserve until it is empty.
 *
 * When finished, marks the reserve as depleted by setting
 * the depleted timestamp.
 */
async function depleteReserve(
  ws: InternalWalletState,
  reservePub: string,
): Promise<void> {
  const reserve = await ws.db.get(Stores.reserves, reservePub);
  if (!reserve) {
    return;
  }
  if (reserve.reserveStatus !== ReserveRecordStatus.WITHDRAWING) {
    return;
  }
  logger.trace(`depleting reserve ${reservePub}`);

  const withdrawAmount = reserve.withdrawRemainingAmount;

  logger.trace(`getting denom list`);

  const denomsForWithdraw = await getVerifiedWithdrawDenomList(
    ws,
    reserve.exchangeBaseUrl,
    withdrawAmount,
  );
  logger.trace(`got denom list`);
  if (denomsForWithdraw.length === 0) {
    const m = `Unable to withdraw from reserve, no denominations are available to withdraw.`;
    await incrementReserveRetry(ws, reserve.reservePub, {
      type: "internal",
      message: m,
      details: {},
    });
    console.log(m);
    throw new OperationFailedAndReportedError(m);
  }

  logger.trace("selected denominations");

  const withdrawalSessionId = encodeCrock(randomBytes(32));

  const totalCoinValue = Amounts.sum(denomsForWithdraw.map(x => x.value))
    .amount;

  const withdrawalRecord: WithdrawalSessionRecord = {
    withdrawSessionId: withdrawalSessionId,
    exchangeBaseUrl: reserve.exchangeBaseUrl,
    source: {
      type: "reserve",
      reservePub: reserve.reservePub,
    },
    rawWithdrawalAmount: withdrawAmount,
    startTimestamp: getTimestampNow(),
    denoms: denomsForWithdraw.map(x => x.denomPub),
    withdrawn: denomsForWithdraw.map(x => false),
    planchets: denomsForWithdraw.map(x => undefined),
    totalCoinValue,
    retryInfo: initRetryInfo(),
    lastCoinErrors: denomsForWithdraw.map(x => undefined),
    lastError: undefined,
  };

  const totalCoinWithdrawFee = Amounts.sum(
    denomsForWithdraw.map(x => x.feeWithdraw),
  ).amount;
  const totalWithdrawAmount = Amounts.add(totalCoinValue, totalCoinWithdrawFee)
    .amount;

  function mutateReserve(r: ReserveRecord): ReserveRecord {
    const remaining = Amounts.sub(
      r.withdrawRemainingAmount,
      totalWithdrawAmount,
    );
    if (remaining.saturated) {
      console.error("can't create planchets, saturated");
      throw TransactionAbort;
    }
    const allocated = Amounts.add(
      r.withdrawAllocatedAmount,
      totalWithdrawAmount,
    );
    if (allocated.saturated) {
      console.error("can't create planchets, saturated");
      throw TransactionAbort;
    }
    r.withdrawRemainingAmount = remaining.amount;
    r.withdrawAllocatedAmount = allocated.amount;
    r.reserveStatus = ReserveRecordStatus.DORMANT;
    r.retryInfo = initRetryInfo(false);
    return r;
  }

  const success = await ws.db.runWithWriteTransaction(
    [Stores.withdrawalSession, Stores.reserves],
    async tx => {
      const myReserve = await tx.get(Stores.reserves, reservePub);
      if (!myReserve) {
        return false;
      }
      if (myReserve.reserveStatus !== ReserveRecordStatus.WITHDRAWING) {
        return false;
      }
      await tx.mutate(Stores.reserves, reserve.reservePub, mutateReserve);
      await tx.put(Stores.withdrawalSession, withdrawalRecord);
      return true;
    },
  );

  if (success) {
    console.log("processing new withdraw session");
    ws.notify({
      type: NotificationType.WithdrawSessionCreated,
      withdrawSessionId: withdrawalSessionId,
    });
    await processWithdrawSession(ws, withdrawalSessionId);
  } else {
    console.trace("withdraw session already existed");
  }
}
