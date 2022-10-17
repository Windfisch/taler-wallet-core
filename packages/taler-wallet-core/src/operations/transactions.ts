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
  TalerProtocolTimestamp,
  Transaction,
  TransactionByIdRequest,
  TransactionsRequest,
  TransactionsResponse,
  TransactionType,
  WithdrawalType,
} from "@gnu-taler/taler-util";
import {
  DepositGroupRecord,
  ExchangeDetailsRecord,
  OperationRetryRecord,
  PeerPullPaymentIncomingRecord,
  PeerPushPaymentInitiationRecord,
  PurchaseStatus,
  PurchaseRecord,
  RefundState,
  TipRecord,
  WalletRefundItem,
  WithdrawalGroupRecord,
  WithdrawalRecordType,
  WalletContractData,
} from "../db.js";
import { InternalWalletState } from "../internal-wallet-state.js";
import { checkDbInvariant } from "../util/invariants.js";
import { RetryTags } from "../util/retries.js";
import {
  makeTombstoneId,
  makeTransactionId,
  parseId,
  TombstoneTag,
} from "./common.js";
import { processDepositGroup } from "./deposits.js";
import { getExchangeDetails } from "./exchanges.js";
import {
  expectProposalDownload,
  extractContractData,
  processPurchasePay,
} from "./pay-merchant.js";
import { processRefreshGroup } from "./refresh.js";
import { processTip } from "./tip.js";
import {
  augmentPaytoUrisForWithdrawal,
  processWithdrawalGroup,
} from "./withdraw.js";

const logger = new Logger("taler-wallet-core:transactions.ts");

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

export async function getTransactionById(
  ws: InternalWalletState,
  req: TransactionByIdRequest,
): Promise<Transaction> {
  const { type, args: rest } = parseId("txn", req.transactionId);
  if (
    type === TransactionType.Withdrawal ||
    type === TransactionType.PeerPullCredit ||
    type === TransactionType.PeerPushCredit
  ) {
    const withdrawalGroupId = rest[0];
    return await ws.db
      .mktx((x) => [
        x.withdrawalGroups,
        x.exchangeDetails,
        x.exchanges,
        x.operationRetries,
      ])
      .runReadWrite(async (tx) => {
        const withdrawalGroupRecord = await tx.withdrawalGroups.get(
          withdrawalGroupId,
        );

        if (!withdrawalGroupRecord) throw Error("not found");

        const opId = RetryTags.forWithdrawal(withdrawalGroupRecord);
        const ort = await tx.operationRetries.get(opId);

        if (
          withdrawalGroupRecord.wgInfo.withdrawalType ===
          WithdrawalRecordType.BankIntegrated
        ) {
          return buildTransactionForBankIntegratedWithdraw(
            withdrawalGroupRecord,
            ort,
          );
        }
        if (
          withdrawalGroupRecord.wgInfo.withdrawalType ===
          WithdrawalRecordType.PeerPullCredit
        ) {
          return buildTransactionForPullPaymentCredit(
            withdrawalGroupRecord,
            ort,
          );
        }
        if (
          withdrawalGroupRecord.wgInfo.withdrawalType ===
          WithdrawalRecordType.PeerPushCredit
        ) {
          return buildTransactionForPushPaymentCredit(
            withdrawalGroupRecord,
            ort,
          );
        }
        const exchangeDetails = await getExchangeDetails(
          tx,
          withdrawalGroupRecord.exchangeBaseUrl,
        );
        if (!exchangeDetails) throw Error("not exchange details");

        return buildTransactionForManualWithdraw(
          withdrawalGroupRecord,
          exchangeDetails,
          ort,
        );
      });
  } else if (type === TransactionType.Payment) {
    const proposalId = rest[0];
    return await ws.db
      .mktx((x) => [x.purchases, x.tombstones, x.operationRetries])
      .runReadWrite(async (tx) => {
        const purchase = await tx.purchases.get(proposalId);
        if (!purchase) throw Error("not found");

        const filteredRefunds = await Promise.all(
          Object.values(purchase.refunds).map(async (r) => {
            const t = await tx.tombstones.get(
              makeTombstoneId(
                TombstoneTag.DeleteRefund,
                purchase.proposalId,
                `${r.executionTime.t_s}`,
              ),
            );
            if (!t) return r;
            return undefined;
          }),
        );

        const download = await expectProposalDownload(ws, purchase);

        const cleanRefunds = filteredRefunds.filter(
          (x): x is WalletRefundItem => !!x,
        );

        const contractData = download.contractData;
        const refunds = mergeRefundByExecutionTime(
          cleanRefunds,
          Amounts.getZero(contractData.amount.currency),
        );

        const payOpId = RetryTags.forPay(purchase);
        const payRetryRecord = await tx.operationRetries.get(payOpId);

        return buildTransactionForPurchase(
          purchase,
          contractData,
          refunds,
          payRetryRecord,
        );
      });
  } else if (type === TransactionType.Refresh) {
    const refreshGroupId = rest[0];
    throw Error(`no tx for refresh`);
  } else if (type === TransactionType.Tip) {
    const tipId = rest[0];
    return await ws.db
      .mktx((x) => [x.tips, x.operationRetries])
      .runReadWrite(async (tx) => {
        const tipRecord = await tx.tips.get(tipId);
        if (!tipRecord) throw Error("not found");

        const retries = await tx.operationRetries.get(
          RetryTags.forTipPickup(tipRecord),
        );
        return buildTransactionForTip(tipRecord, retries);
      });
  } else if (type === TransactionType.Deposit) {
    const depositGroupId = rest[0];
    return await ws.db
      .mktx((x) => [x.depositGroups, x.operationRetries])
      .runReadWrite(async (tx) => {
        const depositRecord = await tx.depositGroups.get(depositGroupId);
        if (!depositRecord) throw Error("not found");

        const retries = await tx.operationRetries.get(
          RetryTags.forDeposit(depositRecord),
        );
        return buildTransactionForDeposit(depositRecord, retries);
      });
  } else if (type === TransactionType.Refund) {
    const proposalId = rest[0];
    const executionTimeStr = rest[1];

    return await ws.db
      .mktx((x) => [x.operationRetries, x.purchases, x.tombstones])
      .runReadWrite(async (tx) => {
        const purchase = await tx.purchases.get(proposalId);
        if (!purchase) throw Error("not found");

        const theRefund = Object.values(purchase.refunds).find(
          (r) => `${r.executionTime.t_s}` === executionTimeStr,
        );
        if (!theRefund) throw Error("not found");

        const t = await tx.tombstones.get(
          makeTombstoneId(
            TombstoneTag.DeleteRefund,
            purchase.proposalId,
            executionTimeStr,
          ),
        );
        if (t) throw Error("deleted");
        const download = await expectProposalDownload(ws, purchase);
        const contractData = download.contractData;
        const refunds = mergeRefundByExecutionTime(
          [theRefund],
          Amounts.getZero(contractData.amount.currency),
        );

        return buildTransactionForRefund(
          purchase,
          contractData,
          refunds[0],
          undefined,
        );
      });
  } else if (type === TransactionType.PeerPullDebit) {
    const peerPullPaymentIncomingId = rest[0];
    return await ws.db
      .mktx((x) => [x.peerPullPaymentIncoming])
      .runReadWrite(async (tx) => {
        const debit = await tx.peerPullPaymentIncoming.get(
          peerPullPaymentIncomingId,
        );
        if (!debit) throw Error("not found");
        return buildTransactionForPullPaymentDebit(debit);
      });
  } else if (type === TransactionType.PeerPushDebit) {
    const pursePub = rest[0];
    return await ws.db
      .mktx((x) => [x.peerPushPaymentInitiations])
      .runReadWrite(async (tx) => {
        const debit = await tx.peerPushPaymentInitiations.get(pursePub);
        if (!debit) throw Error("not found");
        return buildTransactionForPushPaymentDebit(debit);
      });
  } else {
    const unknownTxType: never = type;
    throw Error(`can't delete a '${unknownTxType}' transaction`);
  }
}

function buildTransactionForPushPaymentDebit(
  pi: PeerPushPaymentInitiationRecord,
  ort?: OperationRetryRecord,
): Transaction {
  return {
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
    transactionId: makeTransactionId(
      TransactionType.PeerPushDebit,
      pi.pursePub,
    ),
    ...(ort?.lastError ? { error: ort.lastError } : {}),
  };
}

function buildTransactionForPullPaymentDebit(
  pi: PeerPullPaymentIncomingRecord,
  ort?: OperationRetryRecord,
): Transaction {
  return {
    type: TransactionType.PeerPullDebit,
    amountEffective: Amounts.stringify(pi.contractTerms.amount),
    amountRaw: Amounts.stringify(pi.contractTerms.amount),
    exchangeBaseUrl: pi.exchangeBaseUrl,
    frozen: false,
    pending: false,
    info: {
      expiration: pi.contractTerms.purse_expiration,
      summary: pi.contractTerms.summary,
    },
    timestamp: pi.timestampCreated,
    transactionId: makeTransactionId(
      TransactionType.PeerPullDebit,
      pi.peerPullPaymentIncomingId,
    ),
    ...(ort?.lastError ? { error: ort.lastError } : {}),
  };
}

function buildTransactionForPullPaymentCredit(
  wsr: WithdrawalGroupRecord,
  ort?: OperationRetryRecord,
): Transaction {
  if (wsr.wgInfo.withdrawalType !== WithdrawalRecordType.PeerPullCredit)
    throw Error("");
  return {
    type: TransactionType.PeerPullCredit,
    amountEffective: Amounts.stringify(wsr.denomsSel.totalCoinValue),
    amountRaw: Amounts.stringify(wsr.instructedAmount),
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
    transactionId: makeTransactionId(
      TransactionType.PeerPullCredit,
      wsr.withdrawalGroupId,
    ),
    frozen: false,
    ...(ort?.lastError ? { error: ort.lastError } : {}),
  };
}

function buildTransactionForPushPaymentCredit(
  wsr: WithdrawalGroupRecord,
  ort?: OperationRetryRecord,
): Transaction {
  if (wsr.wgInfo.withdrawalType !== WithdrawalRecordType.PeerPushCredit)
    throw Error("");
  return {
    type: TransactionType.PeerPushCredit,
    amountEffective: Amounts.stringify(wsr.denomsSel.totalCoinValue),
    amountRaw: Amounts.stringify(wsr.instructedAmount),
    exchangeBaseUrl: wsr.exchangeBaseUrl,
    info: {
      expiration: wsr.wgInfo.contractTerms.purse_expiration,
      summary: wsr.wgInfo.contractTerms.summary,
    },
    pending: !wsr.timestampFinish,
    timestamp: wsr.timestampStart,
    transactionId: makeTransactionId(
      TransactionType.PeerPushCredit,
      wsr.withdrawalGroupId,
    ),
    frozen: false,
    ...(ort?.lastError ? { error: ort.lastError } : {}),
  };
}

function buildTransactionForBankIntegratedWithdraw(
  wsr: WithdrawalGroupRecord,
  ort?: OperationRetryRecord,
): Transaction {
  if (wsr.wgInfo.withdrawalType !== WithdrawalRecordType.BankIntegrated)
    throw Error("");

  return {
    type: TransactionType.Withdrawal,
    amountEffective: Amounts.stringify(wsr.denomsSel.totalCoinValue),
    amountRaw: Amounts.stringify(wsr.instructedAmount),
    withdrawalDetails: {
      type: WithdrawalType.TalerBankIntegrationApi,
      confirmed: wsr.wgInfo.bankInfo.timestampBankConfirmed ? true : false,
      reservePub: wsr.reservePub,
      bankConfirmationUrl: wsr.wgInfo.bankInfo.confirmUrl,
    },
    exchangeBaseUrl: wsr.exchangeBaseUrl,
    pending: !wsr.timestampFinish,
    timestamp: wsr.timestampStart,
    transactionId: makeTransactionId(
      TransactionType.Withdrawal,
      wsr.withdrawalGroupId,
    ),
    frozen: false,
    ...(ort?.lastError ? { error: ort.lastError } : {}),
  };
}

function buildTransactionForManualWithdraw(
  withdrawalGroup: WithdrawalGroupRecord,
  exchangeDetails: ExchangeDetailsRecord,
  ort?: OperationRetryRecord,
): Transaction {
  if (withdrawalGroup.wgInfo.withdrawalType !== WithdrawalRecordType.BankManual)
    throw Error("");

  const plainPaytoUris =
    exchangeDetails.wireInfo?.accounts.map((x) => x.payto_uri) ?? [];

  const exchangePaytoUris = augmentPaytoUrisForWithdrawal(
    plainPaytoUris,
    withdrawalGroup.reservePub,
    withdrawalGroup.instructedAmount,
  );

  return {
    type: TransactionType.Withdrawal,
    amountEffective: Amounts.stringify(
      withdrawalGroup.denomsSel.totalCoinValue,
    ),
    amountRaw: Amounts.stringify(withdrawalGroup.instructedAmount),
    withdrawalDetails: {
      type: WithdrawalType.ManualTransfer,
      reservePub: withdrawalGroup.reservePub,
      exchangePaytoUris,
    },
    exchangeBaseUrl: withdrawalGroup.exchangeBaseUrl,
    pending: !withdrawalGroup.timestampFinish,
    timestamp: withdrawalGroup.timestampStart,
    transactionId: makeTransactionId(
      TransactionType.Withdrawal,
      withdrawalGroup.withdrawalGroupId,
    ),
    frozen: false,
    ...(ort?.lastError ? { error: ort.lastError } : {}),
  };
}

function buildTransactionForDeposit(
  dg: DepositGroupRecord,
  ort?: OperationRetryRecord,
): Transaction {
  return {
    type: TransactionType.Deposit,
    amountRaw: Amounts.stringify(dg.effectiveDepositAmount),
    amountEffective: Amounts.stringify(dg.totalPayCost),
    pending: !dg.timestampFinished,
    frozen: false,
    timestamp: dg.timestampCreated,
    targetPaytoUri: dg.wire.payto_uri,
    transactionId: makeTransactionId(
      TransactionType.Deposit,
      dg.depositGroupId,
    ),
    depositGroupId: dg.depositGroupId,
    ...(ort?.lastError ? { error: ort.lastError } : {}),
  };
}

function buildTransactionForTip(
  tipRecord: TipRecord,
  ort?: OperationRetryRecord,
): Transaction {
  if (!tipRecord.acceptedTimestamp) throw Error("");

  return {
    type: TransactionType.Tip,
    amountEffective: Amounts.stringify(tipRecord.tipAmountEffective),
    amountRaw: Amounts.stringify(tipRecord.tipAmountRaw),
    pending: !tipRecord.pickedUpTimestamp,
    frozen: false,
    timestamp: tipRecord.acceptedTimestamp,
    transactionId: makeTransactionId(
      TransactionType.Tip,
      tipRecord.walletTipId,
    ),
    merchantBaseUrl: tipRecord.merchantBaseUrl,
    ...(ort?.lastError ? { error: ort.lastError } : {}),
  };
}

/**
 * For a set of refund with the same executionTime.
 */
interface MergedRefundInfo {
  executionTime: TalerProtocolTimestamp;
  amountAppliedRaw: AmountJson;
  amountAppliedEffective: AmountJson;
  firstTimestamp: TalerProtocolTimestamp;
}

function mergeRefundByExecutionTime(
  rs: WalletRefundItem[],
  zero: AmountJson,
): MergedRefundInfo[] {
  const refundByExecTime = rs.reduce((prev, refund) => {
    const key = `${refund.executionTime.t_s}`;

    // refunds count if applied
    const effective =
      refund.type === RefundState.Applied
        ? Amounts.sub(
            refund.refundAmount,
            refund.refundFee,
            refund.totalRefreshCostBound,
          ).amount
        : zero;
    const raw =
      refund.type === RefundState.Applied ? refund.refundAmount : zero;

    const v = prev.get(key);
    if (!v) {
      prev.set(key, {
        executionTime: refund.executionTime,
        amountAppliedEffective: effective,
        amountAppliedRaw: raw,
        firstTimestamp: refund.obtainedTime,
      });
    } else {
      //v.executionTime is the same
      v.amountAppliedEffective = Amounts.add(
        v.amountAppliedEffective,
        effective,
      ).amount;
      v.amountAppliedRaw = Amounts.add(
        v.amountAppliedRaw,
        refund.refundAmount,
      ).amount;
      v.firstTimestamp = TalerProtocolTimestamp.min(
        v.firstTimestamp,
        refund.obtainedTime,
      );
    }
    return prev;
  }, new Map<string, MergedRefundInfo>());

  return Array.from(refundByExecTime.values());
}

async function buildTransactionForRefund(
  purchaseRecord: PurchaseRecord,
  contractData: WalletContractData,
  refundInfo: MergedRefundInfo,
  ort?: OperationRetryRecord,
): Promise<Transaction> {
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

  return {
    type: TransactionType.Refund,
    info,
    refundedTransactionId: makeTransactionId(
      TransactionType.Payment,
      purchaseRecord.proposalId,
    ),
    transactionId: makeTransactionId(
      TransactionType.Refund,
      purchaseRecord.proposalId,
      `${refundInfo.executionTime.t_s}`,
    ),
    timestamp: refundInfo.firstTimestamp,
    amountEffective: Amounts.stringify(refundInfo.amountAppliedEffective),
    amountRaw: Amounts.stringify(refundInfo.amountAppliedRaw),
    refundPending:
      purchaseRecord.refundAmountAwaiting === undefined
        ? undefined
        : Amounts.stringify(purchaseRecord.refundAmountAwaiting),
    pending: false,
    frozen: false,
    ...(ort?.lastError ? { error: ort.lastError } : {}),
  };
}

async function buildTransactionForPurchase(
  purchaseRecord: PurchaseRecord,
  contractData: WalletContractData,
  refundsInfo: MergedRefundInfo[],
  ort?: OperationRetryRecord,
): Promise<Transaction> {
  const zero = Amounts.getZero(contractData.amount.currency);

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

  const totalRefund = refundsInfo.reduce(
    (prev, cur) => {
      return {
        raw: Amounts.add(prev.raw, cur.amountAppliedRaw).amount,
        effective: Amounts.add(prev.effective, cur.amountAppliedEffective)
          .amount,
      };
    },
    {
      raw: zero,
      effective: zero,
    } as { raw: AmountJson; effective: AmountJson },
  );

  const refunds: RefundInfoShort[] = refundsInfo.map((r) => ({
    amountEffective: Amounts.stringify(r.amountAppliedEffective),
    amountRaw: Amounts.stringify(r.amountAppliedRaw),
    timestamp: r.executionTime,
    transactionId: makeTransactionId(
      TransactionType.Refund,
      purchaseRecord.proposalId,
      `${r.executionTime.t_s}`,
    ),
  }));

  const timestamp = purchaseRecord.timestampAccept;
  checkDbInvariant(!!timestamp);
  checkDbInvariant(!!purchaseRecord.payInfo);

  return {
    type: TransactionType.Payment,
    amountRaw: Amounts.stringify(contractData.amount),
    amountEffective: Amounts.stringify(purchaseRecord.payInfo.totalPayCost),
    totalRefundRaw: Amounts.stringify(totalRefund.raw),
    totalRefundEffective: Amounts.stringify(totalRefund.effective),
    refundPending:
      purchaseRecord.refundAmountAwaiting === undefined
        ? undefined
        : Amounts.stringify(purchaseRecord.refundAmountAwaiting),
    status: purchaseRecord.timestampFirstSuccessfulPay
      ? PaymentStatus.Paid
      : PaymentStatus.Accepted,
    pending: purchaseRecord.purchaseStatus === PurchaseStatus.Paying,
    refunds,
    timestamp,
    transactionId: makeTransactionId(
      TransactionType.Payment,
      purchaseRecord.proposalId,
    ),
    proposalId: purchaseRecord.proposalId,
    info,
    frozen:
      purchaseRecord.purchaseStatus === PurchaseStatus.PaymentAbortFinished ??
      false,
    ...(ort?.lastError ? { error: ort.lastError } : {}),
  };
}

/**
 * Retrieve the full event history for this wallet.
 */
export async function getTransactions(
  ws: InternalWalletState,
  transactionsRequest?: TransactionsRequest,
): Promise<TransactionsResponse> {
  const transactions: Transaction[] = [];

  await ws.db
    .mktx((x) => [
      x.coins,
      x.denominations,
      x.depositGroups,
      x.exchangeDetails,
      x.exchanges,
      x.operationRetries,
      x.peerPullPaymentIncoming,
      x.peerPushPaymentInitiations,
      x.planchets,
      x.purchases,
      x.contractTerms,
      x.recoupGroups,
      x.tips,
      x.tombstones,
      x.withdrawalGroups,
    ])
    .runReadOnly(async (tx) => {
      tx.peerPushPaymentInitiations.iter().forEachAsync(async (pi) => {
        const amount = Amounts.parseOrThrow(pi.amount);

        if (shouldSkipCurrency(transactionsRequest, amount.currency)) {
          return;
        }
        if (shouldSkipSearch(transactionsRequest, [])) {
          return;
        }
        transactions.push(buildTransactionForPushPaymentDebit(pi));
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

        transactions.push(buildTransactionForPullPaymentDebit(pi));
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

        if (wsr.wgInfo.withdrawalType === WithdrawalRecordType.PeerPullCredit) {
          transactions.push(buildTransactionForPullPaymentCredit(wsr, ort));
          return;
        } else if (
          wsr.wgInfo.withdrawalType === WithdrawalRecordType.PeerPushCredit
        ) {
          transactions.push(buildTransactionForPushPaymentCredit(wsr, ort));
          return;
        } else if (
          wsr.wgInfo.withdrawalType === WithdrawalRecordType.BankIntegrated
        ) {
          transactions.push(
            buildTransactionForBankIntegratedWithdraw(wsr, ort),
          );
        } else {
          const exchangeDetails = await getExchangeDetails(
            tx,
            wsr.exchangeBaseUrl,
          );
          if (!exchangeDetails) {
            // FIXME: report somehow
            return;
          }

          transactions.push(
            buildTransactionForManualWithdraw(wsr, exchangeDetails, ort),
          );
        }
      });

      tx.depositGroups.iter().forEachAsync(async (dg) => {
        const amount = Amounts.parseOrThrow(dg.contractTermsRaw.amount);
        if (shouldSkipCurrency(transactionsRequest, amount.currency)) {
          return;
        }
        const opId = RetryTags.forDeposit(dg);
        const retryRecord = await tx.operationRetries.get(opId);

        transactions.push(buildTransactionForDeposit(dg, retryRecord));
      });

      tx.purchases.iter().forEachAsync(async (purchase) => {
        const download = purchase.download;
        if (!download) {
          return;
        }
        if (!purchase.payInfo) {
          return;
        }
        if (shouldSkipCurrency(transactionsRequest, download.currency)) {
          return;
        }
        const contractTermsRecord = await tx.contractTerms.get(
          download.contractTermsHash,
        );
        if (!contractTermsRecord) {
          return;
        }
        if (
          shouldSkipSearch(transactionsRequest, [
            contractTermsRecord?.contractTermsRaw?.summary || "",
          ])
        ) {
          return;
        }

        const contractData = extractContractData(
          contractTermsRecord?.contractTermsRaw,
          download.contractTermsHash,
          download.contractTermsMerchantSig,
        );

        const filteredRefunds = await Promise.all(
          Object.values(purchase.refunds).map(async (r) => {
            const t = await tx.tombstones.get(
              makeTombstoneId(
                TombstoneTag.DeleteRefund,
                purchase.proposalId,
                `${r.executionTime.t_s}`,
              ),
            );
            if (!t) return r;
            return undefined;
          }),
        );

        const cleanRefunds = filteredRefunds.filter(
          (x): x is WalletRefundItem => !!x,
        );

        const refunds = mergeRefundByExecutionTime(
          cleanRefunds,
          Amounts.getZero(download.currency),
        );

        refunds.forEach(async (refundInfo) => {
          transactions.push(
            await buildTransactionForRefund(
              purchase,
              contractData,
              refundInfo,
              undefined,
            ),
          );
        });

        const payOpId = RetryTags.forPay(purchase);
        const payRetryRecord = await tx.operationRetries.get(payOpId);
        transactions.push(
          await buildTransactionForPurchase(
            purchase,
            contractData,
            refunds,
            payRetryRecord,
          ),
        );
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
        transactions.push(buildTransactionForTip(tipRecord, retryRecord));
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

  const { type, args: rest } = parseId("any", transactionId);

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
  const { type, args: rest } = parseId("txn", transactionId);

  if (
    type === TransactionType.Withdrawal ||
    type === TransactionType.PeerPullCredit ||
    type === TransactionType.PeerPushCredit
  ) {
    const withdrawalGroupId = rest[0];
    await ws.db
      .mktx((x) => [x.withdrawalGroups, x.tombstones])
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
      .mktx((x) => [x.purchases, x.tombstones])
      .runReadWrite(async (tx) => {
        let found = false;
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
      .mktx((x) => [x.refreshGroups, x.tombstones])
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
      .mktx((x) => [x.tips, x.tombstones])
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
      .mktx((x) => [x.depositGroups, x.tombstones])
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
      .mktx((x) => [x.purchases, x.tombstones])
      .runReadWrite(async (tx) => {
        const purchase = await tx.purchases.get(proposalId);
        if (purchase) {
          // This should just influence the history view,
          // but won't delete any actual refund information.
          await tx.tombstones.put({
            id: makeTombstoneId(
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
      .mktx((x) => [x.peerPullPaymentIncoming, x.tombstones])
      .runReadWrite(async (tx) => {
        const debit = await tx.peerPullPaymentIncoming.get(
          peerPullPaymentIncomingId,
        );
        if (debit) {
          await tx.peerPullPaymentIncoming.delete(peerPullPaymentIncomingId);
          await tx.tombstones.put({
            id: makeTombstoneId(
              TombstoneTag.DeletePeerPullDebit,
              peerPullPaymentIncomingId,
            ),
          });
        }
      });
  } else if (type === TransactionType.PeerPushDebit) {
    const pursePub = rest[0];
    await ws.db
      .mktx((x) => [x.peerPushPaymentInitiations, x.tombstones])
      .runReadWrite(async (tx) => {
        const debit = await tx.peerPushPaymentInitiations.get(pursePub);
        if (debit) {
          await tx.peerPushPaymentInitiations.delete(pursePub);
          await tx.tombstones.put({
            id: makeTombstoneId(TombstoneTag.DeletePeerPushDebit, pursePub),
          });
        }
      });
  } else {
    const unknownTxType: never = type;
    throw Error(`can't delete a '${unknownTxType}' transaction`);
  }
}
