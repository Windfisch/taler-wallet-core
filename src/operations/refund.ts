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
  OperationError,
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
} from "../types/dbTypes";
import { NotificationType } from "../types/notifications";
import { parseRefundUri } from "../util/taleruri";
import { createRefreshGroup, getTotalRefreshCost } from "./refresh";
import { Amounts } from "../util/amounts";
import {
  MerchantRefundDetails,
  MerchantRefundResponse,
  codecForMerchantRefundResponse,
} from "../types/talerTypes";
import { AmountJson } from "../util/amounts";
import { guardOperationException } from "./errors";
import { randomBytes } from "../crypto/primitives/nacl-fast";
import { encodeCrock } from "../crypto/talerCrypto";
import { getTimestampNow } from "../util/time";
import { Logger } from "../util/logging";

const logger = new Logger("refund.ts");

async function incrementPurchaseQueryRefundRetry(
  ws: InternalWalletState,
  proposalId: string,
  err: OperationError | undefined,
): Promise<void> {
  console.log("incrementing purchase refund query retry with error", err);
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
  ws.notify({ type: NotificationType.RefundStatusOperationError });
}

export async function getFullRefundFees(
  ws: InternalWalletState,
  refundPermissions: MerchantRefundDetails[],
): Promise<AmountJson> {
  if (refundPermissions.length === 0) {
    throw Error("no refunds given");
  }
  const coin0 = await ws.db.get(Stores.coins, refundPermissions[0].coin_pub);
  if (!coin0) {
    throw Error("coin not found");
  }
  let feeAcc = Amounts.getZero(
    Amounts.parseOrThrow(refundPermissions[0].refund_amount).currency,
  );

  const denoms = await ws.db
    .iterIndex(Stores.denominations.exchangeBaseUrlIndex, coin0.exchangeBaseUrl)
    .toArray();

  for (const rp of refundPermissions) {
    const coin = await ws.db.get(Stores.coins, rp.coin_pub);
    if (!coin) {
      throw Error("coin not found");
    }
    const denom = await ws.db.get(Stores.denominations, [
      coin0.exchangeBaseUrl,
      coin.denomPub,
    ]);
    if (!denom) {
      throw Error(`denom not found (${coin.denomPub})`);
    }
    // FIXME:  this assumes that the refund already happened.
    // When it hasn't, the refresh cost is inaccurate.  To fix this,
    // we need introduce a flag to tell if a coin was refunded or
    // refreshed normally (and what about incremental refunds?)
    const refundAmount = Amounts.parseOrThrow(rp.refund_amount);
    const refundFee = Amounts.parseOrThrow(rp.refund_fee);
    const refreshCost = getTotalRefreshCost(
      denoms,
      denom,
      Amounts.sub(refundAmount, refundFee).amount,
    );
    feeAcc = Amounts.add(feeAcc, refreshCost, refundFee).amount;
  }
  return feeAcc;
}

function getRefundKey(d: MerchantRefundDetails): string {
  return `{d.coin_pub}-{d.rtransaction_id}`;
}

async function acceptRefundResponse(
  ws: InternalWalletState,
  proposalId: string,
  refundResponse: MerchantRefundResponse,
  reason: RefundReason,
): Promise<void> {
  const refunds = refundResponse.refunds;

  const refundGroupId = encodeCrock(randomBytes(32));

  let numNewRefunds = 0;

  const finishedRefunds: MerchantRefundDetails[] = [];
  const unfinishedRefunds: MerchantRefundDetails[] = [];
  const failedRefunds: MerchantRefundDetails[] = [];

  const refundsRefreshCost: { [refundKey: string]: AmountJson } = {};

  for (const rd of refunds) {
    if (rd.exchange_http_status === 200) {
      // FIXME: also verify signature if necessary.
      finishedRefunds.push(rd);
    } else if (
      rd.exchange_http_status >= 400 &&
      rd.exchange_http_status < 400
    ) {
      failedRefunds.push(rd);
    } else {
      unfinishedRefunds.push(rd);
    }
  }

  for (const rd of [...finishedRefunds, ...unfinishedRefunds]) {
    const key = getRefundKey(rd);
    const coin = await ws.db.get(Stores.coins, rd.coin_pub);
    if (!coin) {
      continue;
    }
    const denom = await ws.db.getIndexed(
      Stores.denominations.denomPubHashIndex,
      coin.denomPubHash,
    );
    if (!denom) {
      throw Error("inconsistent database");
    }
    const amountLeft = Amounts.sub(
      Amounts.add(coin.currentAmount, Amounts.parseOrThrow(rd.refund_amount))
        .amount,
      Amounts.parseOrThrow(rd.refund_fee),
    ).amount;
    const allDenoms = await ws.db
      .iterIndex(
        Stores.denominations.exchangeBaseUrlIndex,
        coin.exchangeBaseUrl,
      )
      .toArray();
    refundsRefreshCost[key] = getTotalRefreshCost(allDenoms, denom, amountLeft);
  }

  const now = getTimestampNow();

  await ws.db.runWithWriteTransaction(
    [Stores.purchases, Stores.coins, Stores.refreshGroups, Stores.refundEvents],
    async (tx) => {
      const p = await tx.get(Stores.purchases, proposalId);
      if (!p) {
        console.error("purchase not found, not adding refunds");
        return;
      }

      // Groups that newly failed/succeeded
      const changedGroups: { [refundGroupId: string]: boolean } = {};

      for (const rd of failedRefunds) {
        const refundKey = getRefundKey(rd);
        if (p.refundsFailed[refundKey]) {
          continue;
        }
        if (!p.refundsFailed[refundKey]) {
          p.refundsFailed[refundKey] = {
            perm: rd,
            refundGroupId,
          };
          numNewRefunds++;
          changedGroups[refundGroupId] = true;
        }
        const oldPending = p.refundsPending[refundKey];
        if (oldPending) {
          delete p.refundsPending[refundKey];
          changedGroups[oldPending.refundGroupId] = true;
        }
      }

      for (const rd of unfinishedRefunds) {
        const refundKey = getRefundKey(rd);
        if (!p.refundsPending[refundKey]) {
          p.refundsPending[refundKey] = {
            perm: rd,
            refundGroupId,
          };
          numNewRefunds++;
        }
      }

      // Avoid duplicates
      const refreshCoinsMap: { [coinPub: string]: CoinPublicKey } = {};

      for (const rd of finishedRefunds) {
        const refundKey = getRefundKey(rd);
        if (p.refundsDone[refundKey]) {
          continue;
        }
        p.refundsDone[refundKey] = {
          perm: rd,
          refundGroupId,
        };
        const oldPending = p.refundsPending[refundKey];
        if (oldPending) {
          delete p.refundsPending[refundKey];
          changedGroups[oldPending.refundGroupId] = true;
        } else {
          numNewRefunds++;
        }

        const c = await tx.get(Stores.coins, rd.coin_pub);

        if (!c) {
          console.warn("coin not found, can't apply refund");
          return;
        }
        refreshCoinsMap[c.coinPub] = { coinPub: c.coinPub };
        logger.trace(`commiting refund ${refundKey} to coin ${c.coinPub}`);
        logger.trace(
          `coin amount before is ${Amounts.stringify(c.currentAmount)}`,
        );
        logger.trace(`refund amount (via merchant) is ${refundKey}`);
        logger.trace(`refund fee (via merchant) is ${refundKey}`);
        const refundAmount = Amounts.parseOrThrow(rd.refund_amount);
        const refundFee = Amounts.parseOrThrow(rd.refund_fee);
        c.status = CoinStatus.Dormant;
        c.currentAmount = Amounts.add(c.currentAmount, refundAmount).amount;
        c.currentAmount = Amounts.sub(c.currentAmount, refundFee).amount;
        logger.trace(
          `coin amount after is ${Amounts.stringify(c.currentAmount)}`,
        );
        await tx.put(Stores.coins, c);
      }

      // Are we done with querying yet, or do we need to do another round
      // after a retry delay?
      let queryDone = true;

      if (numNewRefunds === 0) {
        if (p.autoRefundDeadline && p.autoRefundDeadline.t_ms > now.t_ms) {
          queryDone = false;
        }
      } else {
        p.refundGroups.push({
          reason: RefundReason.NormalRefund,
          refundGroupId,
          timestampQueried: getTimestampNow(),
        });
      }

      if (Object.keys(unfinishedRefunds).length != 0) {
        queryDone = false;
      }

      if (queryDone) {
        p.timestampLastRefundStatus = now;
        p.lastRefundStatusError = undefined;
        p.refundStatusRetryInfo = initRetryInfo(false);
        p.refundStatusRequested = false;
        console.log("refund query done");
      } else {
        // No error, but we need to try again!
        p.timestampLastRefundStatus = now;
        p.refundStatusRetryInfo.retryCounter++;
        updateRetryInfoTimeout(p.refundStatusRetryInfo);
        p.lastRefundStatusError = undefined;
        console.log("refund query not done");
      }

      p.refundsRefreshCost = {...p.refundsRefreshCost, ...refundsRefreshCost };

      await tx.put(Stores.purchases, p);

      const coinsPubsToBeRefreshed = Object.values(refreshCoinsMap);
      if (coinsPubsToBeRefreshed.length > 0) {
        await createRefreshGroup(
          tx,
          coinsPubsToBeRefreshed,
          RefreshReason.Refund,
        );
      }

      // Check if any of the refund groups are done, and we
      // can emit an corresponding event.
      for (const g of Object.keys(changedGroups)) {
        let groupDone = true;
        for (const pk of Object.keys(p.refundsPending)) {
          const r = p.refundsPending[pk];
          if (r.refundGroupId == g) {
            groupDone = false;
          }
        }
        if (groupDone) {
          const refundEvent: RefundEventRecord = {
            proposalId,
            refundGroupId: g,
            timestamp: now,
          };
          await tx.put(Stores.refundEvents, refundEvent);
        }
      }
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
        console.log("no purchase found for refund URL");
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

  console.log("applying refund", parseResult);

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
  const onOpErr = (e: OperationError): Promise<void> =>
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

  const refundUrlObj = new URL("refund", purchase.contractData.merchantBaseUrl);
  refundUrlObj.searchParams.set("order_id", purchase.contractData.orderId);
  const refundUrl = refundUrlObj.href;
  let resp;
  try {
    resp = await ws.http.get(refundUrl);
  } catch (e) {
    console.error("error downloading refund permission", e);
    throw e;
  }
  if (resp.status !== 200) {
    throw Error(`unexpected status code (${resp.status}) for /refund`);
  }

  const refundResponse = codecForMerchantRefundResponse().decode(
    await resp.json(),
  );
  await acceptRefundResponse(
    ws,
    proposalId,
    refundResponse,
    RefundReason.NormalRefund,
  );
}
