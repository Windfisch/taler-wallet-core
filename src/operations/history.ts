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
import { Database } from "../util/query";
import { InternalWalletState } from "./state";
import { Stores, TipRecord } from "../types/dbTypes";
import * as Amounts from "../util/amounts";
import { AmountJson } from "../util/amounts";
import { HistoryQuery, HistoryEvent } from "../types/history";

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

  await ws.db.runWithReadTransaction(
    [
      Stores.currencies,
      Stores.coins,
      Stores.denominations,
      Stores.exchanges,
      Stores.proposals,
      Stores.purchases,
      Stores.refresh,
      Stores.reserves,
      Stores.tips,
      Stores.withdrawalSession,
    ],
    async tx => {
      await tx.iter(Stores.proposals).forEach(p => {
        history.push({
          detail: {},
          timestamp: p.timestamp,
          type: "claim-order",
          explicit: false,
        });
      });

      await tx.iter(Stores.withdrawalSession).forEach(w => {
        history.push({
          detail: {
            withdrawalAmount: w.rawWithdrawalAmount,
          },
          timestamp: w.startTimestamp,
          type: "withdraw-started",
          explicit: false,
        });
        if (w.finishTimestamp) {
          history.push({
            detail: {
              withdrawalAmount: w.rawWithdrawalAmount,
            },
            timestamp: w.finishTimestamp,
            type: "withdraw-finished",
            explicit: false,
          });
        }
      });

      await tx.iter(Stores.purchases).forEach(p => {
        history.push({
          detail: {
            amount: p.contractTerms.amount,
            contractTermsHash: p.contractTermsHash,
            fulfillmentUrl: p.contractTerms.fulfillment_url,
            merchantName: p.contractTerms.merchant.name,
          },
          timestamp: p.acceptTimestamp,
          type: "pay-started",
          explicit: false,
        });
        if (p.firstSuccessfulPayTimestamp) {
          history.push({
            detail: {
              amount: p.contractTerms.amount,
              contractTermsHash: p.contractTermsHash,
              fulfillmentUrl: p.contractTerms.fulfillment_url,
              merchantName: p.contractTerms.merchant.name,
            },
            timestamp: p.firstSuccessfulPayTimestamp,
            type: "pay-finished",
            explicit: false,
          });
        }
        if (p.lastRefundStatusTimestamp) {
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
            timestamp: p.lastRefundStatusTimestamp,
            type: "refund",
            explicit: false,
          });
        }
      });

      await tx.iter(Stores.reserves).forEach(r => {
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
      });

      await tx.iter(Stores.tips).forEach(tip => {
        history.push({
          detail: {
            accepted: tip.accepted,
            amount: tip.amount,
            merchantBaseUrl: tip.merchantBaseUrl,
            tipId: tip.merchantTipId,
          },
          timestamp: tip.createdTimestamp,
          explicit: false,
          type: "tip",
        });
      });

      await tx.iter(Stores.exchanges).forEach(exchange => {
        history.push({
          type: "exchange-added",
          explicit: false,
          timestamp: exchange.timestampAdded,
          detail: {
            exchangeBaseUrl: exchange.baseUrl,
          },
        });
      });

      await tx.iter(Stores.refresh).forEach((r) => {
        history.push({
          type: "refresh-started",
          explicit: false,
          timestamp: r.created,
          detail: {
            refreshSessionId: r.refreshSessionId,
          },
        });
        if (r.finishedTimestamp) {
          history.push({
            type: "refresh-finished",
            explicit: false,
            timestamp: r.finishedTimestamp,
            detail: {
              refreshSessionId: r.refreshSessionId,
            },
          });
        }

      });
    },
  );

  history.sort((h1, h2) => Math.sign(h1.timestamp.t_ms - h2.timestamp.t_ms));

  return { history };
}
