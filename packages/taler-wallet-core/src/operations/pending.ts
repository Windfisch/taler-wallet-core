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
 * Derive pending tasks from the wallet database.
 */

/**
 * Imports.
 */
import {
  ProposalStatus,
  AbortStatus,
  WalletStoresV1,
  BackupProviderStateTag,
  RefreshCoinStatus,
  OperationStatus,
} from "../db.js";
import {
  PendingOperationsResponse,
  PendingTaskType,
} from "../pending-types.js";
import { AbsoluteTime } from "@gnu-taler/taler-util";
import { InternalWalletState } from "../internal-wallet-state.js";
import { GetReadOnlyAccess } from "../util/query.js";
import { RetryTags } from "../util/retries.js";
import { Wallet } from "../wallet.js";

async function gatherExchangePending(
  tx: GetReadOnlyAccess<{
    exchanges: typeof WalletStoresV1.exchanges;
    exchangeDetails: typeof WalletStoresV1.exchangeDetails;
    operationRetries: typeof WalletStoresV1.operationRetries;
  }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.exchanges.iter().forEachAsync(async (exch) => {
    const opTag = RetryTags.forExchangeUpdate(exch);
    let opr = await tx.operationRetries.get(opTag);
    resp.pendingOperations.push({
      type: PendingTaskType.ExchangeUpdate,
      id: opTag,
      givesLifeness: false,
      timestampDue:
        opr?.retryInfo.nextRetry ?? AbsoluteTime.fromTimestamp(exch.nextUpdate),
      exchangeBaseUrl: exch.baseUrl,
      lastError: opr?.lastError,
    });

    // We only schedule a check for auto-refresh if the exchange update
    // was successful.
    if (!opr?.lastError) {
      resp.pendingOperations.push({
        type: PendingTaskType.ExchangeCheckRefresh,
        id: RetryTags.forExchangeCheckRefresh(exch),
        timestampDue: AbsoluteTime.fromTimestamp(exch.nextRefreshCheck),
        givesLifeness: false,
        exchangeBaseUrl: exch.baseUrl,
      });
    }
  });
}

async function gatherRefreshPending(
  tx: GetReadOnlyAccess<{
    refreshGroups: typeof WalletStoresV1.refreshGroups;
    operationRetries: typeof WalletStoresV1.operationRetries;
  }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  const refreshGroups = await tx.refreshGroups.indexes.byStatus.getAll(
    OperationStatus.Pending,
  );
  for (const r of refreshGroups) {
    if (r.timestampFinished) {
      return;
    }
    if (r.frozen) {
      return;
    }
    const opId = RetryTags.forRefresh(r);
    const retryRecord = await tx.operationRetries.get(opId);

    resp.pendingOperations.push({
      type: PendingTaskType.Refresh,
      id: opId,
      givesLifeness: true,
      timestampDue: retryRecord?.retryInfo.nextRetry ?? AbsoluteTime.now(),
      refreshGroupId: r.refreshGroupId,
      finishedPerCoin: r.statusPerCoin.map(
        (x) => x === RefreshCoinStatus.Finished,
      ),
      retryInfo: retryRecord?.retryInfo,
    });
  }
}

async function gatherWithdrawalPending(
  tx: GetReadOnlyAccess<{
    withdrawalGroups: typeof WalletStoresV1.withdrawalGroups;
    planchets: typeof WalletStoresV1.planchets;
    operationRetries: typeof WalletStoresV1.operationRetries;
  }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  const wsrs = await tx.withdrawalGroups.indexes.byStatus.getAll(
    OperationStatus.Pending,
  );
  for (const wsr of wsrs) {
    if (wsr.timestampFinish) {
      return;
    }
    const opTag = RetryTags.forWithdrawal(wsr);
    let opr = await tx.operationRetries.get(opTag);
    const now = AbsoluteTime.now();
    if (!opr) {
      opr = {
        id: opTag,
        retryInfo: {
          firstTry: now,
          nextRetry: now,
          retryCounter: 0,
        },
      };
    }
    resp.pendingOperations.push({
      type: PendingTaskType.Withdraw,
      id: opTag,
      givesLifeness: true,
      timestampDue: opr.retryInfo?.nextRetry ?? AbsoluteTime.now(),
      withdrawalGroupId: wsr.withdrawalGroupId,
      lastError: opr.lastError,
      retryInfo: opr.retryInfo,
    });
  }
}

async function gatherProposalPending(
  tx: GetReadOnlyAccess<{
    proposals: typeof WalletStoresV1.proposals;
    operationRetries: typeof WalletStoresV1.operationRetries;
  }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.proposals.iter().forEachAsync(async (proposal) => {
    if (proposal.proposalStatus == ProposalStatus.Proposed) {
      // Nothing to do, user needs to choose.
    } else if (proposal.proposalStatus == ProposalStatus.Downloading) {
      const opId = RetryTags.forProposalClaim(proposal);
      const retryRecord = await tx.operationRetries.get(opId);
      const timestampDue =
        retryRecord?.retryInfo?.nextRetry ?? AbsoluteTime.now();
      resp.pendingOperations.push({
        type: PendingTaskType.ProposalDownload,
        id: opId,
        givesLifeness: true,
        timestampDue,
        merchantBaseUrl: proposal.merchantBaseUrl,
        orderId: proposal.orderId,
        proposalId: proposal.proposalId,
        proposalTimestamp: proposal.timestamp,
        lastError: retryRecord?.lastError,
        retryInfo: retryRecord?.retryInfo,
      });
    }
  });
}

async function gatherDepositPending(
  tx: GetReadOnlyAccess<{
    depositGroups: typeof WalletStoresV1.depositGroups;
    operationRetries: typeof WalletStoresV1.operationRetries;
  }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  const dgs = await tx.depositGroups.indexes.byStatus.getAll(
    OperationStatus.Pending,
  );
  for (const dg of dgs) {
    if (dg.timestampFinished) {
      return;
    }
    const opId = RetryTags.forDeposit(dg);
    const retryRecord = await tx.operationRetries.get(opId);
    const timestampDue = retryRecord?.retryInfo.nextRetry ?? AbsoluteTime.now();
    resp.pendingOperations.push({
      type: PendingTaskType.Deposit,
      id: opId,
      givesLifeness: true,
      timestampDue,
      depositGroupId: dg.depositGroupId,
      lastError: retryRecord?.lastError,
      retryInfo: retryRecord?.retryInfo,
    });
  }
}

async function gatherTipPending(
  tx: GetReadOnlyAccess<{
    tips: typeof WalletStoresV1.tips;
    operationRetries: typeof WalletStoresV1.operationRetries;
  }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.tips.iter().forEachAsync(async (tip) => {
    // FIXME: The tip record needs a proper status field!
    if (tip.pickedUpTimestamp) {
      return;
    }
    const opId = RetryTags.forTipPickup(tip);
    const retryRecord = await tx.operationRetries.get(opId);
    if (tip.acceptedTimestamp) {
      resp.pendingOperations.push({
        type: PendingTaskType.TipPickup,
        id: opId,
        givesLifeness: true,
        timestampDue: retryRecord?.retryInfo.nextRetry ?? AbsoluteTime.now(),
        merchantBaseUrl: tip.merchantBaseUrl,
        tipId: tip.walletTipId,
        merchantTipId: tip.merchantTipId,
      });
    }
  });
}

async function gatherPurchasePending(
  tx: GetReadOnlyAccess<{
    purchases: typeof WalletStoresV1.purchases;
    operationRetries: typeof WalletStoresV1.operationRetries;
  }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  // FIXME: Only iter purchases with some "active" flag!
  await tx.purchases.iter().forEachAsync(async (pr) => {
    if (
      pr.paymentSubmitPending &&
      pr.abortStatus === AbortStatus.None &&
      !pr.payFrozen
    ) {
      const payOpId = RetryTags.forPay(pr);
      const payRetryRecord = await tx.operationRetries.get(payOpId);

      const timestampDue =
        payRetryRecord?.retryInfo.nextRetry ?? AbsoluteTime.now();
      resp.pendingOperations.push({
        type: PendingTaskType.Pay,
        id: payOpId,
        givesLifeness: true,
        timestampDue,
        isReplay: false,
        proposalId: pr.proposalId,
        retryInfo: payRetryRecord?.retryInfo,
        lastError: payRetryRecord?.lastError,
      });
    }
    if (pr.refundQueryRequested) {
      const refundQueryOpId = RetryTags.forRefundQuery(pr);
      const refundQueryRetryRecord = await tx.operationRetries.get(
        refundQueryOpId,
      );
      resp.pendingOperations.push({
        type: PendingTaskType.RefundQuery,
        id: refundQueryOpId,
        givesLifeness: true,
        timestampDue:
          refundQueryRetryRecord?.retryInfo.nextRetry ?? AbsoluteTime.now(),
        proposalId: pr.proposalId,
        retryInfo: refundQueryRetryRecord?.retryInfo,
        lastError: refundQueryRetryRecord?.lastError,
      });
    }
  });
}

async function gatherRecoupPending(
  tx: GetReadOnlyAccess<{
    recoupGroups: typeof WalletStoresV1.recoupGroups;
    operationRetries: typeof WalletStoresV1.operationRetries;
  }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.recoupGroups.iter().forEachAsync(async (rg) => {
    if (rg.timestampFinished) {
      return;
    }
    const opId = RetryTags.forRecoup(rg);
    const retryRecord = await tx.operationRetries.get(opId);
    resp.pendingOperations.push({
      type: PendingTaskType.Recoup,
      id: opId,
      givesLifeness: true,
      timestampDue: retryRecord?.retryInfo.nextRetry ?? AbsoluteTime.now(),
      recoupGroupId: rg.recoupGroupId,
      retryInfo: retryRecord?.retryInfo,
      lastError: retryRecord?.lastError,
    });
  });
}

async function gatherBackupPending(
  tx: GetReadOnlyAccess<{
    backupProviders: typeof WalletStoresV1.backupProviders;
    operationRetries: typeof WalletStoresV1.operationRetries;
  }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.backupProviders.iter().forEachAsync(async (bp) => {
    const opId = RetryTags.forBackup(bp);
    const retryRecord = await tx.operationRetries.get(opId);
    if (bp.state.tag === BackupProviderStateTag.Ready) {
      resp.pendingOperations.push({
        type: PendingTaskType.Backup,
        id: opId,
        givesLifeness: false,
        timestampDue: AbsoluteTime.fromTimestamp(bp.state.nextBackupTimestamp),
        backupProviderBaseUrl: bp.baseUrl,
        lastError: undefined,
      });
    } else if (bp.state.tag === BackupProviderStateTag.Retrying) {
      resp.pendingOperations.push({
        type: PendingTaskType.Backup,
        id: opId,
        givesLifeness: false,
        timestampDue: retryRecord?.retryInfo?.nextRetry ?? AbsoluteTime.now(),
        backupProviderBaseUrl: bp.baseUrl,
        retryInfo: retryRecord?.retryInfo,
        lastError: retryRecord?.lastError,
      });
    }
  });
}

export async function getPendingOperations(
  ws: InternalWalletState,
): Promise<PendingOperationsResponse> {
  const now = AbsoluteTime.now();
  return await ws.db
    .mktx((x) => [
      x.backupProviders,
      x.exchanges,
      x.exchangeDetails,
      x.refreshGroups,
      x.coins,
      x.withdrawalGroups,
      x.proposals,
      x.tips,
      x.purchases,
      x.planchets,
      x.depositGroups,
      x.recoupGroups,
      x.operationRetries,
    ])
    .runReadWrite(async (tx) => {
      const resp: PendingOperationsResponse = {
        pendingOperations: [],
      };
      await gatherExchangePending(tx, now, resp);
      await gatherRefreshPending(tx, now, resp);
      await gatherWithdrawalPending(tx, now, resp);
      await gatherProposalPending(tx, now, resp);
      await gatherDepositPending(tx, now, resp);
      await gatherTipPending(tx, now, resp);
      await gatherPurchasePending(tx, now, resp);
      await gatherRecoupPending(tx, now, resp);
      await gatherBackupPending(tx, now, resp);
      return resp;
    });
}
