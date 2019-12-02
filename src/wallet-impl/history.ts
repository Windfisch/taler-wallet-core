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

 /**
  * Imports.
  */
import { HistoryQuery, HistoryEvent } from "../walletTypes";
import { oneShotIter } from "../util/query";
import { InternalWalletState } from "./state";
import { Stores, TipRecord } from "../dbTypes";
import * as Amounts from "../util/amounts";
import { AmountJson } from "../util/amounts";

/**
 * Retrive the full event history for this wallet.
 */
export async function getHistory(
  ws: InternalWalletState,
  historyQuery?: HistoryQuery,
): Promise<{ history: HistoryEvent[] }> {
  const history: HistoryEvent[] = [];

  // FIXME: do pagination instead of generating the full history

  // We uniquely identify history rows via their timestamp.
  // This works as timestamps are guaranteed to be monotonically
  // increasing even

  /*
  const proposals = await oneShotIter(ws.db, Stores.proposals).toArray();
  for (const p of proposals) {
    history.push({
      detail: {
        contractTermsHash: p.contractTermsHash,
        merchantName: p.contractTerms.merchant.name,
      },
      timestamp: p.timestamp,
      type: "claim-order",
      explicit: false,
    });
  }
  */

  const withdrawals = await oneShotIter(
    ws.db,
    Stores.withdrawalSession,
  ).toArray();
  for (const w of withdrawals) {
    history.push({
      detail: {
        withdrawalAmount: w.withdrawalAmount,
      },
      timestamp: w.startTimestamp,
      type: "withdraw",
      explicit: false,
    });
  }

  const purchases = await oneShotIter(ws.db, Stores.purchases).toArray();
  for (const p of purchases) {
    history.push({
      detail: {
        amount: p.contractTerms.amount,
        contractTermsHash: p.contractTermsHash,
        fulfillmentUrl: p.contractTerms.fulfillment_url,
        merchantName: p.contractTerms.merchant.name,
      },
      timestamp: p.timestamp,
      type: "pay",
      explicit: false,
    });
    if (p.timestamp_refund) {
      const contractAmount = Amounts.parseOrThrow(p.contractTerms.amount);
      const amountsPending = Object.keys(p.refundsPending).map(x =>
        Amounts.parseOrThrow(p.refundsPending[x].refund_amount),
      );
      const amountsDone = Object.keys(p.refundsDone).map(x =>
        Amounts.parseOrThrow(p.refundsDone[x].refund_amount),
      );
      const amounts: AmountJson[] = amountsPending.concat(amountsDone);
      const amount = Amounts.add(
        Amounts.getZero(contractAmount.currency),
        ...amounts,
      ).amount;

      history.push({
        detail: {
          contractTermsHash: p.contractTermsHash,
          fulfillmentUrl: p.contractTerms.fulfillment_url,
          merchantName: p.contractTerms.merchant.name,
          refundAmount: amount,
        },
        timestamp: p.timestamp_refund,
        type: "refund",
        explicit: false,
      });
    }
  }

  const reserves = await oneShotIter(ws.db, Stores.reserves).toArray();

  for (const r of reserves) {
    const reserveType = r.bankWithdrawStatusUrl ? "taler-bank" : "manual";
    history.push({
      detail: {
        exchangeBaseUrl: r.exchangeBaseUrl,
        requestedAmount: Amounts.toString(r.initiallyRequestedAmount),
        reservePub: r.reservePub,
        reserveType,
        bankWithdrawStatusUrl: r.bankWithdrawStatusUrl,
      },
      timestamp: r.created,
      type: "reserve-created",
      explicit: false,
    });
    if (r.timestampConfirmed) {
      history.push({
        detail: {
          exchangeBaseUrl: r.exchangeBaseUrl,
          requestedAmount: Amounts.toString(r.initiallyRequestedAmount),
          reservePub: r.reservePub,
          reserveType,
          bankWithdrawStatusUrl: r.bankWithdrawStatusUrl,
        },
        timestamp: r.created,
        type: "reserve-confirmed",
        explicit: false,
      });
    }
  }

  const tips: TipRecord[] = await oneShotIter(ws.db, Stores.tips).toArray();
  for (const tip of tips) {
    history.push({
      detail: {
        accepted: tip.accepted,
        amount: tip.amount,
        merchantBaseUrl: tip.merchantBaseUrl,
        tipId: tip.merchantTipId,
      },
      timestamp: tip.timestamp,
      explicit: false,
      type: "tip",
    });
  }

  await oneShotIter(ws.db, Stores.exchanges).forEach(exchange => {
    history.push({
      type: "exchange-added",
      explicit: false,
      timestamp: exchange.timestampAdded,
      detail: {
        exchangeBaseUrl: exchange.baseUrl,
      },
    });
  });

  history.sort((h1, h2) => Math.sign(h1.timestamp.t_ms - h2.timestamp.t_ms));

  return { history };
}
