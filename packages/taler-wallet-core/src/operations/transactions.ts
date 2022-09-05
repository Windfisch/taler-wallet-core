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
import {
  AbsoluteTime,
  AmountJson,
  Amounts,
  constructPayPullUri,
  constructPayPushUri,
  Logger,
  OrderShortInfo,
  PaymentStatus,
  RefundInfoShort,
  Transaction,
  TransactionsRequest,
  TransactionsResponse,
  TransactionType,
  WithdrawalDetails,
  WithdrawalType,
} from "@gnu-taler/taler-util";
import { InternalWalletState } from "../internal-wallet-state.js";
import {
  AbortStatus,
  RefundState,
  WalletRefundItem,
  WithdrawalRecordType,
} from "../db.js";
import { processDepositGroup } from "./deposits.js";
import { getExchangeDetails } from "./exchanges.js";
import { processPurchasePay } from "./pay.js";
import { processRefreshGroup } from "./refresh.js";
import { processTip } from "./tip.js";
import { processWithdrawalGroup } from "./withdraw.js";
import { RetryTags } from "../util/retries.js";

const logger = new Logger("taler-wallet-core:transactions.ts");

export enum TombstoneTag {
  DeleteWithdrawalGroup = "delete-withdrawal-group",
  DeleteReserve = "delete-reserve",
  DeletePayment = "delete-payment",
  DeleteTip = "delete-tip",
  DeleteRefreshGroup = "delete-refresh-group",
  DeleteDepositGroup = "delete-deposit-group",
  DeleteRefund = "delete-refund",
  DeletePeerPullDebit = "delete-peer-pull-debit",
  DeletePeerPushDebit = "delete-peer-push-debit",
}

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
 * Fallback order of transactions that have the same timestamp.
 */
const txOrder: { [t in TransactionType]: number } = {
  [TransactionType.Withdrawal]: 1,
  [TransactionType.Tip]: 2,
  [TransactionType.Payment]: 3,
  [TransactionType.PeerPullCredit]: 4,
  [TransactionType.PeerPullDebit]: 5,
  [TransactionType.PeerPushCredit]: 6,
  [TransactionType.PeerPushDebit]: 7,
  [TransactionType.Refund]: 8,
  [TransactionType.Deposit]: 9,
  [TransactionType.Refresh]: 10,
  [TransactionType.Tip]: 11,
};

/**
 * Retrieve the full event history for this wallet.
 */
export async function getTransactions(
  ws: InternalWalletState,
  transactionsRequest?: TransactionsRequest,
): Promise<TransactionsResponse> {
  const transactions: Transaction[] = [];

  await ws.db
    .mktx((x) => ({
      coins: x.coins,
      denominations: x.denominations,
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
      proposals: x.proposals,
      purchases: x.purchases,
      refreshGroups: x.refreshGroups,
      tips: x.tips,
      withdrawalGroups: x.withdrawalGroups,
      planchets: x.planchets,
      recoupGroups: x.recoupGroups,
      depositGroups: x.depositGroups,
      tombstones: x.tombstones,
      peerPushPaymentInitiations: x.peerPushPaymentInitiations,
      peerPullPaymentIncoming: x.peerPullPaymentIncoming,
      operationRetries: x.operationRetries,
    }))
    .runReadOnly(async (tx) => {
      tx.peerPushPaymentInitiations.iter().forEachAsync(async (pi) => {
        const amount = Amounts.parseOrThrow(pi.amount);

        if (shouldSkipCurrency(transactionsRequest, amount.currency)) {
          return;
        }
        if (shouldSkipSearch(transactionsRequest, [])) {
          return;
        }
        transactions.push({
          type: TransactionType.PeerPushDebit,
          amountEffective: pi.amount,
          amountRaw: pi.amount,
          exchangeBaseUrl: pi.exchangeBaseUrl,
          info: {
            expiration: pi.contractTerms.purse_expiration,
            summary: pi.contractTerms.summary,
          },
          frozen: false,
          pending: !pi.purseCreated,
          timestamp: pi.timestampCreated,
          talerUri: constructPayPushUri({
            exchangeBaseUrl: pi.exchangeBaseUrl,
            contractPriv: pi.contractPriv,
          }),
          transactionId: makeEventId(
            TransactionType.PeerPushDebit,
            pi.pursePub,
          ),
        });
      });

      tx.peerPullPaymentIncoming.iter().forEachAsync(async (pi) => {
        const amount = Amounts.parseOrThrow(pi.contractTerms.amount);
        if (shouldSkipCurrency(transactionsRequest, amount.currency)) {
          return;
        }
        if (shouldSkipSearch(transactionsRequest, [])) {
          return;
        }
        if (!pi.accepted) {
          return;
        }

        transactions.push({
          type: TransactionType.PeerPullDebit,
          amountEffective: Amounts.stringify(amount),
          amountRaw: Amounts.stringify(amount),
          exchangeBaseUrl: pi.exchangeBaseUrl,
          frozen: false,
          pending: false,
          info: {
            expiration: pi.contractTerms.purse_expiration,
            summary: pi.contractTerms.summary,
          },
          timestamp: pi.timestampCreated,
          transactionId: makeEventId(
            TransactionType.PeerPullDebit,
            pi.peerPullPaymentIncomingId,
          ),
        });
      });

      tx.withdrawalGroups.iter().forEachAsync(async (wsr) => {
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

        const opId = RetryTags.forWithdrawal(wsr);
        const ort = await tx.operationRetries.get(opId);

        let withdrawalDetails: WithdrawalDetails;
        if (wsr.wgInfo.withdrawalType === WithdrawalRecordType.PeerPullCredit) {
          transactions.push({
            type: TransactionType.PeerPullCredit,
            amountEffective: Amounts.stringify(wsr.denomsSel.totalCoinValue),
            amountRaw: Amounts.stringify(wsr.rawWithdrawalAmount),
            exchangeBaseUrl: wsr.exchangeBaseUrl,
            pending: !wsr.timestampFinish,
            timestamp: wsr.timestampStart,
            info: {
              expiration: wsr.wgInfo.contractTerms.purse_expiration,
              summary: wsr.wgInfo.contractTerms.summary,
            },
            talerUri: constructPayPullUri({
              exchangeBaseUrl: wsr.exchangeBaseUrl,
              contractPriv: wsr.wgInfo.contractPriv,
            }),
            transactionId: makeEventId(
              TransactionType.PeerPullCredit,
              wsr.withdrawalGroupId,
            ),
            frozen: false,
            ...(ort?.lastError ? { error: ort.lastError } : {}),
          });
          return;
        } else if (
          wsr.wgInfo.withdrawalType === WithdrawalRecordType.PeerPushCredit
        ) {
          transactions.push({
            type: TransactionType.PeerPushCredit,
            amountEffective: Amounts.stringify(wsr.denomsSel.totalCoinValue),
            amountRaw: Amounts.stringify(wsr.rawWithdrawalAmount),
            exchangeBaseUrl: wsr.exchangeBaseUrl,
            info: {
              expiration: wsr.wgInfo.contractTerms.purse_expiration,
              summary: wsr.wgInfo.contractTerms.summary,
            },
            pending: !wsr.timestampFinish,
            timestamp: wsr.timestampStart,
            transactionId: makeEventId(
              TransactionType.PeerPushCredit,
              wsr.withdrawalGroupId,
            ),
            frozen: false,
            ...(ort?.lastError ? { error: ort.lastError } : {}),
          });
          return;
        } else if (
          wsr.wgInfo.withdrawalType === WithdrawalRecordType.BankIntegrated
        ) {
          withdrawalDetails = {
            type: WithdrawalType.TalerBankIntegrationApi,
            confirmed: wsr.wgInfo.bankInfo.timestampBankConfirmed
              ? true
              : false,
            reservePub: wsr.reservePub,
            bankConfirmationUrl: wsr.wgInfo.bankInfo.confirmUrl,
          };
        } else {
          const exchangeDetails = await getExchangeDetails(
            tx,
            wsr.exchangeBaseUrl,
          );
          if (!exchangeDetails) {
            // FIXME: report somehow
            return;
          }
          withdrawalDetails = {
            type: WithdrawalType.ManualTransfer,
            reservePub: wsr.reservePub,
            exchangePaytoUris:
              exchangeDetails.wireInfo?.accounts.map(
                (x) => `${x.payto_uri}?subject=${wsr.reservePub}`,
              ) ?? [],
          };
        }

        transactions.push({
          type: TransactionType.Withdrawal,
          amountEffective: Amounts.stringify(wsr.denomsSel.totalCoinValue),
          amountRaw: Amounts.stringify(wsr.rawWithdrawalAmount),
          withdrawalDetails,
          exchangeBaseUrl: wsr.exchangeBaseUrl,
          pending: !wsr.timestampFinish,
          timestamp: wsr.timestampStart,
          transactionId: makeEventId(
            TransactionType.Withdrawal,
            wsr.withdrawalGroupId,
          ),
          frozen: false,
          ...(ort?.lastError ? { error: ort.lastError } : {}),
        });
      });

      tx.depositGroups.iter().forEachAsync(async (dg) => {
        const amount = Amounts.parseOrThrow(dg.contractTermsRaw.amount);
        if (shouldSkipCurrency(transactionsRequest, amount.currency)) {
          return;
        }
        const opId = RetryTags.forDeposit(dg);
        const retryRecord = await tx.operationRetries.get(opId);
        transactions.push({
          type: TransactionType.Deposit,
          amountRaw: Amounts.stringify(dg.effectiveDepositAmount),
          amountEffective: Amounts.stringify(dg.totalPayCost),
          pending: !dg.timestampFinished,
          frozen: false,
          timestamp: dg.timestampCreated,
          targetPaytoUri: dg.wire.payto_uri,
          transactionId: makeEventId(
            TransactionType.Deposit,
            dg.depositGroupId,
          ),
          depositGroupId: dg.depositGroupId,
          ...(retryRecord?.lastError ? { error: retryRecord.lastError } : {}),
        });
      });

      tx.purchases.iter().forEachAsync(async (pr) => {
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
        const proposal = await tx.proposals.get(pr.proposalId);
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
        const refundGroupKeys = new Set<string>();

        for (const rk of Object.keys(pr.refunds)) {
          const refund = pr.refunds[rk];
          const groupKey = `${refund.executionTime.t_s}`;
          refundGroupKeys.add(groupKey);
        }

        let totalRefundRaw = Amounts.getZero(contractData.amount.currency);
        let totalRefundEffective = Amounts.getZero(
          contractData.amount.currency,
        );
        const refunds: RefundInfoShort[] = [];

        for (const groupKey of refundGroupKeys.values()) {
          const refundTombstoneId = makeEventId(
            TombstoneTag.DeleteRefund,
            pr.proposalId,
            groupKey,
          );
          const tombstone = await tx.tombstones.get(refundTombstoneId);
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
            const myGroupKey = `${refund.executionTime.t_s}`;
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

              refunds.push({
                transactionId: refundTransactionId,
                timestamp: r0.obtainedTime,
                amountEffective: Amounts.stringify(amountEffective),
                amountRaw: Amounts.stringify(amountRaw),
              });
            }
          }
          if (!r0) {
            throw Error("invariant violated");
          }

          totalRefundRaw = Amounts.add(totalRefundRaw, amountRaw).amount;
          totalRefundEffective = Amounts.add(
            totalRefundEffective,
            amountEffective,
          ).amount;
          transactions.push({
            type: TransactionType.Refund,
            info,
            refundedTransactionId: paymentTransactionId,
            transactionId: refundTransactionId,
            timestamp: r0.obtainedTime,
            amountEffective: Amounts.stringify(amountEffective),
            amountRaw: Amounts.stringify(amountRaw),
            refundPending:
              pr.refundAwaiting === undefined
                ? undefined
                : Amounts.stringify(pr.refundAwaiting),
            pending: false,
            frozen: false,
          });
        }

        const payOpId = RetryTags.forPay(pr);
        const refundQueryOpId = RetryTags.forRefundQuery(pr);
        const payRetryRecord = await tx.operationRetries.get(payOpId);
        const refundQueryRetryRecord = await tx.operationRetries.get(
          refundQueryOpId,
        );

        const err =
          refundQueryRetryRecord?.lastError ?? payRetryRecord?.lastError;
        transactions.push({
          type: TransactionType.Payment,
          amountRaw: Amounts.stringify(contractData.amount),
          amountEffective: Amounts.stringify(pr.totalPayCost),
          totalRefundRaw: Amounts.stringify(totalRefundRaw),
          totalRefundEffective: Amounts.stringify(totalRefundEffective),
          refundPending:
            pr.refundAwaiting === undefined
              ? undefined
              : Amounts.stringify(pr.refundAwaiting),
          status: pr.timestampFirstSuccessfulPay
            ? PaymentStatus.Paid
            : PaymentStatus.Accepted,
          pending:
            !pr.timestampFirstSuccessfulPay &&
            pr.abortStatus === AbortStatus.None,
          refunds,
          timestamp: pr.timestampAccept,
          transactionId: paymentTransactionId,
          proposalId: pr.proposalId,
          info,
          frozen: pr.payFrozen ?? false,
          ...(err ? { error: err } : {}),
        });
      });

      tx.tips.iter().forEachAsync(async (tipRecord) => {
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
        const opId = RetryTags.forTipPickup(tipRecord);
        const retryRecord = await tx.operationRetries.get(opId);
        transactions.push({
          type: TransactionType.Tip,
          amountEffective: Amounts.stringify(tipRecord.tipAmountEffective),
          amountRaw: Amounts.stringify(tipRecord.tipAmountRaw),
          pending: !tipRecord.pickedUpTimestamp,
          frozen: false,
          timestamp: tipRecord.acceptedTimestamp,
          transactionId: makeEventId(
            TransactionType.Tip,
            tipRecord.walletTipId,
          ),
          merchantBaseUrl: tipRecord.merchantBaseUrl,
          error: retryRecord?.lastError,
        });
      });
    });

  const txPending = transactions.filter((x) => x.pending);
  const txNotPending = transactions.filter((x) => !x.pending);

  const txCmp = (h1: Transaction, h2: Transaction) => {
    const tsCmp = AbsoluteTime.cmp(
      AbsoluteTime.fromTimestamp(h1.timestamp),
      AbsoluteTime.fromTimestamp(h2.timestamp),
    );
    if (tsCmp === 0) {
      return Math.sign(txOrder[h1.type] - txOrder[h2.type]);
    }
    return tsCmp;
  };

  txPending.sort(txCmp);
  txNotPending.sort(txCmp);

  return { transactions: [...txNotPending, ...txPending] };
}

/**
 * Immediately retry the underlying operation
 * of a transaction.
 */
export async function retryTransaction(
  ws: InternalWalletState,
  transactionId: string,
): Promise<void> {
  logger.info(`retrying transaction ${transactionId}`);

  const [type, ...rest] = transactionId.split(":");

  switch (type) {
    case TransactionType.Deposit: {
      const depositGroupId = rest[0];
      processDepositGroup(ws, depositGroupId, {
        forceNow: true,
      });
      break;
    }
    case TransactionType.Withdrawal: {
      const withdrawalGroupId = rest[0];
      await processWithdrawalGroup(ws, withdrawalGroupId, { forceNow: true });
      break;
    }
    case TransactionType.Payment: {
      const proposalId = rest[0];
      await processPurchasePay(ws, proposalId, { forceNow: true });
      break;
    }
    case TransactionType.Tip: {
      const walletTipId = rest[0];
      await processTip(ws, walletTipId, { forceNow: true });
      break;
    }
    case TransactionType.Refresh: {
      const refreshGroupId = rest[0];
      await processRefreshGroup(ws, refreshGroupId, { forceNow: true });
      break;
    }
    default:
      break;
  }
}

/**
 * Permanently delete a transaction based on the transaction ID.
 */
export async function deleteTransaction(
  ws: InternalWalletState,
  transactionId: string,
): Promise<void> {
  const [typeStr, ...rest] = transactionId.split(":");
  const type = typeStr as TransactionType;
  if (
    type === TransactionType.Withdrawal ||
    type === TransactionType.PeerPullCredit ||
    type === TransactionType.PeerPushCredit
  ) {
    const withdrawalGroupId = rest[0];
    await ws.db
      .mktx((x) => ({
        withdrawalGroups: x.withdrawalGroups,
        tombstones: x.tombstones,
      }))
      .runReadWrite(async (tx) => {
        const withdrawalGroupRecord = await tx.withdrawalGroups.get(
          withdrawalGroupId,
        );
        if (withdrawalGroupRecord) {
          await tx.withdrawalGroups.delete(withdrawalGroupId);
          await tx.tombstones.put({
            id: TombstoneTag.DeleteWithdrawalGroup + ":" + withdrawalGroupId,
          });
          return;
        }
      });
  } else if (type === TransactionType.Payment) {
    const proposalId = rest[0];
    await ws.db
      .mktx((x) => ({
        proposals: x.proposals,
        purchases: x.purchases,
        tombstones: x.tombstones,
      }))
      .runReadWrite(async (tx) => {
        let found = false;
        const proposal = await tx.proposals.get(proposalId);
        if (proposal) {
          found = true;
          await tx.proposals.delete(proposalId);
        }
        const purchase = await tx.purchases.get(proposalId);
        if (purchase) {
          found = true;
          await tx.purchases.delete(proposalId);
        }
        if (found) {
          await tx.tombstones.put({
            id: TombstoneTag.DeletePayment + ":" + proposalId,
          });
        }
      });
  } else if (type === TransactionType.Refresh) {
    const refreshGroupId = rest[0];
    await ws.db
      .mktx((x) => ({
        refreshGroups: x.refreshGroups,
        tombstones: x.tombstones,
      }))
      .runReadWrite(async (tx) => {
        const rg = await tx.refreshGroups.get(refreshGroupId);
        if (rg) {
          await tx.refreshGroups.delete(refreshGroupId);
          await tx.tombstones.put({
            id: TombstoneTag.DeleteRefreshGroup + ":" + refreshGroupId,
          });
        }
      });
  } else if (type === TransactionType.Tip) {
    const tipId = rest[0];
    await ws.db
      .mktx((x) => ({
        tips: x.tips,
        tombstones: x.tombstones,
      }))
      .runReadWrite(async (tx) => {
        const tipRecord = await tx.tips.get(tipId);
        if (tipRecord) {
          await tx.tips.delete(tipId);
          await tx.tombstones.put({
            id: TombstoneTag.DeleteTip + ":" + tipId,
          });
        }
      });
  } else if (type === TransactionType.Deposit) {
    const depositGroupId = rest[0];
    await ws.db
      .mktx((x) => ({
        depositGroups: x.depositGroups,
        tombstones: x.tombstones,
      }))
      .runReadWrite(async (tx) => {
        const tipRecord = await tx.depositGroups.get(depositGroupId);
        if (tipRecord) {
          await tx.depositGroups.delete(depositGroupId);
          await tx.tombstones.put({
            id: TombstoneTag.DeleteDepositGroup + ":" + depositGroupId,
          });
        }
      });
  } else if (type === TransactionType.Refund) {
    const proposalId = rest[0];
    const executionTimeStr = rest[1];

    await ws.db
      .mktx((x) => ({
        proposals: x.proposals,
        purchases: x.purchases,
        tombstones: x.tombstones,
      }))
      .runReadWrite(async (tx) => {
        const purchase = await tx.purchases.get(proposalId);
        if (purchase) {
          // This should just influence the history view,
          // but won't delete any actual refund information.
          await tx.tombstones.put({
            id: makeEventId(
              TombstoneTag.DeleteRefund,
              proposalId,
              executionTimeStr,
            ),
          });
        }
      });
  } else if (type === TransactionType.PeerPullDebit) {
    const peerPullPaymentIncomingId = rest[0];
    await ws.db
      .mktx((x) => ({
        peerPullPaymentIncoming: x.peerPullPaymentIncoming,
        tombstones: x.tombstones,
      }))
      .runReadWrite(async (tx) => {
        const debit = await tx.peerPullPaymentIncoming.get(
          peerPullPaymentIncomingId,
        );
        if (debit) {
          await tx.peerPullPaymentIncoming.delete(peerPullPaymentIncomingId);
          await tx.tombstones.put({
            id: makeEventId(
              TombstoneTag.DeletePeerPullDebit,
              peerPullPaymentIncomingId,
            ),
          });
        }
      });
  } else if (type === TransactionType.PeerPushDebit) {
    const pursePub = rest[0];
    await ws.db
      .mktx((x) => ({
        peerPushPaymentInitiations: x.peerPushPaymentInitiations,
        tombstones: x.tombstones,
      }))
      .runReadWrite(async (tx) => {
        const debit = await tx.peerPushPaymentInitiations.get(pursePub);
        if (debit) {
          await tx.peerPushPaymentInitiations.delete(pursePub);
          await tx.tombstones.put({
            id: makeEventId(TombstoneTag.DeletePeerPushDebit, pursePub),
          });
        }
      });
  } else {
    const unknownTxType: never = type;
    throw Error(`can't delete a '${unknownTxType}' transaction`);
  }
}
