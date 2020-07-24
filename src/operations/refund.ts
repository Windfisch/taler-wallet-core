/*
 This file is part of GNU Taler
 (C) 2019-2019 Taler Systems S.A.

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
 * Implementation of the refund operation.
 *
 * @author Florian Dold
 */

/**
 * Imports.
 */
import { InternalWalletState } from "./state";
import {
  OperationErrorDetails,
  RefreshReason,
  CoinPublicKey,
} from "../types/walletTypes";
import {
  Stores,
  updateRetryInfoTimeout,
  initRetryInfo,
  CoinStatus,
  RefundReason,
  RefundEventRecord,
  RefundState,
  PurchaseRecord,
} from "../types/dbTypes";
import { NotificationType } from "../types/notifications";
import { parseRefundUri } from "../util/taleruri";
import { createRefreshGroup, getTotalRefreshCost } from "./refresh";
import { Amounts } from "../util/amounts";
import {
  codecForMerchantOrderStatus,
  MerchantCoinRefundStatus,
  MerchantCoinRefundSuccessStatus,
  MerchantCoinRefundFailureStatus,
} from "../types/talerTypes";
import { guardOperationException } from "./errors";
import { getTimestampNow } from "../util/time";
import { Logger } from "../util/logging";
import { readSuccessResponseJsonOrThrow } from "../util/http";
import { TransactionHandle } from "../util/query";

const logger = new Logger("refund.ts");

/**
 * Retry querying and applying refunds for an order later.
 */
async function incrementPurchaseQueryRefundRetry(
  ws: InternalWalletState,
  proposalId: string,
  err: OperationErrorDetails | undefined,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.purchases], async (tx) => {
    const pr = await tx.get(Stores.purchases, proposalId);
    if (!pr) {
      return;
    }
    if (!pr.refundStatusRetryInfo) {
      return;
    }
    pr.refundStatusRetryInfo.retryCounter++;
    updateRetryInfoTimeout(pr.refundStatusRetryInfo);
    pr.lastRefundStatusError = err;
    await tx.put(Stores.purchases, pr);
  });
  if (err) {
    ws.notify({
      type: NotificationType.RefundStatusOperationError,
      error: err,
    });
  }
}

function getRefundKey(d: MerchantCoinRefundStatus): string {
  return `${d.coin_pub}-${d.rtransaction_id}`;
}

async function applySuccessfulRefund(
  tx: TransactionHandle,
  p: PurchaseRecord,
  refreshCoinsMap: Record<string, { coinPub: string }>,
  r: MerchantCoinRefundSuccessStatus,
): Promise<void> {
  // FIXME: check signature before storing it as valid!

  const refundKey = getRefundKey(r);
  const coin = await tx.get(Stores.coins, r.coin_pub);
  if (!coin) {
    console.warn("coin not found, can't apply refund");
    return;
  }
  const denom = await tx.getIndexed(
    Stores.denominations.denomPubHashIndex,
    coin.denomPubHash,
  );
  if (!denom) {
    throw Error("inconsistent database");
  }
  refreshCoinsMap[coin.coinPub] = { coinPub: coin.coinPub };
  const refundAmount = Amounts.parseOrThrow(r.refund_amount);
  const refundFee = denom.feeRefund;
  coin.status = CoinStatus.Dormant;
  coin.currentAmount = Amounts.add(coin.currentAmount, refundAmount).amount;
  coin.currentAmount = Amounts.sub(coin.currentAmount, refundFee).amount;
  logger.trace(`coin amount after is ${Amounts.stringify(coin.currentAmount)}`);
  await tx.put(Stores.coins, coin);

  const allDenoms = await tx
    .iterIndexed(Stores.denominations.exchangeBaseUrlIndex, coin.exchangeBaseUrl)
    .toArray();

  const amountLeft = Amounts.sub(
    Amounts.add(coin.currentAmount, Amounts.parseOrThrow(r.refund_amount))
      .amount,
    denom.feeRefund,
  ).amount;

  const totalRefreshCostBound = getTotalRefreshCost(
    allDenoms,
    denom,
    amountLeft,
  );

  p.refunds[refundKey] = {
    type: RefundState.Applied,
    executionTime: r.execution_time,
    refundAmount: Amounts.parseOrThrow(r.refund_amount),
    refundFee: denom.feeRefund,
    totalRefreshCostBound,
  };
}

async function storePendingRefund(
  tx: TransactionHandle,
  p: PurchaseRecord,
  r: MerchantCoinRefundFailureStatus,
): Promise<void> {
  const refundKey = getRefundKey(r);

  const coin = await tx.get(Stores.coins, r.coin_pub);
  if (!coin) {
    console.warn("coin not found, can't apply refund");
    return;
  }
  const denom = await tx.getIndexed(
    Stores.denominations.denomPubHashIndex,
    coin.denomPubHash,
  );

  if (!denom) {
    throw Error("inconsistent database");
  }

  const allDenoms = await tx
    .iterIndexed(Stores.denominations.exchangeBaseUrlIndex, coin.exchangeBaseUrl)
    .toArray();

  const amountLeft = Amounts.sub(
    Amounts.add(coin.currentAmount, Amounts.parseOrThrow(r.refund_amount))
      .amount,
    denom.feeRefund,
  ).amount;

  const totalRefreshCostBound = getTotalRefreshCost(
    allDenoms,
    denom,
    amountLeft,
  );

  p.refunds[refundKey] = {
    type: RefundState.Pending,
    executionTime: r.execution_time,
    refundAmount: Amounts.parseOrThrow(r.refund_amount),
    refundFee: denom.feeRefund,
    totalRefreshCostBound,
  };
}

async function acceptRefunds(
  ws: InternalWalletState,
  proposalId: string,
  refunds: MerchantCoinRefundStatus[],
  reason: RefundReason,
): Promise<void> {
  console.log("handling refunds", refunds);
  const now = getTimestampNow();

  await ws.db.runWithWriteTransaction(
    [Stores.purchases, Stores.coins, Stores.denominations, Stores.refreshGroups, Stores.refundEvents],
    async (tx) => {
      const p = await tx.get(Stores.purchases, proposalId);
      if (!p) {
        console.error("purchase not found, not adding refunds");
        return;
      }

      const refreshCoinsMap: Record<string, CoinPublicKey> = {};

      for (const refundStatus of refunds) {
        const refundKey = getRefundKey(refundStatus);
        const existingRefundInfo = p.refunds[refundKey];

        // Already failed.
        if (existingRefundInfo?.type === RefundState.Failed) {
          continue;
        }

        // Already applied.
        if (existingRefundInfo?.type === RefundState.Applied) {
          continue;
        }

        // Still pending.
        if (
          refundStatus.type === "failure" &&
          existingRefundInfo?.type === RefundState.Pending
        ) {
          continue;
        }

        // Invariant: (!existingRefundInfo) || (existingRefundInfo === Pending)

        if (refundStatus.type === "success") {
          await applySuccessfulRefund(tx, p, refreshCoinsMap, refundStatus);
        } else {
          await storePendingRefund(tx, p, refundStatus);
        }
      }

      const refreshCoinsPubs = Object.values(refreshCoinsMap);
      await createRefreshGroup(ws, tx, refreshCoinsPubs, RefreshReason.Refund);

      // Are we done with querying yet, or do we need to do another round
      // after a retry delay?
      let queryDone = true;

      if (p.autoRefundDeadline && p.autoRefundDeadline.t_ms > now.t_ms) {
        queryDone = false;
      }

      let numPendingRefunds = 0;
      for (const ri of Object.values(p.refunds)) {
        switch (ri.type) {
          case RefundState.Pending:
            numPendingRefunds++;
            break;
        }
      }

      if (numPendingRefunds > 0) {
        queryDone = false;
      }

      if (queryDone) {
        p.timestampLastRefundStatus = now;
        p.lastRefundStatusError = undefined;
        p.refundStatusRetryInfo = initRetryInfo(false);
        p.refundStatusRequested = false;
        logger.trace("refund query done");
      } else {
        // No error, but we need to try again!
        p.timestampLastRefundStatus = now;
        p.refundStatusRetryInfo.retryCounter++;
        updateRetryInfoTimeout(p.refundStatusRetryInfo);
        p.lastRefundStatusError = undefined;
        logger.trace("refund query not done");
      }

      await tx.put(Stores.purchases, p);
    },
  );

  ws.notify({
    type: NotificationType.RefundQueried,
  });
}

async function startRefundQuery(
  ws: InternalWalletState,
  proposalId: string,
): Promise<void> {
  const success = await ws.db.runWithWriteTransaction(
    [Stores.purchases],
    async (tx) => {
      const p = await tx.get(Stores.purchases, proposalId);
      if (!p) {
        logger.error("no purchase found for refund URL");
        return false;
      }
      p.refundStatusRequested = true;
      p.lastRefundStatusError = undefined;
      p.refundStatusRetryInfo = initRetryInfo();
      await tx.put(Stores.purchases, p);
      return true;
    },
  );

  if (!success) {
    return;
  }

  ws.notify({
    type: NotificationType.RefundStarted,
  });

  await processPurchaseQueryRefund(ws, proposalId);
}

/**
 * Accept a refund, return the contract hash for the contract
 * that was involved in the refund.
 */
export async function applyRefund(
  ws: InternalWalletState,
  talerRefundUri: string,
): Promise<{ contractTermsHash: string; proposalId: string }> {
  const parseResult = parseRefundUri(talerRefundUri);

  logger.trace("applying refund", parseResult);

  if (!parseResult) {
    throw Error("invalid refund URI");
  }

  const purchase = await ws.db.getIndexed(Stores.purchases.orderIdIndex, [
    parseResult.merchantBaseUrl,
    parseResult.orderId,
  ]);

  if (!purchase) {
    throw Error(
      `no purchase for the taler://refund/ URI (${talerRefundUri}) was found`,
    );
  }

  logger.info("processing purchase for refund");
  await startRefundQuery(ws, purchase.proposalId);

  return {
    contractTermsHash: purchase.contractData.contractTermsHash,
    proposalId: purchase.proposalId,
  };
}

export async function processPurchaseQueryRefund(
  ws: InternalWalletState,
  proposalId: string,
  forceNow = false,
): Promise<void> {
  const onOpErr = (e: OperationErrorDetails): Promise<void> =>
    incrementPurchaseQueryRefundRetry(ws, proposalId, e);
  await guardOperationException(
    () => processPurchaseQueryRefundImpl(ws, proposalId, forceNow),
    onOpErr,
  );
}

async function resetPurchaseQueryRefundRetry(
  ws: InternalWalletState,
  proposalId: string,
): Promise<void> {
  await ws.db.mutate(Stores.purchases, proposalId, (x) => {
    if (x.refundStatusRetryInfo.active) {
      x.refundStatusRetryInfo = initRetryInfo();
    }
    return x;
  });
}

async function processPurchaseQueryRefundImpl(
  ws: InternalWalletState,
  proposalId: string,
  forceNow: boolean,
): Promise<void> {
  if (forceNow) {
    await resetPurchaseQueryRefundRetry(ws, proposalId);
  }
  const purchase = await ws.db.get(Stores.purchases, proposalId);
  if (!purchase) {
    return;
  }

  if (!purchase.refundStatusRequested) {
    return;
  }

  const requestUrl = new URL(
    `orders/${purchase.contractData.orderId}`,
    purchase.contractData.merchantBaseUrl,
  );
  requestUrl.searchParams.set(
    "h_contract",
    purchase.contractData.contractTermsHash,
  );

  const request = await ws.http.get(requestUrl.href);

  console.log("got json", JSON.stringify(await request.json(), undefined, 2));

  const refundResponse = await readSuccessResponseJsonOrThrow(
    request,
    codecForMerchantOrderStatus(),
  );

  if (refundResponse.order_status !== "paid") {
    logger.error("can't refund unpaid order");
    return;
  }

  await acceptRefunds(
    ws,
    proposalId,
    refundResponse.refunds,
    RefundReason.NormalRefund,
  );
}
