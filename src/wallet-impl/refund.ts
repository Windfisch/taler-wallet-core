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
  MerchantRefundResponse,
  RefundRequest,
  MerchantRefundPermission,
} from "../talerTypes";
import { PurchaseRecord, Stores, CoinRecord, CoinStatus } from "../dbTypes";
import { getTimestampNow } from "../walletTypes";
import {
  oneShotMutate,
  oneShotGet,
  runWithWriteTransaction,
  oneShotIterIndex,
} from "../util/query";
import { InternalWalletState } from "./state";
import { parseRefundUri } from "../util/taleruri";
import { Logger } from "../util/logging";
import { AmountJson } from "../util/amounts";
import * as Amounts from "../util/amounts";
import { getTotalRefreshCost, refresh } from "./refresh";

const logger = new Logger("refund.ts");

export async function getFullRefundFees(
  ws: InternalWalletState,
  refundPermissions: MerchantRefundPermission[],
): Promise<AmountJson> {
  if (refundPermissions.length === 0) {
    throw Error("no refunds given");
  }
  const coin0 = await oneShotGet(
    ws.db,
    Stores.coins,
    refundPermissions[0].coin_pub,
  );
  if (!coin0) {
    throw Error("coin not found");
  }
  let feeAcc = Amounts.getZero(
    Amounts.parseOrThrow(refundPermissions[0].refund_amount).currency,
  );

  const denoms = await oneShotIterIndex(
    ws.db,
    Stores.denominations.exchangeBaseUrlIndex,
    coin0.exchangeBaseUrl,
  ).toArray();

  for (const rp of refundPermissions) {
    const coin = await oneShotGet(ws.db, Stores.coins, rp.coin_pub);
    if (!coin) {
      throw Error("coin not found");
    }
    const denom = await oneShotGet(ws.db, Stores.denominations, [
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

async function submitRefunds(
  ws: InternalWalletState,
  proposalId: string,
): Promise<void> {
  const purchase = await oneShotGet(ws.db, Stores.purchases, proposalId);
  if (!purchase) {
    console.error(
      "not submitting refunds, payment not found:",
    );
    return;
  }
  const pendingKeys = Object.keys(purchase.refundsPending);
  if (pendingKeys.length === 0) {
    return;
  }
  for (const pk of pendingKeys) {
    const perm = purchase.refundsPending[pk];
    const req: RefundRequest = {
      coin_pub: perm.coin_pub,
      h_contract_terms: purchase.contractTermsHash,
      merchant_pub: purchase.contractTerms.merchant_pub,
      merchant_sig: perm.merchant_sig,
      refund_amount: perm.refund_amount,
      refund_fee: perm.refund_fee,
      rtransaction_id: perm.rtransaction_id,
    };
    console.log("sending refund permission", perm);
    // FIXME: not correct once we support multiple exchanges per payment
    const exchangeUrl = purchase.payReq.coins[0].exchange_url;
    const reqUrl = new URL("refund", exchangeUrl);
    const resp = await ws.http.postJson(reqUrl.href, req);
    if (resp.status !== 200) {
      console.error("refund failed", resp);
      continue;
    }

    // Transactionally mark successful refunds as done
    const transformPurchase = (
      t: PurchaseRecord | undefined,
    ): PurchaseRecord | undefined => {
      if (!t) {
        console.warn("purchase not found, not updating refund");
        return;
      }
      if (t.refundsPending[pk]) {
        t.refundsDone[pk] = t.refundsPending[pk];
        delete t.refundsPending[pk];
      }
      return t;
    };
    const transformCoin = (
      c: CoinRecord | undefined,
    ): CoinRecord | undefined => {
      if (!c) {
        console.warn("coin not found, can't apply refund");
        return;
      }
      const refundAmount = Amounts.parseOrThrow(perm.refund_amount);
      const refundFee = Amounts.parseOrThrow(perm.refund_fee);
      c.status = CoinStatus.Dirty;
      c.currentAmount = Amounts.add(c.currentAmount, refundAmount).amount;
      c.currentAmount = Amounts.sub(c.currentAmount, refundFee).amount;

      return c;
    };

    await runWithWriteTransaction(
      ws.db,
      [Stores.purchases, Stores.coins],
      async tx => {
        await tx.mutate(Stores.purchases, proposalId, transformPurchase);
        await tx.mutate(Stores.coins, perm.coin_pub, transformCoin);
      },
    );
    refresh(ws, perm.coin_pub);
  }

  ws.badge.showNotification();
  ws.notifier.notify();
}

export async function acceptRefundResponse(
  ws: InternalWalletState,
  refundResponse: MerchantRefundResponse,
): Promise<string> {
  const refundPermissions = refundResponse.refund_permissions;

  if (!refundPermissions.length) {
    console.warn("got empty refund list");
    throw Error("empty refund");
  }

  /**
   * Add refund to purchase if not already added.
   */
  function f(t: PurchaseRecord | undefined): PurchaseRecord | undefined {
    if (!t) {
      console.error("purchase not found, not adding refunds");
      return;
    }

    t.timestamp_refund = getTimestampNow();

    for (const perm of refundPermissions) {
      if (
        !t.refundsPending[perm.merchant_sig] &&
        !t.refundsDone[perm.merchant_sig]
      ) {
        t.refundsPending[perm.merchant_sig] = perm;
      }
    }
    return t;
  }

  const hc = refundResponse.h_contract_terms;

  // Add the refund permissions to the purchase within a DB transaction
  await oneShotMutate(ws.db, Stores.purchases, hc, f);
  ws.notifier.notify();

  await submitRefunds(ws, hc);

  return hc;
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

  if (!parseResult) {
    throw Error("invalid refund URI");
  }

  const refundUrl = parseResult.refundUrl;

  logger.trace("processing refund");
  let resp;
  try {
    resp = await ws.http.get(refundUrl);
  } catch (e) {
    console.error("error downloading refund permission", e);
    throw e;
  }

  const refundResponse = MerchantRefundResponse.checked(resp.responseJson);
  return acceptRefundResponse(ws, refundResponse);
}
