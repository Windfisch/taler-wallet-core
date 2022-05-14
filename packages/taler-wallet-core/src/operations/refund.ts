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
import {
  AbortingCoin,
  AbortRequest,
  AmountJson,
  Amounts,
  ApplyRefundResponse,
  codecForAbortResponse,
  codecForMerchantOrderRefundPickupResponse,
  CoinPublicKey,
  Logger,
  MerchantCoinRefundFailureStatus,
  MerchantCoinRefundStatus,
  MerchantCoinRefundSuccessStatus,
  NotificationType,
  parseRefundUri,
  RefreshReason,
  TalerErrorCode,
  TalerErrorDetail,
  URL,
  codecForMerchantOrderStatusPaid,
  AbsoluteTime,
  TalerProtocolTimestamp,
  Duration,
  PrepareRefundRequest,
  PrepareRefundResult,
} from "@gnu-taler/taler-util";
import {
  AbortStatus,
  CoinStatus,
  PurchaseRecord,
  RefundReason,
  RefundState,
  WalletStoresV1,
} from "../db.js";
import { readSuccessResponseJsonOrThrow } from "../util/http.js";
import { checkDbInvariant } from "../util/invariants.js";
import { GetReadWriteAccess } from "../util/query.js";
import {
  resetRetryInfo,
  RetryInfo,
  updateRetryInfoTimeout,
} from "../util/retries.js";
import { createRefreshGroup, getTotalRefreshCost } from "./refresh.js";
import { InternalWalletState } from "../internal-wallet-state.js";
import { guardOperationException } from "./common.js";

const logger = new Logger("refund.ts");


export async function prepareRefund(
  ws: InternalWalletState,
  talerRefundUri: string,
): Promise<PrepareRefundResult> {
  const parseResult = parseRefundUri(talerRefundUri);

  logger.trace("preparing refund offer", parseResult);

  if (!parseResult) {
    throw Error("invalid refund URI");
  }

  const purchase = await ws.db
    .mktx((x) => ({
      purchases: x.purchases,
    }))
    .runReadOnly(async (tx) => {
      return tx.purchases.indexes.byMerchantUrlAndOrderId.get([
        parseResult.merchantBaseUrl,
        parseResult.orderId,
      ]);
    });

  if (!purchase) {
    throw Error(
      `no purchase for the taler://refund/ URI (${talerRefundUri}) was found`,
    );
  }

  const awaiting = await queryAndSaveAwaitingRefund(ws, purchase)
  const summary = calculateRefundSummary(purchase)
  const proposalId = purchase.proposalId;

  const { contractData: c } = purchase.download

  return {
    proposalId,
    effectivePaid: Amounts.stringify(summary.amountEffectivePaid),
    gone: Amounts.stringify(summary.amountRefundGone),
    granted: Amounts.stringify(summary.amountRefundGranted),
    pending: summary.pendingAtExchange,
    awaiting: Amounts.stringify(awaiting),
    info: {
      contractTermsHash: c.contractTermsHash,
      merchant: c.merchant,
      orderId: c.orderId,
      products: c.products,
      summary: c.summary,
      fulfillmentMessage: c.fulfillmentMessage,
      summary_i18n: c.summaryI18n,
      fulfillmentMessage_i18n:
        c.fulfillmentMessageI18n,
    },
  }
}
/**
 * Retry querying and applying refunds for an order later.
 */
async function setupPurchaseQueryRefundRetry(
  ws: InternalWalletState,
  proposalId: string,
  options: {
    reset: boolean;
  },
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      purchases: x.purchases,
    }))
    .runReadWrite(async (tx) => {
      const pr = await tx.purchases.get(proposalId);
      if (!pr) {
        return;
      }
      if (options.reset) {
        pr.refundStatusRetryInfo = resetRetryInfo();
      } else {
        pr.refundStatusRetryInfo = RetryInfo.increment(
          pr.refundStatusRetryInfo,
        );
      }
      await tx.purchases.put(pr);
    });
}

/**
 * Report an error that happending when querying for a purchase's refund.
 */
async function reportPurchaseQueryRefundError(
  ws: InternalWalletState,
  proposalId: string,
  err: TalerErrorDetail,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      purchases: x.purchases,
    }))
    .runReadWrite(async (tx) => {
      const pr = await tx.purchases.get(proposalId);
      if (!pr) {
        return;
      }
      if (!pr.refundStatusRetryInfo) {
        logger.error(
          "reported error on an inactive purchase (no refund status retry info)",
        );
      }
      pr.lastRefundStatusError = err;
      await tx.purchases.put(pr);
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
  tx: GetReadWriteAccess<{
    coins: typeof WalletStoresV1.coins;
    denominations: typeof WalletStoresV1.denominations;
  }>,
  p: PurchaseRecord,
  refreshCoinsMap: Record<string, { coinPub: string }>,
  r: MerchantCoinRefundSuccessStatus,
): Promise<void> {
  // FIXME: check signature before storing it as valid!

  const refundKey = getRefundKey(r);
  const coin = await tx.coins.get(r.coin_pub);
  if (!coin) {
    logger.warn("coin not found, can't apply refund");
    return;
  }
  const denom = await tx.denominations.get([
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
  await tx.coins.put(coin);

  const allDenoms = await tx.denominations.indexes.byExchangeBaseUrl
    .iter(coin.exchangeBaseUrl)
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
    obtainedTime: AbsoluteTime.toTimestamp(AbsoluteTime.now()),
    executionTime: r.execution_time,
    refundAmount: Amounts.parseOrThrow(r.refund_amount),
    refundFee: denom.feeRefund,
    totalRefreshCostBound,
    coinPub: r.coin_pub,
    rtransactionId: r.rtransaction_id,
  };
}

async function storePendingRefund(
  tx: GetReadWriteAccess<{
    denominations: typeof WalletStoresV1.denominations;
    coins: typeof WalletStoresV1.coins;
  }>,
  p: PurchaseRecord,
  r: MerchantCoinRefundFailureStatus,
): Promise<void> {
  const refundKey = getRefundKey(r);

  const coin = await tx.coins.get(r.coin_pub);
  if (!coin) {
    logger.warn("coin not found, can't apply refund");
    return;
  }
  const denom = await tx.denominations.get([
    coin.exchangeBaseUrl,
    coin.denomPubHash,
  ]);

  if (!denom) {
    throw Error("inconsistent database");
  }

  const allDenoms = await tx.denominations.indexes.byExchangeBaseUrl
    .iter(coin.exchangeBaseUrl)
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
    obtainedTime: AbsoluteTime.toTimestamp(AbsoluteTime.now()),
    executionTime: r.execution_time,
    refundAmount: Amounts.parseOrThrow(r.refund_amount),
    refundFee: denom.feeRefund,
    totalRefreshCostBound,
    coinPub: r.coin_pub,
    rtransactionId: r.rtransaction_id,
  };
}

async function storeFailedRefund(
  tx: GetReadWriteAccess<{
    coins: typeof WalletStoresV1.coins;
    denominations: typeof WalletStoresV1.denominations;
  }>,
  p: PurchaseRecord,
  refreshCoinsMap: Record<string, { coinPub: string }>,
  r: MerchantCoinRefundFailureStatus,
): Promise<void> {
  const refundKey = getRefundKey(r);

  const coin = await tx.coins.get(r.coin_pub);
  if (!coin) {
    logger.warn("coin not found, can't apply refund");
    return;
  }
  const denom = await tx.denominations.get([
    coin.exchangeBaseUrl,
    coin.denomPubHash,
  ]);

  if (!denom) {
    throw Error("inconsistent database");
  }

  const allDenoms = await tx.denominations.indexes.byExchangeBaseUrl
    .iter(coin.exchangeBaseUrl)
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
    obtainedTime: TalerProtocolTimestamp.now(),
    executionTime: r.execution_time,
    refundAmount: Amounts.parseOrThrow(r.refund_amount),
    refundFee: denom.feeRefund,
    totalRefreshCostBound,
    coinPub: r.coin_pub,
    rtransactionId: r.rtransaction_id,
  };

  if (p.abortStatus === AbortStatus.AbortRefund) {
    // Refund failed because the merchant didn't even try to deposit
    // the coin yet, so we try to refresh.
    if (r.exchange_code === TalerErrorCode.EXCHANGE_REFUND_DEPOSIT_NOT_FOUND) {
      const coin = await tx.coins.get(r.coin_pub);
      if (!coin) {
        logger.warn("coin not found, can't apply refund");
        return;
      }
      const denom = await tx.denominations.get([
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
        coin.currentAmount = Amounts.sub(
          coin.currentAmount,
          denom.feeRefund,
        ).amount;
      }
      refreshCoinsMap[coin.coinPub] = { coinPub: coin.coinPub };
      await tx.coins.put(coin);
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
  const now = TalerProtocolTimestamp.now();

  await ws.db
    .mktx((x) => ({
      purchases: x.purchases,
      coins: x.coins,
      denominations: x.denominations,
      refreshGroups: x.refreshGroups,
    }))
    .runReadWrite(async (tx) => {
      const p = await tx.purchases.get(proposalId);
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
          refundStatus.exchange_status >= 400 &&
          refundStatus.exchange_status < 500;

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
        AbsoluteTime.cmp(
          AbsoluteTime.fromTimestamp(p.autoRefundDeadline),
          AbsoluteTime.fromTimestamp(now),
        ) > 0
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
        p.refundStatusRetryInfo = resetRetryInfo();
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

      await tx.purchases.put(p);
    });

  ws.notify({
    type: NotificationType.RefundQueried,
  });
}


function calculateRefundSummary(p: PurchaseRecord): RefundSummary {
  let amountRefundGranted = Amounts.getZero(
    p.download.contractData.amount.currency,
  );
  let amountRefundGone = Amounts.getZero(
    p.download.contractData.amount.currency,
  );

  let pendingAtExchange = false;

  Object.keys(p.refunds).forEach((rk) => {
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
      amountRefundGone = Amounts.add(
        amountRefundGone,
        refund.refundAmount,
      ).amount;
    }
  });
  return { amountEffectivePaid: p.totalPayCost, amountRefundGone, amountRefundGranted, pendingAtExchange }
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

  let purchase = await ws.db
    .mktx((x) => ({
      purchases: x.purchases,
    }))
    .runReadOnly(async (tx) => {
      return tx.purchases.indexes.byMerchantUrlAndOrderId.get([
        parseResult.merchantBaseUrl,
        parseResult.orderId,
      ]);
    });

  if (!purchase) {
    throw Error(
      `no purchase for the taler://refund/ URI (${talerRefundUri}) was found`,
    );
  }

  const proposalId = purchase.proposalId;

  logger.info("processing purchase for refund");
  const success = await ws.db
    .mktx((x) => ({
      purchases: x.purchases,
    }))
    .runReadWrite(async (tx) => {
      const p = await tx.purchases.get(proposalId);
      if (!p) {
        logger.error("no purchase found for refund URL");
        return false;
      }
      p.refundQueryRequested = true;
      p.lastRefundStatusError = undefined;
      p.refundStatusRetryInfo = resetRetryInfo();
      await tx.purchases.put(p);
      return true;
    });

  if (success) {
    ws.notify({
      type: NotificationType.RefundStarted,
    });
    await processPurchaseQueryRefundImpl(ws, proposalId, {
      forceNow: true,
      waitForAutoRefund: false,
    });
  }

  purchase = await ws.db
    .mktx((x) => ({
      purchases: x.purchases,
    }))
    .runReadOnly(async (tx) => {
      return tx.purchases.get(proposalId);
    });

  if (!purchase) {
    throw Error("purchase no longer exists");
  }

  const summary = calculateRefundSummary(purchase)

  return {
    contractTermsHash: purchase.download.contractData.contractTermsHash,
    proposalId: purchase.proposalId,
    amountEffectivePaid: Amounts.stringify(summary.amountEffectivePaid),
    amountRefundGone: Amounts.stringify(summary.amountRefundGone),
    amountRefundGranted: Amounts.stringify(summary.amountRefundGranted),
    pendingAtExchange: summary.pendingAtExchange,
    info: {
      contractTermsHash: purchase.download.contractData.contractTermsHash,
      merchant: purchase.download.contractData.merchant,
      orderId: purchase.download.contractData.orderId,
      products: purchase.download.contractData.products,
      summary: purchase.download.contractData.summary,
      fulfillmentMessage: purchase.download.contractData.fulfillmentMessage,
      summary_i18n: purchase.download.contractData.summaryI18n,
      fulfillmentMessage_i18n:
        purchase.download.contractData.fulfillmentMessageI18n,
    },
  };
}

export async function processPurchaseQueryRefund(
  ws: InternalWalletState,
  proposalId: string,
  options: {
    forceNow?: boolean;
    waitForAutoRefund?: boolean;
  } = {},
): Promise<void> {
  const onOpErr = (e: TalerErrorDetail): Promise<void> =>
    reportPurchaseQueryRefundError(ws, proposalId, e);
  await guardOperationException(
    () => processPurchaseQueryRefundImpl(ws, proposalId, options),
    onOpErr,
  );
}

async function queryAndSaveAwaitingRefund(
  ws: InternalWalletState,
  purchase: PurchaseRecord,
  waitForAutoRefund?: boolean): Promise<AmountJson> {
  const requestUrl = new URL(
    `orders/${purchase.download.contractData.orderId}`,
    purchase.download.contractData.merchantBaseUrl,
  );
  requestUrl.searchParams.set(
    "h_contract",
    purchase.download.contractData.contractTermsHash,
  );
  // Long-poll for one second
  if (waitForAutoRefund) {
    requestUrl.searchParams.set("timeout_ms", "1000");
    requestUrl.searchParams.set("await_refund_obtained", "yes");
    logger.trace("making long-polling request for auto-refund");
  }
  const resp = await ws.http.get(requestUrl.href);
  const orderStatus = await readSuccessResponseJsonOrThrow(
    resp,
    codecForMerchantOrderStatusPaid(),
  );
  if (!orderStatus.refunded) {
    // Wait for retry ...
    return Amounts.getZero(purchase.totalPayCost.currency);
  }

  const refundAwaiting = Amounts.sub(
    Amounts.parseOrThrow(orderStatus.refund_amount),
    Amounts.parseOrThrow(orderStatus.refund_taken)
  ).amount

  console.log("refund waiting found, ", refundAwaiting, orderStatus, purchase.refundAwaiting, purchase.refundAwaiting && Amounts.cmp(refundAwaiting, purchase.refundAwaiting))

  if (purchase.refundAwaiting === undefined || Amounts.cmp(refundAwaiting, purchase.refundAwaiting) !== 0) {
    await ws.db
      .mktx((x) => ({ purchases: x.purchases }))
      .runReadWrite(async (tx) => {
        const p = await tx.purchases.get(purchase.proposalId);
        if (!p) {
          logger.warn("purchase does not exist anymore");
          return;
        }
        p.refundAwaiting = refundAwaiting
        await tx.purchases.put(p);
      });
  }

  return refundAwaiting;
}


async function processPurchaseQueryRefundImpl(
  ws: InternalWalletState,
  proposalId: string,
  options: {
    forceNow?: boolean;
    waitForAutoRefund?: boolean;
  } = {},
): Promise<void> {
  const forceNow = options.forceNow ?? false;
  const waitForAutoRefund = options.waitForAutoRefund ?? false;
  await setupPurchaseQueryRefundRetry(ws, proposalId, { reset: forceNow });
  const purchase = await ws.db
    .mktx((x) => ({
      purchases: x.purchases,
    }))
    .runReadOnly(async (tx) => {
      return tx.purchases.get(proposalId);
    });
  if (!purchase) {
    return;
  }

  if (!purchase.refundQueryRequested) {
    return;
  }

  if (purchase.timestampFirstSuccessfulPay) {
    if (
      !purchase.autoRefundDeadline ||
      !AbsoluteTime.isExpired(
        AbsoluteTime.fromTimestamp(purchase.autoRefundDeadline),
      )
    ) {
      const awaitingAmount = await queryAndSaveAwaitingRefund(ws, purchase, waitForAutoRefund)
      if (Amounts.isZero(awaitingAmount)) return;
    }

    const requestUrl = new URL(
      `orders/${purchase.download.contractData.orderId}/refund`,
      purchase.download.contractData.merchantBaseUrl,
    );

    logger.trace(`making refund request to ${requestUrl.href}`);

    const request = await ws.http.postJson(requestUrl.href, {
      h_contract: purchase.download.contractData.contractTermsHash,
    });

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
      `orders/${purchase.download.contractData.orderId}/abort`,
      purchase.download.contractData.merchantBaseUrl,
    );

    const abortingCoins: AbortingCoin[] = [];

    await ws.db
      .mktx((x) => ({
        coins: x.coins,
      }))
      .runReadOnly(async (tx) => {
        for (let i = 0; i < purchase.payCoinSelection.coinPubs.length; i++) {
          const coinPub = purchase.payCoinSelection.coinPubs[i];
          const coin = await tx.coins.get(coinPub);
          checkDbInvariant(!!coin, "expected coin to be present");
          abortingCoins.push({
            coin_pub: coinPub,
            contribution: Amounts.stringify(
              purchase.payCoinSelection.coinContributions[i],
            ),
            exchange_url: coin.exchangeBaseUrl,
          });
        }
      });

    const abortReq: AbortRequest = {
      h_contract: purchase.download.contractData.contractTermsHash,
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
        execution_time: AbsoluteTime.toTimestamp(
          AbsoluteTime.addDuration(
            AbsoluteTime.fromTimestamp(
              purchase.download.contractData.timestamp,
            ),
            Duration.fromSpec({ seconds: 1 }),
          ),
        ),
      });
    }
    await acceptRefunds(ws, proposalId, refunds, RefundReason.AbortRefund);
  }
}

export async function abortFailedPayWithRefund(
  ws: InternalWalletState,
  proposalId: string,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      purchases: x.purchases,
    }))
    .runReadWrite(async (tx) => {
      const purchase = await tx.purchases.get(proposalId);
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
      purchase.payRetryInfo = resetRetryInfo();
      await tx.purchases.put(purchase);
    });
  processPurchaseQueryRefund(ws, proposalId, {
    forceNow: true,
  }).catch((e) => {
    logger.trace(`error during refund processing after abort pay: ${e}`);
  });
}
