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
import {
  Stores,
  WalletRefundItem,
  RefundState,
  ReserveRecordStatus,
  AbortStatus,
  ReserveRecord,
} from "../db.js";
import { AmountJson, Amounts, timestampCmp } from "@gnu-taler/taler-util";
import {
  TransactionsRequest,
  TransactionsResponse,
  Transaction,
  TransactionType,
  PaymentStatus,
  WithdrawalType,
  WithdrawalDetails,
  OrderShortInfo,
} from "@gnu-taler/taler-util";
import { getFundingPaytoUris } from "./reserves";

/**
 * Create an event ID from the type and the primary key for the event.
 */
export function makeEventId(
  type: TransactionType | TombstoneTag,
  ...args: string[]
): string {
  return type + ":" + args.map((x) => encodeURIComponent(x)).join(":");
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
 * Retrieve the full event history for this wallet.
 */
export async function getTransactions(
  ws: InternalWalletState,
  transactionsRequest?: TransactionsRequest,
): Promise<TransactionsResponse> {
  const transactions: Transaction[] = [];

  await ws.db.runWithReadTransaction(
    [
      Stores.coins,
      Stores.denominations,
      Stores.exchanges,
      Stores.proposals,
      Stores.purchases,
      Stores.refreshGroups,
      Stores.reserves,
      Stores.tips,
      Stores.withdrawalGroups,
      Stores.planchets,
      Stores.recoupGroups,
      Stores.depositGroups,
      Stores.tombstones,
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

        const r = await tx.get(Stores.reserves, wsr.reservePub);
        if (!r) {
          return;
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
          const exchange = await tx.get(Stores.exchanges, r.exchangeBaseUrl);
          if (!exchange) {
            // FIXME: report somehow
            return;
          }
          withdrawalDetails = {
            type: WithdrawalType.ManualTransfer,
            exchangePaytoUris:
              exchange.wireInfo?.accounts.map((x) => x.payto_uri) ?? [],
          };
        }
        transactions.push({
          type: TransactionType.Withdrawal,
          amountEffective: Amounts.stringify(wsr.denomsSel.totalCoinValue),
          amountRaw: Amounts.stringify(amountRaw),
          withdrawalDetails,
          exchangeBaseUrl: wsr.exchangeBaseUrl,
          pending: !wsr.timestampFinish,
          timestamp: wsr.timestampStart,
          transactionId: makeEventId(
            TransactionType.Withdrawal,
            wsr.withdrawalGroupId,
          ),
          ...(wsr.lastError ? { error: wsr.lastError } : {}),
        });
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
        if (r.reserveStatus === ReserveRecordStatus.BANK_ABORTED) {
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
          ...(r.lastError ? { error: r.lastError } : {}),
        });
      });

      tx.iter(Stores.depositGroups).forEachAsync(async (dg) => {
        const amount = Amounts.parseOrThrow(dg.contractTermsRaw.amount);
        if (shouldSkipCurrency(transactionsRequest, amount.currency)) {
          return;
        }

        transactions.push({
          type: TransactionType.Deposit,
          amountRaw: Amounts.stringify(dg.effectiveDepositAmount),
          amountEffective: Amounts.stringify(dg.totalPayCost),
          pending: !dg.timestampFinished,
          timestamp: dg.timestampCreated,
          targetPaytoUri: dg.wire.payto_uri,
          transactionId: makeEventId(
            TransactionType.Deposit,
            dg.depositGroupId,
          ),
          depositGroupId: dg.depositGroupId,
          ...(dg.lastError ? { error: dg.lastError } : {}),
        });
      });

      tx.iter(Stores.purchases).forEachAsync(async (pr) => {
        if (
          shouldSkipCurrency(
            transactionsRequest,
            pr.download.contractData.amount.currency,
          )
        ) {
          return;
        }
        const contractData = pr.download.contractData;
        if (shouldSkipSearch(transactionsRequest, [contractData.summary])) {
          return;
        }
        const proposal = await tx.get(Stores.proposals, pr.proposalId);
        if (!proposal) {
          return;
        }
        const info: OrderShortInfo = {
          merchant: contractData.merchant,
          orderId: contractData.orderId,
          products: contractData.products,
          summary: contractData.summary,
          summary_i18n: contractData.summaryI18n,
          contractTermsHash: contractData.contractTermsHash,
        };
        if (contractData.fulfillmentUrl !== "") {
          info.fulfillmentUrl = contractData.fulfillmentUrl;
        }
        const paymentTransactionId = makeEventId(
          TransactionType.Payment,
          pr.proposalId,
        );
        const err = pr.lastPayError ?? pr.lastRefundStatusError;
        transactions.push({
          type: TransactionType.Payment,
          amountRaw: Amounts.stringify(contractData.amount),
          amountEffective: Amounts.stringify(pr.totalPayCost),
          status: pr.timestampFirstSuccessfulPay
            ? PaymentStatus.Paid
            : PaymentStatus.Accepted,
          pending:
            !pr.timestampFirstSuccessfulPay &&
            pr.abortStatus === AbortStatus.None,
          timestamp: pr.timestampAccept,
          transactionId: paymentTransactionId,
          proposalId: pr.proposalId,
          info: info,
          ...(err ? { error: err } : {}),
        });

        const refundGroupKeys = new Set<string>();

        for (const rk of Object.keys(pr.refunds)) {
          const refund = pr.refunds[rk];
          const groupKey = `${refund.executionTime.t_ms}`;
          refundGroupKeys.add(groupKey);
        }

        for (const groupKey of refundGroupKeys.values()) {
          const refundTombstoneId = makeEventId(
            TombstoneTag.DeleteRefund,
            pr.proposalId,
            groupKey,
          );
          const tombstone = await tx.get(Stores.tombstones, refundTombstoneId);
          if (tombstone) {
            continue;
          }
          const refundTransactionId = makeEventId(
            TransactionType.Refund,
            pr.proposalId,
            groupKey,
          );
          let r0: WalletRefundItem | undefined;
          let amountRaw = Amounts.getZero(contractData.amount.currency);
          let amountEffective = Amounts.getZero(contractData.amount.currency);
          for (const rk of Object.keys(pr.refunds)) {
            const refund = pr.refunds[rk];
            const myGroupKey = `${refund.executionTime.t_ms}`;
            if (myGroupKey !== groupKey) {
              continue;
            }
            if (!r0) {
              r0 = refund;
            }

            if (refund.type === RefundState.Applied) {
              amountRaw = Amounts.add(amountRaw, refund.refundAmount).amount;
              amountEffective = Amounts.add(
                amountEffective,
                Amounts.sub(
                  refund.refundAmount,
                  refund.refundFee,
                  refund.totalRefreshCostBound,
                ).amount,
              ).amount;
            }
          }
          if (!r0) {
            throw Error("invariant violated");
          }
          transactions.push({
            type: TransactionType.Refund,
            info,
            refundedTransactionId: paymentTransactionId,
            transactionId: refundTransactionId,
            timestamp: r0.obtainedTime,
            amountEffective: Amounts.stringify(amountEffective),
            amountRaw: Amounts.stringify(amountRaw),
            pending: false,
          });
        }
      });

      tx.iter(Stores.tips).forEachAsync(async (tipRecord) => {
        if (
          shouldSkipCurrency(
            transactionsRequest,
            tipRecord.tipAmountRaw.currency,
          )
        ) {
          return;
        }
        if (!tipRecord.acceptedTimestamp) {
          return;
        }
        transactions.push({
          type: TransactionType.Tip,
          amountEffective: Amounts.stringify(tipRecord.tipAmountEffective),
          amountRaw: Amounts.stringify(tipRecord.tipAmountRaw),
          pending: !tipRecord.pickedUpTimestamp,
          timestamp: tipRecord.acceptedTimestamp,
          transactionId: makeEventId(
            TransactionType.Tip,
            tipRecord.walletTipId,
          ),
          merchantBaseUrl: tipRecord.merchantBaseUrl,
          error: tipRecord.lastError,
        });
      });
    },
  );

  const txPending = transactions.filter((x) => x.pending);
  const txNotPending = transactions.filter((x) => !x.pending);

  txPending.sort((h1, h2) => timestampCmp(h1.timestamp, h2.timestamp));
  txNotPending.sort((h1, h2) => timestampCmp(h1.timestamp, h2.timestamp));

  return { transactions: [...txNotPending, ...txPending] };
}

export enum TombstoneTag {
  DeleteWithdrawalGroup = "delete-withdrawal-group",
  DeleteReserve = "delete-reserve",
  DeletePayment = "delete-payment",
  DeleteTip = "delete-tip",
  DeleteRefreshGroup = "delete-refresh-group",
  DeleteDepositGroup = "delete-deposit-group",
  DeleteRefund = "delete-refund",
}

/**
 * Permanently delete a transaction based on the transaction ID.
 */
export async function deleteTransaction(
  ws: InternalWalletState,
  transactionId: string,
): Promise<void> {
  const [type, ...rest] = transactionId.split(":");

  if (type === TransactionType.Withdrawal) {
    const withdrawalGroupId = rest[0];
    await ws.db.runWithWriteTransaction(
      [Stores.withdrawalGroups, Stores.reserves, Stores.tombstones],
      async (tx) => {
        const withdrawalGroupRecord = await tx.get(
          Stores.withdrawalGroups,
          withdrawalGroupId,
        );
        if (withdrawalGroupRecord) {
          await tx.delete(Stores.withdrawalGroups, withdrawalGroupId);
          await tx.put(Stores.tombstones, {
            id: TombstoneTag.DeleteWithdrawalGroup + ":" + withdrawalGroupId,
          });
          return;
        }
        const reserveRecord: ReserveRecord | undefined = await tx.getIndexed(
          Stores.reserves.byInitialWithdrawalGroupId,
          withdrawalGroupId,
        );
        if (reserveRecord && !reserveRecord.initialWithdrawalStarted) {
          const reservePub = reserveRecord.reservePub;
          await tx.delete(Stores.reserves, reservePub);
          await tx.put(Stores.tombstones, {
            id: TombstoneTag.DeleteReserve + ":" + reservePub,
          });
        }
      },
    );
  } else if (type === TransactionType.Payment) {
    const proposalId = rest[0];
    await ws.db.runWithWriteTransaction(
      [Stores.proposals, Stores.purchases, Stores.tombstones],
      async (tx) => {
        let found = false;
        const proposal = await tx.get(Stores.proposals, proposalId);
        if (proposal) {
          found = true;
          await tx.delete(Stores.proposals, proposalId);
        }
        const purchase = await tx.get(Stores.purchases, proposalId);
        if (purchase) {
          found = true;
          await tx.delete(Stores.proposals, proposalId);
        }
        if (found) {
          await tx.put(Stores.tombstones, {
            id: TombstoneTag.DeletePayment + ":" + proposalId,
          });
        }
      },
    );
  } else if (type === TransactionType.Refresh) {
    const refreshGroupId = rest[0];
    await ws.db.runWithWriteTransaction(
      [Stores.refreshGroups, Stores.tombstones],
      async (tx) => {
        const rg = await tx.get(Stores.refreshGroups, refreshGroupId);
        if (rg) {
          await tx.delete(Stores.refreshGroups, refreshGroupId);
          await tx.put(Stores.tombstones, {
            id: TombstoneTag.DeleteRefreshGroup + ":" + refreshGroupId,
          });
        }
      },
    );
  } else if (type === TransactionType.Tip) {
    const tipId = rest[0];
    await ws.db.runWithWriteTransaction(
      [Stores.tips, Stores.tombstones],
      async (tx) => {
        const tipRecord = await tx.get(Stores.tips, tipId);
        if (tipRecord) {
          await tx.delete(Stores.tips, tipId);
          await tx.put(Stores.tombstones, {
            id: TombstoneTag.DeleteTip + ":" + tipId,
          });
        }
      },
    );
  } else if (type === TransactionType.Deposit) {
    const depositGroupId = rest[0];
    await ws.db.runWithWriteTransaction(
      [Stores.depositGroups, Stores.tombstones],
      async (tx) => {
        const tipRecord = await tx.get(Stores.depositGroups, depositGroupId);
        if (tipRecord) {
          await tx.delete(Stores.depositGroups, depositGroupId);
          await tx.put(Stores.tombstones, {
            id: TombstoneTag.DeleteDepositGroup + ":" + depositGroupId,
          });
        }
      },
    );
  } else if (type === TransactionType.Refund) {
    const proposalId = rest[0];
    const executionTimeStr = rest[1];

    await ws.db.runWithWriteTransaction(
      [Stores.proposals, Stores.purchases, Stores.tombstones],
      async (tx) => {
        const purchase = await tx.get(Stores.purchases, proposalId);
        if (purchase) {
          // This should just influence the history view,
          // but won't delete any actual refund information.
          await tx.put(Stores.tombstones, {
            id: makeEventId(
              TombstoneTag.DeleteRefund,
              proposalId,
              executionTimeStr,
            ),
          });
        }
      },
    );
  } else {
    throw Error(`can't delete a '${type}' transaction`);
  }
}
