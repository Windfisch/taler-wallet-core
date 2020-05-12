/*
 This file is part of GNU Taler
 (C) 2019 Taler Systems S.A.

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
import { InternalWalletState } from "./state";
import { Stores, ReserveRecordStatus, PurchaseRecord } from "../types/dbTypes";
import { Amounts, AmountJson } from "../util/amounts";
import { timestampCmp } from "../util/time";
import {
  TransactionsRequest,
  TransactionsResponse,
  Transaction,
  TransactionType,
} from "../types/transactions";
import { getTotalPaymentCost } from "./pay";

/**
 * Create an event ID from the type and the primary key for the event.
 */
function makeEventId(type: TransactionType, ...args: string[]): string {
  return type + ";" + args.map((x) => encodeURIComponent(x)).join(";");
}


interface RefundStats {
  amountInvalid: AmountJson;
  amountEffective: AmountJson;
  amountRaw: AmountJson;
}

function getRefundStats(pr: PurchaseRecord, refundGroupId: string): RefundStats {
  let amountEffective = Amounts.getZero(pr.contractData.amount.currency);
  let amountInvalid = Amounts.getZero(pr.contractData.amount.currency);
  let amountRaw = Amounts.getZero(pr.contractData.amount.currency);

  for (const rk of Object.keys(pr.refundsDone)) {
    const perm = pr.refundsDone[rk].perm;
    if (pr.refundsDone[rk].refundGroupId !== refundGroupId) {
      continue;
    }
    amountEffective = Amounts.add(amountEffective, Amounts.parseOrThrow(perm.refund_amount)).amount;
    amountRaw = Amounts.add(amountRaw, Amounts.parseOrThrow(perm.refund_amount)).amount;
  }

  for (const rk of Object.keys(pr.refundsDone)) {
    const perm = pr.refundsDone[rk].perm;
    if (pr.refundsDone[rk].refundGroupId !== refundGroupId) {
      continue;
    }
    amountEffective = Amounts.sub(amountEffective, Amounts.parseOrThrow(perm.refund_fee)).amount;
  }

  for (const rk of Object.keys(pr.refundsFailed)) {
    const perm = pr.refundsDone[rk].perm;
    if (pr.refundsDone[rk].refundGroupId !== refundGroupId) {
      continue;
    }
    amountInvalid = Amounts.add(amountInvalid, Amounts.parseOrThrow(perm.refund_fee)).amount;
  }

  return {
    amountEffective,
    amountInvalid,
    amountRaw,
  }

}

/**
 * Retrive the full event history for this wallet.
 */
export async function getTransactions(
  ws: InternalWalletState,
  transactionsRequest?: TransactionsRequest,
): Promise<TransactionsResponse> {
  const transactions: Transaction[] = [];

  await ws.db.runWithReadTransaction(
    [
      Stores.currencies,
      Stores.coins,
      Stores.denominations,
      Stores.proposals,
      Stores.purchases,
      Stores.refreshGroups,
      Stores.reserves,
      Stores.reserveHistory,
      Stores.tips,
      Stores.withdrawalGroups,
      Stores.payEvents,
      Stores.planchets,
      Stores.refundEvents,
      Stores.reserveUpdatedEvents,
      Stores.recoupGroups,
    ],
    async (tx) => {
      tx.iter(Stores.withdrawalGroups).forEach((wsr) => {
        if (
          transactionsRequest?.currency &&
          wsr.rawWithdrawalAmount.currency != transactionsRequest.currency
        ) {
          return;
        }
        if (wsr.rawWithdrawalAmount.currency)
          if (wsr.timestampFinish) {
            transactions.push({
              type: TransactionType.Withdrawal,
              amountEffective: Amounts.stringify(
                wsr.denomsSel.totalWithdrawCost,
              ),
              amountRaw: Amounts.stringify(wsr.denomsSel.totalCoinValue),
              confirmed: true,
              exchangeBaseUrl: wsr.exchangeBaseUrl,
              pending: !wsr.timestampFinish,
              timestamp: wsr.timestampStart,
              transactionId: makeEventId(
                TransactionType.Withdrawal,
                wsr.withdrawalGroupId,
              ),
            });
          }
      });

      tx.iter(Stores.reserves).forEach((r) => {
        if (
          transactionsRequest?.currency &&
          r.currency != transactionsRequest.currency
        ) {
          return;
        }
        if (r.reserveStatus !== ReserveRecordStatus.WAIT_CONFIRM_BANK) {
          return;
        }
        if (!r.bankInfo) {
          return;
        }
        transactions.push({
          type: TransactionType.Withdrawal,
          confirmed: false,
          amountRaw: Amounts.stringify(r.bankInfo.amount),
          amountEffective: undefined,
          exchangeBaseUrl: undefined,
          pending: true,
          timestamp: r.timestampCreated,
          bankConfirmationUrl: r.bankInfo.confirmUrl,
          transactionId: makeEventId(
            TransactionType.Withdrawal,
            r.bankInfo.bankWithdrawalGroupId,
          ),
        });
      });

      tx.iter(Stores.purchases).forEachAsync(async (pr) => {
        if (
          transactionsRequest?.currency &&
          pr.contractData.amount.currency != transactionsRequest.currency
        ) {
          return;
        }
        const proposal = await tx.get(Stores.proposals, pr.proposalId);
        if (!proposal) {
          return;
        }
        const cost = await getTotalPaymentCost(ws, pr.payCoinSelection);
        transactions.push({
          type: TransactionType.Payment,
          amountRaw: Amounts.stringify(pr.contractData.amount),
          amountEffective: Amounts.stringify(cost.totalCost),
          failed: false,
          pending: !pr.timestampFirstSuccessfulPay,
          timestamp: pr.timestampAccept,
          transactionId: makeEventId(TransactionType.Payment, pr.proposalId),
          info: {
            fulfillmentUrl: pr.contractData.fulfillmentUrl,
            merchant: {},
            orderId: pr.contractData.orderId,
            products: [],
            summary: pr.contractData.summary,
            summary_i18n: {},
          },
        });

        for (const rg of pr.refundGroups) {
          const pending = Object.keys(pr.refundsDone).length > 0;

          const stats = getRefundStats(pr, rg.refundGroupId);
          
          transactions.push({
            type: TransactionType.Refund,
            pending,
            info: {
              fulfillmentUrl: pr.contractData.fulfillmentUrl,
              merchant: {},
              orderId: pr.contractData.orderId,
              products: [],
              summary: pr.contractData.summary,
              summary_i18n: {},
            },
            timestamp: rg.timestampQueried,
            transactionId: makeEventId(TransactionType.Refund, `{rg.timestampQueried.t_ms}`),
            refundedTransactionId: makeEventId(TransactionType.Payment, pr.proposalId),
            amountEffective: Amounts.stringify(stats.amountEffective),
            amountInvalid: Amounts.stringify(stats.amountInvalid),
            amountRaw: Amounts.stringify(stats.amountRaw),

          });
        }
      });
    },
  );

  transactions.sort((h1, h2) => timestampCmp(h1.timestamp, h2.timestamp));

  return { transactions };
}
