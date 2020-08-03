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
  OperationErrorDetails,
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
  WithdrawalSourceType,
  ReserveHistoryRecord,
  ReserveBankInfo,
} from "../types/dbTypes";
import { Logger } from "../util/logging";
import { Amounts } from "../util/amounts";
import {
  updateExchangeFromUrl,
  getExchangeTrust,
  getExchangePaytoUri,
} from "./exchanges";
import {
  codecForWithdrawOperationStatusResponse,
  codecForBankWithdrawalOperationPostResponse,
} from "../types/talerTypes";
import { assertUnreachable } from "../util/assertUnreachable";
import { encodeCrock, getRandomBytes } from "../crypto/talerCrypto";
import { randomBytes } from "../crypto/primitives/nacl-fast";
import {
  selectWithdrawalDenoms,
  processWithdrawGroup,
  getBankWithdrawalInfo,
  denomSelectionInfoToState,
} from "./withdraw";
import {
  guardOperationException,
  OperationFailedAndReportedError,
  makeErrorDetails,
} from "./errors";
import { NotificationType } from "../types/notifications";
import { codecForReserveStatus } from "../types/ReserveStatus";
import { getTimestampNow } from "../util/time";
import {
  reconcileReserveHistory,
  summarizeReserveHistory,
} from "../util/reserveHistoryUtil";
import { TransactionHandle } from "../util/query";
import { addPaytoQueryParams } from "../util/payto";
import { TalerErrorCode } from "../TalerErrorCode";
import {
  readSuccessResponseJsonOrErrorCode,
  throwUnexpectedRequestError,
  readSuccessResponseJsonOrThrow,
} from "../util/http";
import { codecForAny } from "../util/codec";
import { URL } from "../util/url";

const logger = new Logger("reserves.ts");

async function resetReserveRetry(
  ws: InternalWalletState,
  reservePub: string,
): Promise<void> {
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
    reserveStatus = ReserveRecordStatus.QUERYING_STATUS;
  }

  let bankInfo: ReserveBankInfo | undefined;

  if (req.bankWithdrawStatusUrl) {
    if (!req.exchangePaytoUri) {
      throw Error(
        "Exchange payto URI must be specified for a bank-integrated withdrawal",
      );
    }
    bankInfo = {
      statusUrl: req.bankWithdrawStatusUrl,
      exchangePaytoUri: req.exchangePaytoUri,
    };
  }

  const initialWithdrawalGroupId = encodeCrock(getRandomBytes(32));

  const denomSelInfo = await selectWithdrawalDenoms(
    ws,
    canonExchange,
    req.amount,
  );
  const initialDenomSel = denomSelectionInfoToState(denomSelInfo);

  const reserveRecord: ReserveRecord = {
    instructedAmount: req.amount,
    initialWithdrawalGroupId,
    initialDenomSel,
    initialWithdrawalStarted: false,
    timestampCreated: now,
    exchangeBaseUrl: canonExchange,
    reservePriv: keypair.priv,
    reservePub: keypair.pub,
    senderWire: req.senderWire,
    timestampBankConfirmed: undefined,
    timestampReserveInfoPosted: undefined,
    bankInfo,
    reserveStatus,
    lastSuccessfulStatusQuery: undefined,
    retryInfo: initRetryInfo(),
    lastError: undefined,
    currency: req.amount.currency,
  };

  const reserveHistoryRecord: ReserveHistoryRecord = {
    reservePub: keypair.pub,
    reserveTransactions: [],
  };

  reserveHistoryRecord.reserveTransactions.push({
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
    [
      Stores.currencies,
      Stores.reserves,
      Stores.reserveHistory,
      Stores.bankWithdrawUris,
    ],
    async (tx) => {
      // Check if we have already created a reserve for that bankWithdrawStatusUrl
      if (reserveRecord.bankInfo?.statusUrl) {
        const bwi = await tx.get(
          Stores.bankWithdrawUris,
          reserveRecord.bankInfo.statusUrl,
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
          talerWithdrawUri: reserveRecord.bankInfo.statusUrl,
        });
      }
      await tx.put(Stores.currencies, cr);
      await tx.put(Stores.reserves, reserveRecord);
      await tx.put(Stores.reserveHistory, reserveHistoryRecord);
      const r: CreateReserveResponse = {
        exchange: canonExchange,
        reservePub: keypair.pub,
      };
      return r;
    },
  );

  if (reserveRecord.reservePub === resp.reservePub) {
    // Only emit notification when a new reserve was created.
    ws.notify({
      type: NotificationType.ReserveCreated,
      reservePub: reserveRecord.reservePub,
    });
  }

  // Asynchronously process the reserve, but return
  // to the caller already.
  processReserve(ws, resp.reservePub, true).catch((e) => {
    logger.error("Processing reserve (after createReserve) failed:", e);
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
  forceNow = false,
): Promise<void> {
  return ws.memoProcessReserve.memo(reservePub, async () => {
    const onOpError = (err: OperationErrorDetails): Promise<void> =>
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
  const reserve = await ws.db.get(Stores.reserves, reservePub);
  switch (reserve?.reserveStatus) {
    case ReserveRecordStatus.WAIT_CONFIRM_BANK:
    case ReserveRecordStatus.REGISTERING_BANK:
      break;
    default:
      return;
  }
  const bankInfo = reserve.bankInfo;
  if (!bankInfo) {
    return;
  }
  const bankStatusUrl = bankInfo.statusUrl;
  const httpResp = await ws.http.postJson(bankStatusUrl, {
    reserve_pub: reservePub,
    selected_exchange: bankInfo.exchangePaytoUri,
  });
  await readSuccessResponseJsonOrThrow(
    httpResp,
    codecForBankWithdrawalOperationPostResponse(),
  );
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
    if (!r.bankInfo) {
      throw Error("invariant failed");
    }
    r.retryInfo = initRetryInfo();
    return r;
  });
  ws.notify({ type: NotificationType.ReserveRegisteredWithBank });
  return processReserveBankStatus(ws, reservePub);
}

export async function processReserveBankStatus(
  ws: InternalWalletState,
  reservePub: string,
): Promise<void> {
  const onOpError = (err: OperationErrorDetails): Promise<void> =>
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
  const reserve = await ws.db.get(Stores.reserves, reservePub);
  switch (reserve?.reserveStatus) {
    case ReserveRecordStatus.WAIT_CONFIRM_BANK:
    case ReserveRecordStatus.REGISTERING_BANK:
      break;
    default:
      return;
  }
  const bankStatusUrl = reserve.bankInfo?.statusUrl;
  if (!bankStatusUrl) {
    return;
  }

  const statusResp = await ws.http.get(bankStatusUrl);
  const status = await readSuccessResponseJsonOrThrow(
    statusResp,
    codecForWithdrawOperationStatusResponse(),
  );

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
      r.timestampBankConfirmed = now;
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
      if (r.bankInfo) {
        r.bankInfo.confirmUrl = status.confirm_transfer_url;
      }
      return r;
    });
    await incrementReserveRetry(ws, reservePub, undefined);
  }
}

async function incrementReserveRetry(
  ws: InternalWalletState,
  reservePub: string,
  err: OperationErrorDetails | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.reserves], async (tx) => {
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
  if (err) {
    ws.notify({
      type: NotificationType.ReserveOperationError,
      error: err,
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
): Promise<{ ready: boolean }> {
  const reserve = await ws.db.get(Stores.reserves, reservePub);
  if (!reserve) {
    throw Error("reserve not in db");
  }

  if (reserve.reserveStatus !== ReserveRecordStatus.QUERYING_STATUS) {
    return { ready: true };
  }

  const resp = await ws.http.get(
    new URL(`reserves/${reservePub}`, reserve.exchangeBaseUrl).href,
  );

  const result = await readSuccessResponseJsonOrErrorCode(
    resp,
    codecForReserveStatus(),
  );
  if (result.isError) {
    if (
      resp.status === 404 &&
      result.talerErrorResponse.code === TalerErrorCode.RESERVE_STATUS_UNKNOWN
    ) {
      ws.notify({
        type: NotificationType.ReserveNotYetFound,
        reservePub,
      });
      await incrementReserveRetry(ws, reservePub, undefined);
      return { ready: false };
    } else {
      throwUnexpectedRequestError(resp, result.talerErrorResponse);
    }
  }

  const reserveInfo = result.response;

  const balance = Amounts.parseOrThrow(reserveInfo.balance);
  const currency = balance.currency;
  await ws.db.runWithWriteTransaction(
    [Stores.reserves, Stores.reserveUpdatedEvents, Stores.reserveHistory],
    async (tx) => {
      const r = await tx.get(Stores.reserves, reservePub);
      if (!r) {
        return;
      }
      if (r.reserveStatus !== ReserveRecordStatus.QUERYING_STATUS) {
        return;
      }

      const hist = await tx.get(Stores.reserveHistory, reservePub);
      if (!hist) {
        throw Error("inconsistent database");
      }

      const newHistoryTransactions = reserveInfo.history.slice(
        hist.reserveTransactions.length,
      );

      const reserveUpdateId = encodeCrock(getRandomBytes(32));

      const reconciled = reconcileReserveHistory(
        hist.reserveTransactions,
        reserveInfo.history,
      );

      const summary = summarizeReserveHistory(
        reconciled.updatedLocalHistory,
        currency,
      );

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
      hist.reserveTransactions = reconciled.updatedLocalHistory;
      r.lastError = undefined;
      await tx.put(Stores.reserves, r);
      await tx.put(Stores.reserveHistory, hist);
    },
  );
  ws.notify({ type: NotificationType.ReserveUpdated });
  return { ready: true };
}

async function processReserveImpl(
  ws: InternalWalletState,
  reservePub: string,
  forceNow = false,
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
    case ReserveRecordStatus.REGISTERING_BANK:
      await processReserveBankStatus(ws, reservePub);
      return await processReserveImpl(ws, reservePub, true);
    case ReserveRecordStatus.QUERYING_STATUS: {
      const res = await updateReserve(ws, reservePub);
      if (res.ready) {
        return await processReserveImpl(ws, reservePub, true);
      } else {
        break;
      }
    }
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
  let reserve: ReserveRecord | undefined;
  let hist: ReserveHistoryRecord | undefined;
  await ws.db.runWithReadTransaction(
    [Stores.reserves, Stores.reserveHistory],
    async (tx) => {
      reserve = await tx.get(Stores.reserves, reservePub);
      hist = await tx.get(Stores.reserveHistory, reservePub);
    },
  );

  if (!reserve) {
    return;
  }
  if (!hist) {
    throw Error("inconsistent database");
  }
  if (reserve.reserveStatus !== ReserveRecordStatus.WITHDRAWING) {
    return;
  }
  logger.trace(`depleting reserve ${reservePub}`);

  const summary = summarizeReserveHistory(
    hist.reserveTransactions,
    reserve.currency,
  );

  const withdrawAmount = summary.unclaimedReserveAmount;

  const denomsForWithdraw = await selectWithdrawalDenoms(
    ws,
    reserve.exchangeBaseUrl,
    withdrawAmount,
  );
  if (!denomsForWithdraw) {
    // Only complain about inability to withdraw if we
    // didn't withdraw before.
    if (Amounts.isZero(summary.withdrawnAmount)) {
      const opErr = makeErrorDetails(
        TalerErrorCode.WALLET_EXCHANGE_DENOMINATIONS_INSUFFICIENT,
        `Unable to withdraw from reserve, no denominations are available to withdraw.`,
        {},
      );
      await incrementReserveRetry(ws, reserve.reservePub, opErr);
      throw new OperationFailedAndReportedError(opErr);
    }
    return;
  }

  logger.trace(
    `Selected coins total cost ${Amounts.stringify(
      denomsForWithdraw.totalWithdrawCost,
    )} for withdrawal of ${Amounts.stringify(withdrawAmount)}`,
  );

  logger.trace("selected denominations");

  const newWithdrawalGroup = await ws.db.runWithWriteTransaction(
    [
      Stores.withdrawalGroups,
      Stores.reserves,
      Stores.reserveHistory,
      Stores.planchets,
    ],
    async (tx) => {
      const newReserve = await tx.get(Stores.reserves, reservePub);
      if (!newReserve) {
        return false;
      }
      if (newReserve.reserveStatus !== ReserveRecordStatus.WITHDRAWING) {
        return false;
      }
      const newHist = await tx.get(Stores.reserveHistory, reservePub);
      if (!newHist) {
        throw Error("inconsistent database");
      }
      const newSummary = summarizeReserveHistory(
        newHist.reserveTransactions,
        newReserve.currency,
      );
      if (
        Amounts.cmp(
          newSummary.unclaimedReserveAmount,
          denomsForWithdraw.totalWithdrawCost,
        ) < 0
      ) {
        // Something must have happened concurrently!
        logger.error(
          "aborting withdrawal session, likely concurrent withdrawal happened",
        );
        logger.error(
          `unclaimed reserve amount is ${newSummary.unclaimedReserveAmount}`,
        );
        logger.error(
          `withdrawal cost is ${denomsForWithdraw.totalWithdrawCost}`,
        );
        return false;
      }
      for (let i = 0; i < denomsForWithdraw.selectedDenoms.length; i++) {
        const sd = denomsForWithdraw.selectedDenoms[i];
        for (let j = 0; j < sd.count; j++) {
          const amt = Amounts.add(sd.denom.value, sd.denom.feeWithdraw).amount;
          newHist.reserveTransactions.push({
            type: WalletReserveHistoryItemType.Withdraw,
            expectedAmount: amt,
          });
        }
      }
      newReserve.reserveStatus = ReserveRecordStatus.DORMANT;
      newReserve.retryInfo = initRetryInfo(false);

      let withdrawalGroupId: string;

      if (!newReserve.initialWithdrawalStarted) {
        withdrawalGroupId = newReserve.initialWithdrawalGroupId;
        newReserve.initialWithdrawalStarted = true;
      } else {
        withdrawalGroupId = encodeCrock(randomBytes(32));
      }

      const withdrawalRecord: WithdrawalGroupRecord = {
        withdrawalGroupId: withdrawalGroupId,
        exchangeBaseUrl: newReserve.exchangeBaseUrl,
        source: {
          type: WithdrawalSourceType.Reserve,
          reservePub: newReserve.reservePub,
        },
        rawWithdrawalAmount: withdrawAmount,
        timestampStart: getTimestampNow(),
        retryInfo: initRetryInfo(),
        lastErrorPerCoin: {},
        lastError: undefined,
        denomsSel: denomSelectionInfoToState(denomsForWithdraw),
      };

      await tx.put(Stores.reserves, newReserve);
      await tx.put(Stores.reserveHistory, newHist);
      await tx.put(Stores.withdrawalGroups, withdrawalRecord);
      return withdrawalRecord;
    },
  );

  if (newWithdrawalGroup) {
    logger.trace("processing new withdraw group");
    ws.notify({
      type: NotificationType.WithdrawGroupCreated,
      withdrawalGroupId: newWithdrawalGroup.withdrawalGroupId,
    });
    await processWithdrawGroup(ws, newWithdrawalGroup.withdrawalGroupId);
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
    exchangePaytoUri: exchangeWire,
  });
  // We do this here, as the reserve should be registered before we return,
  // so that we can redirect the user to the bank's status page.
  await processReserveBankStatus(ws, reserve.reservePub);
  return {
    reservePub: reserve.reservePub,
    confirmTransferUrl: withdrawInfo.confirmTransferUrl,
  };
}

/**
 * Get payto URIs needed to fund a reserve.
 */
export async function getFundingPaytoUris(
  tx: TransactionHandle,
  reservePub: string,
): Promise<string[]> {
  const r = await tx.get(Stores.reserves, reservePub);
  if (!r) {
    logger.error(`reserve ${reservePub} not found (DB corrupted?)`);
    return [];
  }
  const exchange = await tx.get(Stores.exchanges, r.exchangeBaseUrl);
  if (!exchange) {
    logger.error(`exchange ${r.exchangeBaseUrl} not found (DB corrupted?)`);
    return [];
  }
  const plainPaytoUris =
    exchange.wireInfo?.accounts.map((x) => x.payto_uri) ?? [];
  if (!plainPaytoUris) {
    logger.error(`exchange ${r.exchangeBaseUrl} has no wire info`);
    return [];
  }
  return plainPaytoUris.map((x) =>
    addPaytoQueryParams(x, {
      amount: Amounts.stringify(r.instructedAmount),
      message: `Taler Withdrawal ${r.reservePub}`,
    }),
  );
}
