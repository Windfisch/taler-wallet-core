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
  TalerErrorDetails,
  RefreshReason,
  CoinPublicKey,
  ApplyRefundResponse,
} from "../types/walletTypes";
import {
  Stores,
  CoinStatus,
  RefundReason,
  RefundState,
  PurchaseRecord,
  AbortStatus,
} from "../types/dbTypes";
import { NotificationType } from "../types/notifications";
import { parseRefundUri } from "../util/taleruri";
import { createRefreshGroup, getTotalRefreshCost } from "./refresh";
import { Amounts, AmountJson } from "../util/amounts";
import {
  MerchantCoinRefundStatus,
  MerchantCoinRefundSuccessStatus,
  MerchantCoinRefundFailureStatus,
  codecForMerchantOrderRefundPickupResponse,
  AbortRequest,
  AbortingCoin,
  codecForMerchantAbortPayRefundStatus,
  codecForAbortResponse,
} from "../types/talerTypes";
import { guardOperationException } from "./errors";
import {
  getTimestampNow,
  Timestamp,
  durationAdd,
  timestampAddDuration,
} from "../util/time";
import { Logger } from "../util/logging";
import { readSuccessResponseJsonOrThrow } from "../util/http";
import { TransactionHandle } from "../util/query";
import { URL } from "../util/url";
import { updateRetryInfoTimeout, initRetryInfo } from "../util/retries";
import { checkDbInvariant } from "../util/invariants";
import { TalerErrorCode } from "../TalerErrorCode";

const logger = new Logger("refund.ts");

/**
 * Retry querying and applying refunds for an order later.
 */
async function incrementPurchaseQueryRefundRetry(
  ws: InternalWalletState,
  proposalId: string,
  err: TalerErrorDetails | undefined,
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
    logger.warn("coin not found, can't apply refund");
    return;
  }
  const denom = await tx.get(Stores.denominations, [
    coin.exchangeBaseUrl,
    coin.denomPubHash,
  ]);
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
    .iterIndexed(
      Stores.denominations.exchangeBaseUrlIndex,
      coin.exchangeBaseUrl,
    )
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
    obtainedTime: getTimestampNow(),
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
    logger.warn("coin not found, can't apply refund");
    return;
  }
  const denom = await tx.get(Stores.denominations, [
    coin.exchangeBaseUrl,
    coin.denomPubHash,
  ]);

  if (!denom) {
    throw Error("inconsistent database");
  }

  const allDenoms = await tx
    .iterIndexed(
      Stores.denominations.exchangeBaseUrlIndex,
      coin.exchangeBaseUrl,
    )
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
    obtainedTime: getTimestampNow(),
    executionTime: r.execution_time,
    refundAmount: Amounts.parseOrThrow(r.refund_amount),
    refundFee: denom.feeRefund,
    totalRefreshCostBound,
  };
}

async function storeFailedRefund(
  tx: TransactionHandle,
  p: PurchaseRecord,
  refreshCoinsMap: Record<string, { coinPub: string }>,
  r: MerchantCoinRefundFailureStatus,
): Promise<void> {
  const refundKey = getRefundKey(r);

  const coin = await tx.get(Stores.coins, r.coin_pub);
  if (!coin) {
    logger.warn("coin not found, can't apply refund");
    return;
  }
  const denom = await tx.get(Stores.denominations, [
    coin.exchangeBaseUrl,
    coin.denomPubHash,
  ]);

  if (!denom) {
    throw Error("inconsistent database");
  }

  const allDenoms = await tx
    .iterIndexed(
      Stores.denominations.exchangeBaseUrlIndex,
      coin.exchangeBaseUrl,
    )
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
    type: RefundState.Failed,
    obtainedTime: getTimestampNow(),
    executionTime: r.execution_time,
    refundAmount: Amounts.parseOrThrow(r.refund_amount),
    refundFee: denom.feeRefund,
    totalRefreshCostBound,
  };

  if (p.abortStatus === AbortStatus.AbortRefund) {
    // Refund failed because the merchant didn't even try to deposit
    // the coin yet, so we try to refresh.
    if (r.exchange_code === TalerErrorCode.EXCHANGE_REFUND_DEPOSIT_NOT_FOUND) {
      const coin = await tx.get(Stores.coins, r.coin_pub);
      if (!coin) {
        logger.warn("coin not found, can't apply refund");
        return;
      }
      const denom = await tx.get(Stores.denominations, [
        coin.exchangeBaseUrl,
        coin.denomPubHash,
      ]);
      if (!denom) {
        logger.warn("denomination for coin missing");
        return;
      }
      let contrib: AmountJson | undefined;
      for (let i = 0; i < p.payCoinSelection.coinPubs.length; i++) {
        if (p.payCoinSelection.coinPubs[i] === r.coin_pub) {
          contrib = p.payCoinSelection.coinContributions[i];
        }
      }
      if (contrib) {
        coin.currentAmount = Amounts.add(coin.currentAmount, contrib).amount;
        coin.currentAmount = Amounts.sub(coin.currentAmount, denom.feeRefund).amount;
      }
      refreshCoinsMap[coin.coinPub] = { coinPub: coin.coinPub };
      await tx.put(Stores.coins, coin);
    }
  }
}

async function acceptRefunds(
  ws: InternalWalletState,
  proposalId: string,
  refunds: MerchantCoinRefundStatus[],
  reason: RefundReason,
): Promise<void> {
  logger.trace("handling refunds", refunds);
  const now = getTimestampNow();

  await ws.db.runWithWriteTransaction(
    [
      Stores.purchases,
      Stores.coins,
      Stores.denominations,
      Stores.refreshGroups,
    ],
    async (tx) => {
      const p = await tx.get(Stores.purchases, proposalId);
      if (!p) {
        logger.error("purchase not found, not adding refunds");
        return;
      }

      const refreshCoinsMap: Record<string, CoinPublicKey> = {};

      for (const refundStatus of refunds) {
        const refundKey = getRefundKey(refundStatus);
        const existingRefundInfo = p.refunds[refundKey];

        const isPermanentFailure =
          refundStatus.type === "failure" &&
          refundStatus.exchange_status >= 400 && refundStatus.exchange_status < 500 ;

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
          !isPermanentFailure &&
          existingRefundInfo?.type === RefundState.Pending
        ) {
          continue;
        }

        // Invariant: (!existingRefundInfo) || (existingRefundInfo === Pending)

        if (refundStatus.type === "success") {
          await applySuccessfulRefund(tx, p, refreshCoinsMap, refundStatus);
        } else if (isPermanentFailure) {
          await storeFailedRefund(tx, p, refreshCoinsMap, refundStatus);
        } else {
          await storePendingRefund(tx, p, refundStatus);
        }
      }

      const refreshCoinsPubs = Object.values(refreshCoinsMap);
      if (refreshCoinsPubs.length > 0) {
        await createRefreshGroup(
          ws,
          tx,
          refreshCoinsPubs,
          RefreshReason.Refund,
        );
      }

      // Are we done with querying yet, or do we need to do another round
      // after a retry delay?
      let queryDone = true;

      if (
        p.timestampFirstSuccessfulPay &&
        p.autoRefundDeadline &&
        p.autoRefundDeadline.t_ms > now.t_ms
      ) {
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
        p.refundQueryRequested = false;
        if (p.abortStatus === AbortStatus.AbortRefund) {
          p.abortStatus = AbortStatus.AbortFinished;
        }
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

/**
 * Summary of the refund status of a purchase.
 */
export interface RefundSummary {
  pendingAtExchange: boolean;
  amountEffectivePaid: AmountJson;
  amountRefundGranted: AmountJson;
  amountRefundGone: AmountJson;
}

/**
 * Accept a refund, return the contract hash for the contract
 * that was involved in the refund.
 */
export async function applyRefund(
  ws: InternalWalletState,
  talerRefundUri: string,
): Promise<ApplyRefundResponse> {
  const parseResult = parseRefundUri(talerRefundUri);

  logger.trace("applying refund", parseResult);

  if (!parseResult) {
    throw Error("invalid refund URI");
  }

  let purchase = await ws.db.getIndexed(Stores.purchases.orderIdIndex, [
    parseResult.merchantBaseUrl,
    parseResult.orderId,
  ]);

  if (!purchase) {
    throw Error(
      `no purchase for the taler://refund/ URI (${talerRefundUri}) was found`,
    );
  }

  const proposalId = purchase.proposalId;

  logger.info("processing purchase for refund");
  const success = await ws.db.runWithWriteTransaction(
    [Stores.purchases],
    async (tx) => {
      const p = await tx.get(Stores.purchases, proposalId);
      if (!p) {
        logger.error("no purchase found for refund URL");
        return false;
      }
      p.refundQueryRequested = true;
      p.lastRefundStatusError = undefined;
      p.refundStatusRetryInfo = initRetryInfo();
      await tx.put(Stores.purchases, p);
      return true;
    },
  );

  if (success) {
    ws.notify({
      type: NotificationType.RefundStarted,
    });
    await processPurchaseQueryRefund(ws, proposalId);
  }

  purchase = await ws.db.get(Stores.purchases, proposalId);

  if (!purchase) {
    throw Error("purchase no longer exists");
  }

  const p = purchase;

  let amountRefundGranted = Amounts.getZero(
    purchase.contractData.amount.currency,
  );
  let amountRefundGone = Amounts.getZero(purchase.contractData.amount.currency);

  let pendingAtExchange = false;

  Object.keys(purchase.refunds).forEach((rk) => {
    const refund = p.refunds[rk];
    if (refund.type === RefundState.Pending) {
      pendingAtExchange = true;
    }
    if (
      refund.type === RefundState.Applied ||
      refund.type === RefundState.Pending
    ) {
      amountRefundGranted = Amounts.add(
        amountRefundGranted,
        Amounts.sub(
          refund.refundAmount,
          refund.refundFee,
          refund.totalRefreshCostBound,
        ).amount,
      ).amount;
    } else {
      amountRefundGone = Amounts.add(amountRefundGone, refund.refundAmount)
        .amount;
    }
  });

  return {
    contractTermsHash: purchase.contractData.contractTermsHash,
    proposalId: purchase.proposalId,
    amountEffectivePaid: Amounts.stringify(purchase.totalPayCost),
    amountRefundGone: Amounts.stringify(amountRefundGone),
    amountRefundGranted: Amounts.stringify(amountRefundGranted),
    pendingAtExchange,
    info: {
      contractTermsHash: purchase.contractData.contractTermsHash,
      merchant: purchase.contractData.merchant,
      orderId: purchase.contractData.orderId,
      products: purchase.contractData.products,
      summary: purchase.contractData.summary,
      fulfillmentMessage: purchase.contractData.fulfillmentMessage,
      summary_i18n: purchase.contractData.summaryI18n,
      fulfillmentMessage_i18n: purchase.contractData.fulfillmentMessageI18n,
    }
  };
}

export async function processPurchaseQueryRefund(
  ws: InternalWalletState,
  proposalId: string,
  forceNow = false,
): Promise<void> {
  const onOpErr = (e: TalerErrorDetails): Promise<void> =>
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

  if (!purchase.refundQueryRequested) {
    return;
  }

  if (purchase.timestampFirstSuccessfulPay) {
    const requestUrl = new URL(
      `orders/${purchase.contractData.orderId}/refund`,
      purchase.contractData.merchantBaseUrl,
    );

    logger.trace(`making refund request to ${requestUrl.href}`);

    const request = await ws.http.postJson(requestUrl.href, {
      h_contract: purchase.contractData.contractTermsHash,
    });

    logger.trace(
      "got json",
      JSON.stringify(await request.json(), undefined, 2),
    );

    const refundResponse = await readSuccessResponseJsonOrThrow(
      request,
      codecForMerchantOrderRefundPickupResponse(),
    );

    await acceptRefunds(
      ws,
      proposalId,
      refundResponse.refunds,
      RefundReason.NormalRefund,
    );
  } else if (purchase.abortStatus === AbortStatus.AbortRefund) {
    const requestUrl = new URL(
      `orders/${purchase.contractData.orderId}/abort`,
      purchase.contractData.merchantBaseUrl,
    );

    const abortingCoins: AbortingCoin[] = [];
    for (let i = 0; i < purchase.payCoinSelection.coinPubs.length; i++) {
      const coinPub = purchase.payCoinSelection.coinPubs[i];
      const coin = await ws.db.get(Stores.coins, coinPub);
      checkDbInvariant(!!coin, "expected coin to be present");
      abortingCoins.push({
        coin_pub: coinPub,
        contribution: Amounts.stringify(
          purchase.payCoinSelection.coinContributions[i],
        ),
        exchange_url: coin.exchangeBaseUrl,
      });
    }

    const abortReq: AbortRequest = {
      h_contract: purchase.contractData.contractTermsHash,
      coins: abortingCoins,
    };

    logger.trace(`making order abort request to ${requestUrl.href}`);

    const request = await ws.http.postJson(requestUrl.href, abortReq);
    const abortResp = await readSuccessResponseJsonOrThrow(
      request,
      codecForAbortResponse(),
    );

    const refunds: MerchantCoinRefundStatus[] = [];

    if (abortResp.refunds.length != abortingCoins.length) {
      // FIXME: define error code!
      throw Error("invalid order abort response");
    }

    for (let i = 0; i < abortResp.refunds.length; i++) {
      const r = abortResp.refunds[i];
      refunds.push({
        ...r,
        coin_pub: purchase.payCoinSelection.coinPubs[i],
        refund_amount: Amounts.stringify(
          purchase.payCoinSelection.coinContributions[i],
        ),
        rtransaction_id: 0,
        execution_time: timestampAddDuration(purchase.contractData.timestamp, {
          d_ms: 1000,
        }),
      });
    }
    await acceptRefunds(ws, proposalId, refunds, RefundReason.AbortRefund);
  }
}

export async function abortFailedPayWithRefund(
  ws: InternalWalletState,
  proposalId: string,
): Promise<void> {
  await ws.db.runWithWriteTransaction([Stores.purchases], async (tx) => {
    const purchase = await tx.get(Stores.purchases, proposalId);
    if (!purchase) {
      throw Error("purchase not found");
    }
    if (purchase.timestampFirstSuccessfulPay) {
      // No point in aborting it.  We don't even report an error.
      logger.warn(`tried to abort successful payment`);
      return;
    }
    if (purchase.abortStatus !== AbortStatus.None) {
      return;
    }
    purchase.refundQueryRequested = true;
    purchase.paymentSubmitPending = false;
    purchase.abortStatus = AbortStatus.AbortRefund;
    purchase.lastPayError = undefined;
    purchase.payRetryInfo = initRetryInfo(false);
    await tx.put(Stores.purchases, purchase);
  });
  processPurchaseQueryRefund(ws, proposalId, true).catch((e) => {
    logger.trace(`error during refund processing after abort pay: ${e}`);
  });
}
