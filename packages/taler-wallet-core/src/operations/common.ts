/*
 This file is part of GNU Taler
 (C) 2022 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Imports.
 */
import {
  AmountJson,
  Amounts,
  CoinRefreshRequest,
  CoinStatus,
  ExchangeEntryStatus,
  ExchangeListItem,
  ExchangeTosStatus,
  j2s,
  Logger,
  RefreshReason,
  TalerErrorCode,
  TalerErrorDetail,
  TombstoneIdStr,
  TransactionIdStr,
  TransactionType,
} from "@gnu-taler/taler-util";
import {
  WalletStoresV1,
  CoinRecord,
  ExchangeDetailsRecord,
  ExchangeRecord,
} from "../db.js";
import { makeErrorDetail, TalerError } from "../errors.js";
import { InternalWalletState } from "../internal-wallet-state.js";
import { checkDbInvariant, checkLogicInvariant } from "../util/invariants.js";
import { GetReadWriteAccess } from "../util/query.js";
import {
  OperationAttemptResult,
  OperationAttemptResultType,
  RetryInfo,
} from "../util/retries.js";

const logger = new Logger("operations/common.ts");

export interface CoinsSpendInfo {
  coinPubs: string[];
  contributions: AmountJson[];
  refreshReason: RefreshReason;
  /**
   * Identifier for what the coin has been spent for.
   */
  allocationId: TransactionIdStr;
}

export async function makeCoinAvailable(
  ws: InternalWalletState,
  tx: GetReadWriteAccess<{
    coins: typeof WalletStoresV1.coins;
    coinAvailability: typeof WalletStoresV1.coinAvailability;
    denominations: typeof WalletStoresV1.denominations;
  }>,
  coinRecord: CoinRecord,
): Promise<void> {
  checkLogicInvariant(coinRecord.status === CoinStatus.Fresh);
  const existingCoin = await tx.coins.get(coinRecord.coinPub);
  if (existingCoin) {
    return;
  }
  const denom = await tx.denominations.get([
    coinRecord.exchangeBaseUrl,
    coinRecord.denomPubHash,
  ]);
  checkDbInvariant(!!denom);
  const ageRestriction = coinRecord.maxAge;
  let car = await tx.coinAvailability.get([
    coinRecord.exchangeBaseUrl,
    coinRecord.denomPubHash,
    ageRestriction,
  ]);
  if (!car) {
    car = {
      maxAge: ageRestriction,
      amountFrac: denom.amountFrac,
      amountVal: denom.amountVal,
      currency: denom.currency,
      denomPubHash: denom.denomPubHash,
      exchangeBaseUrl: denom.exchangeBaseUrl,
      freshCoinCount: 0,
    };
  }
  car.freshCoinCount++;
  await tx.coins.put(coinRecord);
  await tx.coinAvailability.put(car);
}

export async function spendCoins(
  ws: InternalWalletState,
  tx: GetReadWriteAccess<{
    coins: typeof WalletStoresV1.coins;
    coinAvailability: typeof WalletStoresV1.coinAvailability;
    refreshGroups: typeof WalletStoresV1.refreshGroups;
    denominations: typeof WalletStoresV1.denominations;
  }>,
  csi: CoinsSpendInfo,
): Promise<void> {
  let refreshCoinPubs: CoinRefreshRequest[] = [];
  for (let i = 0; i < csi.coinPubs.length; i++) {
    const coin = await tx.coins.get(csi.coinPubs[i]);
    if (!coin) {
      throw Error("coin allocated for payment doesn't exist anymore");
    }
    const denom = await ws.getDenomInfo(
      ws,
      tx,
      coin.exchangeBaseUrl,
      coin.denomPubHash,
    );
    checkDbInvariant(!!denom);
    const coinAvailability = await tx.coinAvailability.get([
      coin.exchangeBaseUrl,
      coin.denomPubHash,
      coin.maxAge,
    ]);
    checkDbInvariant(!!coinAvailability);
    const contrib = csi.contributions[i];
    if (coin.status !== CoinStatus.Fresh) {
      const alloc = coin.spendAllocation;
      if (!alloc) {
        continue;
      }
      if (alloc.id !== csi.allocationId) {
        // FIXME: assign error code
        throw Error("conflicting coin allocation (id)");
      }
      if (0 !== Amounts.cmp(alloc.amount, contrib)) {
        // FIXME: assign error code
        throw Error("conflicting coin allocation (contrib)");
      }
      continue;
    }
    coin.status = CoinStatus.Dormant;
    coin.spendAllocation = {
      id: csi.allocationId,
      amount: Amounts.stringify(contrib),
    };
    const remaining = Amounts.sub(denom.value, contrib);
    if (remaining.saturated) {
      throw Error("not enough remaining balance on coin for payment");
    }
    refreshCoinPubs.push({
      amount: remaining.amount,
      coinPub: coin.coinPub,
    });
    checkDbInvariant(!!coinAvailability);
    if (coinAvailability.freshCoinCount === 0) {
      throw Error(
        `invalid coin count ${coinAvailability.freshCoinCount} in DB`,
      );
    }
    coinAvailability.freshCoinCount--;
    await tx.coins.put(coin);
    await tx.coinAvailability.put(coinAvailability);
  }
  await ws.refreshOps.createRefreshGroup(
    ws,
    tx,
    refreshCoinPubs,
    RefreshReason.PayMerchant,
  );
}

export async function storeOperationError(
  ws: InternalWalletState,
  pendingTaskId: string,
  e: TalerErrorDetail,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.operationRetries])
    .runReadWrite(async (tx) => {
      let retryRecord = await tx.operationRetries.get(pendingTaskId);
      if (!retryRecord) {
        retryRecord = {
          id: pendingTaskId,
          lastError: e,
          retryInfo: RetryInfo.reset(),
        };
      } else {
        retryRecord.lastError = e;
        retryRecord.retryInfo = RetryInfo.increment(retryRecord.retryInfo);
      }
      await tx.operationRetries.put(retryRecord);
    });
}

export async function storeOperationPending(
  ws: InternalWalletState,
  pendingTaskId: string,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.operationRetries])
    .runReadWrite(async (tx) => {
      let retryRecord = await tx.operationRetries.get(pendingTaskId);
      if (!retryRecord) {
        retryRecord = {
          id: pendingTaskId,
          retryInfo: RetryInfo.reset(),
        };
      } else {
        delete retryRecord.lastError;
        retryRecord.retryInfo = RetryInfo.increment(retryRecord.retryInfo);
      }
      await tx.operationRetries.put(retryRecord);
    });
}

export async function runOperationWithErrorReporting(
  ws: InternalWalletState,
  opId: string,
  f: () => Promise<OperationAttemptResult>,
): Promise<void> {
  let maybeError: TalerErrorDetail | undefined;
  try {
    const resp = await f();
    switch (resp.type) {
      case OperationAttemptResultType.Error:
        return await storeOperationError(ws, opId, resp.errorDetail);
      case OperationAttemptResultType.Finished:
        return await storeOperationFinished(ws, opId);
      case OperationAttemptResultType.Pending:
        return await storeOperationPending(ws, opId);
      case OperationAttemptResultType.Longpoll:
        break;
    }
  } catch (e) {
    if (e instanceof TalerError) {
      logger.warn("operation processed resulted in error");
      logger.warn(`error was: ${j2s(e.errorDetail)}`);
      maybeError = e.errorDetail;
      return await storeOperationError(ws, opId, maybeError!);
    } else if (e instanceof Error) {
      // This is a bug, as we expect pending operations to always
      // do their own error handling and only throw WALLET_PENDING_OPERATION_FAILED
      // or return something.
      logger.error(`Uncaught exception: ${e.message}`);
      logger.error(`Stack: ${e.stack}`);
      maybeError = makeErrorDetail(
        TalerErrorCode.WALLET_UNEXPECTED_EXCEPTION,
        {
          stack: e.stack,
        },
        `unexpected exception (message: ${e.message})`,
      );
      return await storeOperationError(ws, opId, maybeError);
    } else {
      logger.error("Uncaught exception, value is not even an error.");
      maybeError = makeErrorDetail(
        TalerErrorCode.WALLET_UNEXPECTED_EXCEPTION,
        {},
        `unexpected exception (not even an error)`,
      );
      return await storeOperationError(ws, opId, maybeError);
    }
  }
}

export async function storeOperationFinished(
  ws: InternalWalletState,
  pendingTaskId: string,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.operationRetries])
    .runReadWrite(async (tx) => {
      await tx.operationRetries.delete(pendingTaskId);
    });
}

export enum TombstoneTag {
  DeleteWithdrawalGroup = "delete-withdrawal-group",
  DeleteReserve = "delete-reserve",
  DeletePayment = "delete-payment",
  DeleteTip = "delete-tip",
  DeleteRefreshGroup = "delete-refresh-group",
  DeleteDepositGroup = "delete-deposit-group",
  DeleteRefund = "delete-refund",
  DeletePeerPullDebit = "delete-peer-pull-debit",
  DeletePeerPushDebit = "delete-peer-push-debit",
}

/**
 * Create an event ID from the type and the primary key for the event.
 */
export function makeTransactionId(
  type: TransactionType,
  ...args: string[]
): TransactionIdStr {
  return `txn:${type}:${args.map((x) => encodeURIComponent(x)).join(":")}`;
}

export function parseId(
  idType: "txn" | "tmb" | "any",
  txId: string,
): {
  type: TransactionType;
  args: string[];
} {
  const txnParts = txId.split(":");
  if (txnParts.length < 3) {
    throw Error("id should have al least 3 parts separated by ':'");
  }
  const [prefix, typeStr, ...args] = txnParts;
  const type = typeStr as TransactionType;

  if (idType != "any" && prefix !== idType) {
    throw Error(`id should start with ${idType}`);
  }

  if (args.length === 0) {
    throw Error("id should have one or more arguments");
  }

  return { type, args };
}

/**
 * Create an event ID from the type and the primary key for the event.
 */
export function makeTombstoneId(
  type: TombstoneTag,
  ...args: string[]
): TombstoneIdStr {
  return `tmb:${type}:${args.map((x) => encodeURIComponent(x)).join(":")}`;
}

export function getExchangeTosStatus(
  exchangeDetails: ExchangeDetailsRecord,
): ExchangeTosStatus {
  if (!exchangeDetails.tosAccepted) {
    return ExchangeTosStatus.New;
  }
  if (exchangeDetails.tosAccepted?.etag == exchangeDetails.tosCurrentEtag) {
    return ExchangeTosStatus.Accepted;
  }
  return ExchangeTosStatus.Changed;
}

export function makeExchangeListItem(
  r: ExchangeRecord,
  exchangeDetails: ExchangeDetailsRecord | undefined,
): ExchangeListItem {
  if (!exchangeDetails) {
    return {
      exchangeBaseUrl: r.baseUrl,
      currency: undefined,
      tosStatus: ExchangeTosStatus.Unknown,
      paytoUris: [],
      exchangeStatus: ExchangeEntryStatus.Unknown,
      permanent: r.permanent,
    };
  }
  let exchangeStatus;
  exchangeStatus = ExchangeEntryStatus.Ok;
  return {
    exchangeBaseUrl: r.baseUrl,
    currency: exchangeDetails.currency,
    tosStatus: getExchangeTosStatus(exchangeDetails),
    paytoUris: exchangeDetails.wireInfo.accounts.map((x) => x.payto_uri),
    exchangeStatus,
    permanent: r.permanent,
  };
}
