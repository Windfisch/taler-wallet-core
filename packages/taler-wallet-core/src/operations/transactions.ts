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
import { Stores, WithdrawalSourceType } from "../types/dbTypes";
import { Amounts, AmountJson } from "../util/amounts";
import { timestampCmp } from "../util/time";
import {
  TransactionsRequest,
  TransactionsResponse,
  Transaction,
  TransactionType,
  PaymentStatus,
  WithdrawalType,
  WithdrawalDetails,
} from "../types/transactions";
import { getFundingPaytoUris } from "./reserves";

/**
 * Create an event ID from the type and the primary key for the event.
 */
function makeEventId(type: TransactionType, ...args: string[]): string {
  return type + ";" + args.map((x) => encodeURIComponent(x)).join(";");
}

function shouldSkipCurrency(
  transactionsRequest: TransactionsRequest | undefined,
  currency: string,
): boolean {
  if (!transactionsRequest?.currency) {
    return false;
  }
  return transactionsRequest.currency.toLowerCase() !== currency.toLowerCase();
}

function shouldSkipSearch(
  transactionsRequest: TransactionsRequest | undefined,
  fields: string[],
): boolean {
  if (!transactionsRequest?.search) {
    return false;
  }
  const needle = transactionsRequest.search.trim();
  for (const f of fields) {
    if (f.indexOf(needle) >= 0) {
      return false;
    }
  }
  return true;
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
      Stores.exchanges,
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
    // Report withdrawals that are currently in progress.
    async (tx) => {
      tx.iter(Stores.withdrawalGroups).forEachAsync(async (wsr) => {
        if (
          shouldSkipCurrency(
            transactionsRequest,
            wsr.rawWithdrawalAmount.currency,
          )
        ) {
          return;
        }

        if (shouldSkipSearch(transactionsRequest, [])) {
          return;
        }

        switch (wsr.source.type) {
          case WithdrawalSourceType.Reserve:
            {
              const r = await tx.get(Stores.reserves, wsr.source.reservePub);
              if (!r) {
                break;
              }
              let amountRaw: AmountJson | undefined = undefined;
              if (wsr.withdrawalGroupId === r.initialWithdrawalGroupId) {
                amountRaw = r.instructedAmount;
              } else {
                amountRaw = wsr.denomsSel.totalWithdrawCost;
              }
              let withdrawalDetails: WithdrawalDetails;
              if (r.bankInfo) {
                withdrawalDetails = {
                  type: WithdrawalType.TalerBankIntegrationApi,
                  confirmed: true,
                  bankConfirmationUrl: r.bankInfo.confirmUrl,
                };
              } else {
                const exchange = await tx.get(
                  Stores.exchanges,
                  r.exchangeBaseUrl,
                );
                if (!exchange) {
                  // FIXME: report somehow
                  break;
                }
                withdrawalDetails = {
                  type: WithdrawalType.ManualTransfer,
                  exchangePaytoUris:
                    exchange.wireInfo?.accounts.map((x) => x.payto_uri) ?? [],
                };
              }
              transactions.push({
                type: TransactionType.Withdrawal,
                amountEffective: Amounts.stringify(
                  wsr.denomsSel.totalCoinValue,
                ),
                amountRaw: Amounts.stringify(amountRaw),
                withdrawalDetails,
                exchangeBaseUrl: wsr.exchangeBaseUrl,
                pending: !wsr.timestampFinish,
                timestamp: wsr.timestampStart,
                transactionId: makeEventId(
                  TransactionType.Withdrawal,
                  wsr.withdrawalGroupId,
                ),
              });
            }
            break;
          default:
            // Tips are reported via their own event
            break;
        }
      });

      // Report pending withdrawals based on reserves that
      // were created, but where the actual withdrawal group has
      // not started yet.
      tx.iter(Stores.reserves).forEachAsync(async (r) => {
        if (shouldSkipCurrency(transactionsRequest, r.currency)) {
          return;
        }
        if (shouldSkipSearch(transactionsRequest, [])) {
          return;
        }
        if (r.initialWithdrawalStarted) {
          return;
        }
        let withdrawalDetails: WithdrawalDetails;
        if (r.bankInfo) {
          withdrawalDetails = {
            type: WithdrawalType.TalerBankIntegrationApi,
            confirmed: false,
            bankConfirmationUrl: r.bankInfo.confirmUrl,
          };
        } else {
          withdrawalDetails = {
            type: WithdrawalType.ManualTransfer,
            exchangePaytoUris: await getFundingPaytoUris(tx, r.reservePub),
          };
        }
        transactions.push({
          type: TransactionType.Withdrawal,
          amountRaw: Amounts.stringify(r.instructedAmount),
          amountEffective: Amounts.stringify(r.initialDenomSel.totalCoinValue),
          exchangeBaseUrl: r.exchangeBaseUrl,
          pending: true,
          timestamp: r.timestampCreated,
          withdrawalDetails: withdrawalDetails,
          transactionId: makeEventId(
            TransactionType.Withdrawal,
            r.initialWithdrawalGroupId,
          ),
        });
      });

      tx.iter(Stores.purchases).forEachAsync(async (pr) => {
        if (
          shouldSkipCurrency(
            transactionsRequest,
            pr.contractData.amount.currency,
          )
        ) {
          return;
        }
        if (shouldSkipSearch(transactionsRequest, [pr.contractData.summary])) {
          return;
        }
        const proposal = await tx.get(Stores.proposals, pr.proposalId);
        if (!proposal) {
          return;
        }
        transactions.push({
          type: TransactionType.Payment,
          amountRaw: Amounts.stringify(pr.contractData.amount),
          amountEffective: Amounts.stringify(pr.payCostInfo.totalCost),
          status: pr.timestampFirstSuccessfulPay
            ? PaymentStatus.Paid
            : PaymentStatus.Accepted,
          pending: !pr.timestampFirstSuccessfulPay,
          timestamp: pr.timestampAccept,
          transactionId: makeEventId(TransactionType.Payment, pr.proposalId),
          info: {
            fulfillmentUrl: pr.contractData.fulfillmentUrl,
            merchant: pr.contractData.merchant,
            orderId: pr.contractData.orderId,
            products: pr.contractData.products,
            summary: pr.contractData.summary,
            summary_i18n: pr.contractData.summaryI18n,
          },
        });

        // for (const rg of pr.refundGroups) {
        //   const pending = Object.keys(pr.refundsPending).length > 0;
        //   const stats = getRefundStats(pr, rg.refundGroupId);

        //   transactions.push({
        //     type: TransactionType.Refund,
        //     pending,
        //     info: {
        //       fulfillmentUrl: pr.contractData.fulfillmentUrl,
        //       merchant: pr.contractData.merchant,
        //       orderId: pr.contractData.orderId,
        //       products: pr.contractData.products,
        //       summary: pr.contractData.summary,
        //       summary_i18n: pr.contractData.summaryI18n,
        //     },
        //     timestamp: rg.timestampQueried,
        //     transactionId: makeEventId(
        //       TransactionType.Refund,
        //       pr.proposalId,
        //       `${rg.timestampQueried.t_ms}`,
        //     ),
        //     refundedTransactionId: makeEventId(
        //       TransactionType.Payment,
        //       pr.proposalId,
        //     ),
        //     amountEffective: Amounts.stringify(stats.amountEffective),
        //     amountInvalid: Amounts.stringify(stats.amountInvalid),
        //     amountRaw: Amounts.stringify(stats.amountRaw),
        //   });
        // }
      });
    },
  );

  const txPending = transactions.filter((x) => x.pending);
  const txNotPending = transactions.filter((x) => !x.pending);

  txPending.sort((h1, h2) => timestampCmp(h1.timestamp, h2.timestamp));
  txNotPending.sort((h1, h2) => timestampCmp(h1.timestamp, h2.timestamp));

  return { transactions: [...txPending, ...txNotPending] };
}