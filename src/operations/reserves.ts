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
  ConfirmReserveRequest,
  OperationError,
  AcceptWithdrawalResponse,
} from "../types/walletTypes";
import { canonicalizeBaseUrl } from "../util/helpers";
import { InternalWalletState } from "./state";
import {
  ReserveRecordStatus,
  ReserveRecord,
  CurrencyRecord,
  Stores,
  WithdrawalGroupRecord,
  initRetryInfo,
  updateRetryInfoTimeout,
  ReserveUpdatedEventRecord,
  WalletReserveHistoryItemType,
  DenominationRecord,
  PlanchetRecord,
  WithdrawalSourceType,
} from "../types/dbTypes";
import { Logger } from "../util/logging";
import { Amounts } from "../util/amounts";
import {
  updateExchangeFromUrl,
  getExchangeTrust,
  getExchangePaytoUri,
} from "./exchanges";
import {
  WithdrawOperationStatusResponse,
  codecForWithdrawOperationStatusResponse,
} from "../types/talerTypes";
import { assertUnreachable } from "../util/assertUnreachable";
import { encodeCrock, getRandomBytes } from "../crypto/talerCrypto";
import { randomBytes } from "../crypto/primitives/nacl-fast";
import {
  getVerifiedWithdrawDenomList,
  processWithdrawGroup,
  getBankWithdrawalInfo,
} from "./withdraw";
import {
  guardOperationException,
  OperationFailedAndReportedError,
  OperationFailedError,
} from "./errors";
import { NotificationType } from "../types/notifications";
import { codecForReserveStatus } from "../types/ReserveStatus";
import { getTimestampNow } from "../util/time";
import {
  reconcileReserveHistory,
  summarizeReserveHistory,
} from "../util/reserveHistoryUtil";

const logger = new Logger("reserves.ts");

async function resetReserveRetry(ws: InternalWalletState, reservePub: string) {
  await ws.db.mutate(Stores.reserves, reservePub, (x) => {
    if (x.retryInfo.active) {
      x.retryInfo = initRetryInfo();
    }
    return x;
  });
}

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
    timestampCreated: now,
    exchangeBaseUrl: canonExchange,
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
    reserveTransactions: [],
    currency: req.amount.currency,
  };

  reserveRecord.reserveTransactions.push({
    type: WalletReserveHistoryItemType.Credit,
    expectedAmount: req.amount,
  });

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
    async (tx) => {
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
  processReserve(ws, resp.reservePub, true).catch((e) => {
    console.error("Processing reserve (after createReserve) failed:", e);
  });

  return resp;
}

/**
 * Re-query the status of a reserve.
 */
export async function forceQueryReserve(
  ws: InternalWalletState,
  reservePub: string,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.reserves], async (tx) => {
    const reserve = await tx.get(Stores.reserves, reservePub);
    if (!reserve) {
      return;
    }
    // Only force status query where it makes sense
    switch (reserve.reserveStatus) {
      case ReserveRecordStatus.DORMANT:
      case ReserveRecordStatus.WITHDRAWING:
      case ReserveRecordStatus.QUERYING_STATUS:
        break;
      default:
        return;
    }
    reserve.reserveStatus = ReserveRecordStatus.QUERYING_STATUS;
    reserve.retryInfo = initRetryInfo();
    await tx.put(Stores.reserves, reserve);
  });
  await processReserve(ws, reservePub, true);
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
  await ws.db.mutate(Stores.reserves, reservePub, (r) => {
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
  ws.notify({ type: NotificationType.Wildcard });
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
      throw Error(
        `unexpected status ${statusResp.status} for bank status query`,
      );
    }
    status = codecForWithdrawOperationStatusResponse().decode(
      await statusResp.json(),
    );
  } catch (e) {
    throw e;
  }

  ws.notify({ type: NotificationType.Wildcard });

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
    await ws.db.mutate(Stores.reserves, reservePub, (r) => {
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
    await ws.db.mutate(Stores.reserves, reservePub, (r) => {
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
  ws.notify({ type: NotificationType.Wildcard });
}

async function incrementReserveRetry(
  ws: InternalWalletState,
  reservePub: string,
  err: OperationError | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.reserves], async (tx) => {
    const r = await tx.get(Stores.reserves, reservePub);
    if (!r) {
      return;
    }
    if (!r.retryInfo) {
      return;
    }
    console.log("updating retry info");
    console.log("before", r.retryInfo);
    r.retryInfo.retryCounter++;
    updateRetryInfoTimeout(r.retryInfo);
    console.log("after", r.retryInfo);
    r.lastError = err;
    await tx.put(Stores.reserves, r);
  });
  if (err) {
    ws.notify({
      type: NotificationType.ReserveOperationError,
      operationError: err,
    });
  }
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

  const reqUrl = new URL(`reserves/${reservePub}`, reserve.exchangeBaseUrl);
  let resp;
  try {
    resp = await ws.http.get(reqUrl.href);
    console.log("got reserves/${RESERVE_PUB} response", await resp.json());
    if (resp.status === 404) {
      const m = "reserve not known to the exchange yet";
      throw new OperationFailedError({
        type: "waiting",
        message: m,
        details: {},
      });
    }
    if (resp.status !== 200) {
      throw Error(`unexpected status code ${resp.status} for reserve/status`);
    }
  } catch (e) {
    logger.trace("caught exception for reserve/status");
    const m = e.message;
    const opErr = {
      type: "network",
      details: {},
      message: m,
    };
    await incrementReserveRetry(ws, reservePub, opErr);
    throw new OperationFailedAndReportedError(opErr);
  }
  const respJson = await resp.json();
  const reserveInfo = codecForReserveStatus().decode(respJson);
  const balance = Amounts.parseOrThrow(reserveInfo.balance);
  const currency = balance.currency;
  await ws.db.runWithWriteTransaction(
    [Stores.reserves, Stores.reserveUpdatedEvents],
    async (tx) => {
      const r = await tx.get(Stores.reserves, reservePub);
      if (!r) {
        return;
      }
      if (r.reserveStatus !== ReserveRecordStatus.QUERYING_STATUS) {
        return;
      }

      const newHistoryTransactions = reserveInfo.history.slice(
        r.reserveTransactions.length,
      );

      const reserveUpdateId = encodeCrock(getRandomBytes(32));

      const reconciled = reconcileReserveHistory(
        r.reserveTransactions,
        reserveInfo.history,
      );

      console.log("reconciled history:", JSON.stringify(reconciled, undefined, 2));

      const summary = summarizeReserveHistory(
        reconciled.updatedLocalHistory,
        currency,
      );
      console.log("summary", summary);

      if (
        reconciled.newAddedItems.length + reconciled.newMatchedItems.length !=
        0
      ) {
        const reserveUpdate: ReserveUpdatedEventRecord = {
          reservePub: r.reservePub,
          timestamp: getTimestampNow(),
          amountReserveBalance: Amounts.stringify(balance),
          amountExpected: Amounts.stringify(summary.awaitedReserveAmount),
          newHistoryTransactions,
          reserveUpdateId,
        };
        await tx.put(Stores.reserveUpdatedEvents, reserveUpdate);
        r.reserveStatus = ReserveRecordStatus.WITHDRAWING;
        r.retryInfo = initRetryInfo();
      } else {
        r.reserveStatus = ReserveRecordStatus.DORMANT;
        r.retryInfo = initRetryInfo(false);
      }
      r.lastSuccessfulStatusQuery = getTimestampNow();
      r.reserveTransactions = reconciled.updatedLocalHistory;
      r.lastError = undefined;
      await tx.put(Stores.reserves, r);
    },
  );
  ws.notify({ type: NotificationType.ReserveUpdated });
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
  } else {
    await resetReserveRetry(ws, reservePub);
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
  await ws.db.mutate(Stores.reserves, req.reservePub, (reserve) => {
    if (reserve.reserveStatus !== ReserveRecordStatus.UNCONFIRMED) {
      return;
    }
    reserve.timestampConfirmed = now;
    reserve.reserveStatus = ReserveRecordStatus.QUERYING_STATUS;
    reserve.retryInfo = initRetryInfo();
    return reserve;
  });

  ws.notify({ type: NotificationType.ReserveUpdated });

  processReserve(ws, req.reservePub, true).catch((e) => {
    console.log("processing reserve (after confirmReserve) failed:", e);
  });
}

async function makePlanchet(
  ws: InternalWalletState,
  reserve: ReserveRecord,
  denom: DenominationRecord,
): Promise<PlanchetRecord> {
  const r = await ws.cryptoApi.createPlanchet({
    denomPub: denom.denomPub,
    feeWithdraw: denom.feeWithdraw,
    reservePriv: reserve.reservePriv,
    reservePub: reserve.reservePub,
    value: denom.value,
  });
  return {
    blindingKey: r.blindingKey,
    coinEv: r.coinEv,
    coinPriv: r.coinPriv,
    coinPub: r.coinPub,
    coinValue: r.coinValue,
    denomPub: r.denomPub,
    denomPubHash: r.denomPubHash,
    isFromTip: false,
    reservePub: r.reservePub,
    withdrawSig: r.withdrawSig,
    coinEvHash: r.coinEvHash,
  };
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

  const summary = summarizeReserveHistory(
    reserve.reserveTransactions,
    reserve.currency,
  );

  const withdrawAmount = summary.unclaimedReserveAmount;

  logger.trace(`getting denom list`);

  const denomsForWithdraw = await getVerifiedWithdrawDenomList(
    ws,
    reserve.exchangeBaseUrl,
    withdrawAmount,
  );
  logger.trace(`got denom list`);
  if (denomsForWithdraw.length === 0) {
    // Only complain about inability to withdraw if we
    // didn't withdraw before.
    if (Amounts.isZero(summary.withdrawnAmount)) {
      const m = `Unable to withdraw from reserve, no denominations are available to withdraw.`;
      const opErr = {
        type: "internal",
        message: m,
        details: {},
      };
      await incrementReserveRetry(ws, reserve.reservePub, opErr);
      console.log(m);
      throw new OperationFailedAndReportedError(opErr);
    }
    return;
  }

  logger.trace("selected denominations");

  const withdrawalGroupId = encodeCrock(randomBytes(32));

  const totalCoinValue = Amounts.sum(denomsForWithdraw.map((x) => x.value))
    .amount;

  const planchets: PlanchetRecord[] = [];
  for (const d of denomsForWithdraw) {
    const p = await makePlanchet(ws, reserve, d);
    planchets.push(p);
  }

  const withdrawalRecord: WithdrawalGroupRecord = {
    withdrawalGroupId: withdrawalGroupId,
    exchangeBaseUrl: reserve.exchangeBaseUrl,
    source: {
      type: WithdrawalSourceType.Reserve,
      reservePub: reserve.reservePub,
    },
    rawWithdrawalAmount: withdrawAmount,
    timestampStart: getTimestampNow(),
    denoms: denomsForWithdraw.map((x) => x.denomPub),
    withdrawn: denomsForWithdraw.map((x) => false),
    planchets,
    totalCoinValue,
    retryInfo: initRetryInfo(),
    lastErrorPerCoin: {},
    lastError: undefined,
  };

  const totalCoinWithdrawFee = Amounts.sum(
    denomsForWithdraw.map((x) => x.feeWithdraw),
  ).amount;
  const totalWithdrawAmount = Amounts.add(totalCoinValue, totalCoinWithdrawFee)
    .amount;

  const success = await ws.db.runWithWriteTransaction(
    [Stores.withdrawalGroups, Stores.reserves],
    async (tx) => {
      const newReserve = await tx.get(Stores.reserves, reservePub);
      if (!newReserve) {
        return false;
      }
      if (newReserve.reserveStatus !== ReserveRecordStatus.WITHDRAWING) {
        return false;
      }
      const newSummary = summarizeReserveHistory(
        newReserve.reserveTransactions,
        newReserve.currency,
      );
      if (
        Amounts.cmp(newSummary.unclaimedReserveAmount, totalWithdrawAmount) < 0
      ) {
        // Something must have happened concurrently!
        logger.error(
          "aborting withdrawal session, likely concurrent withdrawal happened",
        );
        return false;
      }
      for (let i = 0; i < planchets.length; i++) {
        const amt = Amounts.add(
          denomsForWithdraw[i].value,
          denomsForWithdraw[i].feeWithdraw,
        ).amount;
        newReserve.reserveTransactions.push({
          type: WalletReserveHistoryItemType.Withdraw,
          expectedAmount: amt,
        });
      }
      newReserve.reserveStatus = ReserveRecordStatus.DORMANT;
      newReserve.retryInfo = initRetryInfo(false);
      await tx.put(Stores.reserves, newReserve);
      await tx.put(Stores.withdrawalGroups, withdrawalRecord);
      return true;
    },
  );

  if (success) {
    console.log("processing new withdraw group");
    ws.notify({
      type: NotificationType.WithdrawGroupCreated,
      withdrawalGroupId: withdrawalGroupId,
    });
    await processWithdrawGroup(ws, withdrawalGroupId);
  } else {
    console.trace("withdraw session already existed");
  }
}

export async function createTalerWithdrawReserve(
  ws: InternalWalletState,
  talerWithdrawUri: string,
  selectedExchange: string,
): Promise<AcceptWithdrawalResponse> {
  const withdrawInfo = await getBankWithdrawalInfo(ws, talerWithdrawUri);
  const exchangeWire = await getExchangePaytoUri(
    ws,
    selectedExchange,
    withdrawInfo.wireTypes,
  );
  const reserve = await createReserve(ws, {
    amount: withdrawInfo.amount,
    bankWithdrawStatusUrl: withdrawInfo.extractedStatusUrl,
    exchange: selectedExchange,
    senderWire: withdrawInfo.senderWire,
    exchangeWire: exchangeWire,
  });
  // We do this here, as the reserve should be registered before we return,
  // so that we can redirect the user to the bank's status page.
  await processReserveBankStatus(ws, reserve.reservePub);
  console.log("acceptWithdrawal: returning");
  return {
    reservePub: reserve.reservePub,
    confirmTransferUrl: withdrawInfo.confirmTransferUrl,
  };
}
