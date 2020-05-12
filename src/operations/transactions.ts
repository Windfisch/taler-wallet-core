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
import { Stores, ProposalRecord, ReserveRecordStatus } from "../types/dbTypes";
import { Amounts } from "../util/amounts";
import { timestampCmp } from "../util/time";
import {
  TransactionsRequest,
  TransactionsResponse,
  Transaction,
  TransactionType,
} from "../types/transactions";
import { OrderShortInfo } from "../types/history";

/**
 * Create an event ID from the type and the primary key for the event.
 */
function makeEventId(type: TransactionType, ...args: string[]): string {
  return type + ";" + args.map((x) => encodeURIComponent(x)).join(";");
}

function getOrderShortInfo(
  proposal: ProposalRecord,
): OrderShortInfo | undefined {
  const download = proposal.download;
  if (!download) {
    return undefined;
  }
  return {
    amount: Amounts.stringify(download.contractData.amount),
    fulfillmentUrl: download.contractData.fulfillmentUrl,
    orderId: download.contractData.orderId,
    merchantBaseUrl: download.contractData.merchantBaseUrl,
    proposalId: proposal.proposalId,
    summary: download.contractData.summary,
  };
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
        if (wsr.timestampFinish) {
          transactions.push({
            type: TransactionType.Withdrawal,
            amountEffective: Amounts.stringify(wsr.denomsSel.totalWithdrawCost),
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
    },
  );

  transactions.sort((h1, h2) => timestampCmp(h1.timestamp, h2.timestamp));

  return { transactions };
}
