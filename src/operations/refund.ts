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
  RefundInfo,
} from "../types/dbTypes";
import { NotificationType } from "../types/notifications";
import { parseRefundUri } from "../util/taleruri";
import { createRefreshGroup, getTotalRefreshCost } from "./refresh";
import * as Amounts from "../util/amounts";
import {
  MerchantRefundPermission,
  MerchantRefundResponse,
  RefundRequest,
  codecForMerchantRefundResponse,
} from "../types/talerTypes";
import { AmountJson } from "../util/amounts";
import { guardOperationException, OperationFailedError } from "./errors";
import { randomBytes } from "../crypto/primitives/nacl-fast";
import { encodeCrock } from "../crypto/talerCrypto";
import { HttpResponseStatus } from "../util/http";
import { getTimestampNow } from "../util/time";
import { Logger } from "../util/logging";

const logger = new Logger("refund.ts");

async function incrementPurchaseQueryRefundRetry(
  ws: InternalWalletState,
  proposalId: string,
  err: OperationError | undefined,
): Promise<void> {
  console.log("incrementing purchase refund query retry with error", err);
  await ws.db.runWithWriteTransaction([Stores.purchases], async tx => {
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

async function incrementPurchaseApplyRefundRetry(
  ws: InternalWalletState,
  proposalId: string,
  err: OperationError | undefined,
): Promise<void> {
  console.log("incrementing purchase refund apply retry with error", err);
  await ws.db.runWithWriteTransaction([Stores.purchases], async tx => {
    const pr = await tx.get(Stores.purchases, proposalId);
    if (!pr) {
      return;
    }
    if (!pr.refundApplyRetryInfo) {
      return;
    }
    pr.refundApplyRetryInfo.retryCounter++;
    updateRetryInfoTimeout(pr.refundApplyRetryInfo);
    pr.lastRefundApplyError = err;
    await tx.put(Stores.purchases, pr);
  });
  ws.notify({ type: NotificationType.RefundApplyOperationError });
}

export async function getFullRefundFees(
  ws: InternalWalletState,
  refundPermissions: MerchantRefundPermission[],
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

export async function acceptRefundResponse(
  ws: InternalWalletState,
  proposalId: string,
  refundResponse: MerchantRefundResponse,
  reason: RefundReason,
): Promise<void> {
  const refundPermissions = refundResponse.refund_permissions;

  let numNewRefunds = 0;

  const refundGroupId = encodeCrock(randomBytes(32));

  await ws.db.runWithWriteTransaction([Stores.purchases], async tx => {
    const p = await tx.get(Stores.purchases, proposalId);
    if (!p) {
      console.error("purchase not found, not adding refunds");
      return;
    }

    if (!p.refundStatusRequested) {
      return;
    }

    for (const perm of refundPermissions) {
      const isDone = p.refundState.refundsDone[perm.merchant_sig];
      const isPending = p.refundState.refundsPending[perm.merchant_sig];
      if (!isDone && !isPending) {
        p.refundState.refundsPending[perm.merchant_sig] = {
          perm,
          refundGroupId,
        };
        numNewRefunds++;
      }
    }

    // Are we done with querying yet, or do we need to do another round
    // after a retry delay?
    let queryDone = true;

    if (numNewRefunds === 0) {
      if (
        p.autoRefundDeadline &&
        p.autoRefundDeadline.t_ms > getTimestampNow().t_ms
      ) {
        queryDone = false;
      }
    }

    if (queryDone) {
      p.timestampLastRefundStatus = getTimestampNow();
      p.lastRefundStatusError = undefined;
      p.refundStatusRetryInfo = initRetryInfo();
      p.refundStatusRequested = false;
      console.log("refund query done");
    } else {
      // No error, but we need to try again!
      p.timestampLastRefundStatus = getTimestampNow();
      p.refundStatusRetryInfo.retryCounter++;
      updateRetryInfoTimeout(p.refundStatusRetryInfo);
      p.lastRefundStatusError = undefined;
      console.log("refund query not done");
    }

    if (numNewRefunds > 0) {
      const now = getTimestampNow();
      p.lastRefundApplyError = undefined;
      p.refundApplyRetryInfo = initRetryInfo();
      p.refundState.refundGroups.push({
        timestampQueried: now,
        reason,
      });
    }

    await tx.put(Stores.purchases, p);
  });

  ws.notify({
    type: NotificationType.RefundQueried,
  });
  if (numNewRefunds > 0) {
    await processPurchaseApplyRefund(ws, proposalId);
  }
}

async function startRefundQuery(
  ws: InternalWalletState,
  proposalId: string,
): Promise<void> {
  const success = await ws.db.runWithWriteTransaction(
    [Stores.purchases],
    async tx => {
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
): Promise<string> {
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
    throw Error(`no purchase for the taler://refund/ URI (${talerRefundUri}) was found`);
  }

  console.log("processing purchase for refund");
  await startRefundQuery(ws, purchase.proposalId);

  return purchase.contractData.contractTermsHash;
}

export async function processPurchaseQueryRefund(
  ws: InternalWalletState,
  proposalId: string,
  forceNow: boolean = false,
): Promise<void> {
  const onOpErr = (e: OperationError) =>
    incrementPurchaseQueryRefundRetry(ws, proposalId, e);
  await guardOperationException(
    () => processPurchaseQueryRefundImpl(ws, proposalId, forceNow),
    onOpErr,
  );
}

async function resetPurchaseQueryRefundRetry(
  ws: InternalWalletState,
  proposalId: string,
) {
  await ws.db.mutate(Stores.purchases, proposalId, x => {
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

  const refundUrlObj = new URL(
    "refund",
    purchase.contractData.merchantBaseUrl,
  );
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

  const refundResponse = codecForMerchantRefundResponse().decode(await resp.json());
  await acceptRefundResponse(
    ws,
    proposalId,
    refundResponse,
    RefundReason.NormalRefund,
  );
}

export async function processPurchaseApplyRefund(
  ws: InternalWalletState,
  proposalId: string,
  forceNow: boolean = false,
): Promise<void> {
  const onOpErr = (e: OperationError) =>
    incrementPurchaseApplyRefundRetry(ws, proposalId, e);
  await guardOperationException(
    () => processPurchaseApplyRefundImpl(ws, proposalId, forceNow),
    onOpErr,
  );
}

async function resetPurchaseApplyRefundRetry(
  ws: InternalWalletState,
  proposalId: string,
) {
  await ws.db.mutate(Stores.purchases, proposalId, x => {
    if (x.refundApplyRetryInfo.active) {
      x.refundApplyRetryInfo = initRetryInfo();
    }
    return x;
  });
}

async function processPurchaseApplyRefundImpl(
  ws: InternalWalletState,
  proposalId: string,
  forceNow: boolean,
): Promise<void> {
  if (forceNow) {
    await resetPurchaseApplyRefundRetry(ws, proposalId);
  }
  const purchase = await ws.db.get(Stores.purchases, proposalId);
  if (!purchase) {
    console.error("not submitting refunds, payment not found:");
    return;
  }
  const pendingKeys = Object.keys(purchase.refundState.refundsPending);
  if (pendingKeys.length === 0) {
    console.log("no pending refunds");
    return;
  }

  const newRefundsDone: { [sig: string]: RefundInfo } = {};
  const newRefundsFailed: { [sig: string]: RefundInfo } = {};
  for (const pk of pendingKeys) {
    const info = purchase.refundState.refundsPending[pk];
    const perm = info.perm;
    const req: RefundRequest = {
      coin_pub: perm.coin_pub,
      h_contract_terms: purchase.contractData.contractTermsHash,
      merchant_pub: purchase.contractData.merchantPub,
      merchant_sig: perm.merchant_sig,
      refund_amount: perm.refund_amount,
      refund_fee: perm.refund_fee,
      rtransaction_id: perm.rtransaction_id,
    };
    console.log("sending refund permission", perm);
    // FIXME: not correct once we support multiple exchanges per payment
    const exchangeUrl = purchase.payReq.coins[0].exchange_url;
    const reqUrl = new URL(`coins/${perm.coin_pub}/refund`, exchangeUrl);
    const resp = await ws.http.postJson(reqUrl.href, req);
    console.log("sent refund permission");
    switch (resp.status) {
      case HttpResponseStatus.Ok:
        newRefundsDone[pk] = info;
        break;
      case HttpResponseStatus.Gone:
        // We're too late, refund is expired.
        newRefundsFailed[pk] = info;
        break;
      default:
        let body: string | null = null;
        try {
          body = await resp.json();
        } catch {}
        const m = "refund request (at exchange) failed";
        throw new OperationFailedError({
          message: m,
          type: "network",
          details: {
            body,
          },
        });
    }
  }
  let allRefundsProcessed = false;
  await ws.db.runWithWriteTransaction(
    [Stores.purchases, Stores.coins, Stores.refreshGroups, Stores.refundEvents],
    async tx => {
      const p = await tx.get(Stores.purchases, proposalId);
      if (!p) {
        return;
      }

      // Groups that failed/succeeded
      let groups: { [refundGroupId: string]: boolean } = {};

      // Avoid duplicates
      const refreshCoinsMap: { [coinPub: string]: CoinPublicKey } = {};

      const modCoin = async (perm: MerchantRefundPermission) => {
        const c = await tx.get(Stores.coins, perm.coin_pub);
        if (!c) {
          console.warn("coin not found, can't apply refund");
          return;
        }
        refreshCoinsMap[c.coinPub] = { coinPub: c.coinPub };
        logger.trace(`commiting refund ${perm.merchant_sig} to coin ${c.coinPub}`);
        logger.trace(`coin amount before is ${Amounts.toString(c.currentAmount)}`)
        logger.trace(`refund amount (via merchant) is ${perm.refund_amount}`);
        logger.trace(`refund fee (via merchant) is ${perm.refund_fee}`);
        const refundAmount = Amounts.parseOrThrow(perm.refund_amount);
        const refundFee = Amounts.parseOrThrow(perm.refund_fee);
        c.status = CoinStatus.Dormant;
        c.currentAmount = Amounts.add(c.currentAmount, refundAmount).amount;
        c.currentAmount = Amounts.sub(c.currentAmount, refundFee).amount;
        logger.trace(`coin amount after is ${Amounts.toString(c.currentAmount)}`)
        await tx.put(Stores.coins, c);
      };

      for (const pk of Object.keys(newRefundsFailed)) {
        if (p.refundState.refundsDone[pk]) {
          // We already processed this one.
          break;
        }
        const r = newRefundsFailed[pk];
        groups[r.refundGroupId] = true;
        delete p.refundState.refundsPending[pk];
        p.refundState.refundsFailed[pk] = r;
      }

      for (const pk of Object.keys(newRefundsDone)) {
        if (p.refundState.refundsDone[pk]) {
          // We already processed this one.
          break;
        }
        const r = newRefundsDone[pk];
        groups[r.refundGroupId] = true;
        delete p.refundState.refundsPending[pk];
        p.refundState.refundsDone[pk] = r;
        await modCoin(r.perm);
      }

      const now = getTimestampNow();
      for (const g of Object.keys(groups)) {
        let groupDone = true;
        for (const pk of Object.keys(p.refundState.refundsPending)) {
          const r  = p.refundState.refundsPending[pk];
          if (r.refundGroupId == g) {
            groupDone = false;
          }
        }
        if (groupDone) {
          const refundEvent: RefundEventRecord = {
            proposalId,
            refundGroupId: g,
            timestamp: now,
          }
          await tx.put(Stores.refundEvents, refundEvent);
        }
      }

      if (Object.keys(p.refundState.refundsPending).length === 0) {
        p.refundStatusRetryInfo = initRetryInfo();
        p.lastRefundStatusError = undefined;
        allRefundsProcessed = true;
      }
      await tx.put(Stores.purchases, p);
      const coinsPubsToBeRefreshed = Object.values(refreshCoinsMap);
      if (coinsPubsToBeRefreshed.length > 0)
      {
        await createRefreshGroup(
          tx,
          coinsPubsToBeRefreshed,
          RefreshReason.Refund,
        );
      }
    },
  );
  if (allRefundsProcessed) {
    ws.notify({
      type: NotificationType.RefundFinished,
    });
  }

  ws.notify({
    type: NotificationType.RefundsSubmitted,
    proposalId,
  });
}
