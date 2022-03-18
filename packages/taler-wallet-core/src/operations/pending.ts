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
  ReserveRecordStatus,
  AbortStatus,
  WalletStoresV1,
  BackupProviderStateTag,
  RefreshCoinStatus,
  OperationStatus,
} from "../db.js";
import {
  PendingOperationsResponse,
  PendingTaskType,
  ReserveType,
} from "../pending-types.js";
import { AbsoluteTime } from "@gnu-taler/taler-util";
import { InternalWalletState } from "../common.js";
import { GetReadOnlyAccess } from "../util/query.js";

async function gatherExchangePending(
  tx: GetReadOnlyAccess<{
    exchanges: typeof WalletStoresV1.exchanges;
    exchangeDetails: typeof WalletStoresV1.exchangeDetails;
  }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.exchanges.iter().forEachAsync(async (e) => {
    resp.pendingOperations.push({
      type: PendingTaskType.ExchangeUpdate,
      givesLifeness: false,
      timestampDue: e.lastError
        ? e.retryInfo.nextRetry
        : AbsoluteTime.fromTimestamp(e.nextUpdate),
      exchangeBaseUrl: e.baseUrl,
      lastError: e.lastError,
    });

    resp.pendingOperations.push({
      type: PendingTaskType.ExchangeCheckRefresh,
      timestampDue: e.lastError
        ? e.retryInfo.nextRetry
        : AbsoluteTime.fromTimestamp(e.nextRefreshCheck),
      givesLifeness: false,
      exchangeBaseUrl: e.baseUrl,
    });
  });
}

async function gatherReservePending(
  tx: GetReadOnlyAccess<{ reserves: typeof WalletStoresV1.reserves }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  const reserves = await tx.reserves.indexes.byStatus.getAll(
    OperationStatus.Pending,
  );
  for (const reserve of reserves) {
    const reserveType = reserve.bankInfo
      ? ReserveType.TalerBankWithdraw
      : ReserveType.Manual;
    switch (reserve.reserveStatus) {
      case ReserveRecordStatus.Dormant:
        // nothing to report as pending
        break;
      case ReserveRecordStatus.WaitConfirmBank:
      case ReserveRecordStatus.QueryingStatus:
      case ReserveRecordStatus.RegisteringBank: {
        resp.pendingOperations.push({
          type: PendingTaskType.Reserve,
          givesLifeness: true,
          timestampDue: reserve.retryInfo?.nextRetry ?? AbsoluteTime.now(),
          stage: reserve.reserveStatus,
          timestampCreated: reserve.timestampCreated,
          reserveType,
          reservePub: reserve.reservePub,
          retryInfo: reserve.retryInfo,
        });
        break;
      }
      default:
        // FIXME: report problem!
        break;
    }
  }
}

async function gatherRefreshPending(
  tx: GetReadOnlyAccess<{ refreshGroups: typeof WalletStoresV1.refreshGroups }>,
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
    resp.pendingOperations.push({
      type: PendingTaskType.Refresh,
      givesLifeness: true,
      timestampDue: r.retryInfo.nextRetry,
      refreshGroupId: r.refreshGroupId,
      finishedPerCoin: r.statusPerCoin.map(
        (x) => x === RefreshCoinStatus.Finished,
      ),
      retryInfo: r.retryInfo,
    });
  }
}

async function gatherWithdrawalPending(
  tx: GetReadOnlyAccess<{
    withdrawalGroups: typeof WalletStoresV1.withdrawalGroups;
    planchets: typeof WalletStoresV1.planchets;
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
    let numCoinsWithdrawn = 0;
    let numCoinsTotal = 0;
    await tx.planchets.indexes.byGroup
      .iter(wsr.withdrawalGroupId)
      .forEach((x) => {
        numCoinsTotal++;
        if (x.withdrawalDone) {
          numCoinsWithdrawn++;
        }
      });
    resp.pendingOperations.push({
      type: PendingTaskType.Withdraw,
      givesLifeness: true,
      timestampDue: wsr.retryInfo.nextRetry,
      withdrawalGroupId: wsr.withdrawalGroupId,
      lastError: wsr.lastError,
      retryInfo: wsr.retryInfo,
    });
  }
}

async function gatherProposalPending(
  tx: GetReadOnlyAccess<{ proposals: typeof WalletStoresV1.proposals }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.proposals.iter().forEach((proposal) => {
    if (proposal.proposalStatus == ProposalStatus.Proposed) {
      // Nothing to do, user needs to choose.
    } else if (proposal.proposalStatus == ProposalStatus.Downloading) {
      const timestampDue = proposal.retryInfo?.nextRetry ?? AbsoluteTime.now();
      resp.pendingOperations.push({
        type: PendingTaskType.ProposalDownload,
        givesLifeness: true,
        timestampDue,
        merchantBaseUrl: proposal.merchantBaseUrl,
        orderId: proposal.orderId,
        proposalId: proposal.proposalId,
        proposalTimestamp: proposal.timestamp,
        lastError: proposal.lastError,
        retryInfo: proposal.retryInfo,
      });
    }
  });
}

async function gatherDepositPending(
  tx: GetReadOnlyAccess<{ depositGroups: typeof WalletStoresV1.depositGroups }>,
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
    const timestampDue = dg.retryInfo?.nextRetry ?? AbsoluteTime.now();
    resp.pendingOperations.push({
      type: PendingTaskType.Deposit,
      givesLifeness: true,
      timestampDue,
      depositGroupId: dg.depositGroupId,
      lastError: dg.lastError,
      retryInfo: dg.retryInfo,
    });
  }
}

async function gatherTipPending(
  tx: GetReadOnlyAccess<{ tips: typeof WalletStoresV1.tips }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.tips.iter().forEach((tip) => {
    if (tip.pickedUpTimestamp) {
      return;
    }
    if (tip.acceptedTimestamp) {
      resp.pendingOperations.push({
        type: PendingTaskType.TipPickup,
        givesLifeness: true,
        timestampDue: tip.retryInfo.nextRetry,
        merchantBaseUrl: tip.merchantBaseUrl,
        tipId: tip.walletTipId,
        merchantTipId: tip.merchantTipId,
      });
    }
  });
}

async function gatherPurchasePending(
  tx: GetReadOnlyAccess<{ purchases: typeof WalletStoresV1.purchases }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.purchases.iter().forEach((pr) => {
    if (
      pr.paymentSubmitPending &&
      pr.abortStatus === AbortStatus.None &&
      !pr.payFrozen
    ) {
      const timestampDue = pr.payRetryInfo?.nextRetry ?? AbsoluteTime.now();
      resp.pendingOperations.push({
        type: PendingTaskType.Pay,
        givesLifeness: true,
        timestampDue,
        isReplay: false,
        proposalId: pr.proposalId,
        retryInfo: pr.payRetryInfo,
        lastError: pr.lastPayError,
      });
    }
    if (pr.refundQueryRequested) {
      resp.pendingOperations.push({
        type: PendingTaskType.RefundQuery,
        givesLifeness: true,
        timestampDue: pr.refundStatusRetryInfo.nextRetry,
        proposalId: pr.proposalId,
        retryInfo: pr.refundStatusRetryInfo,
        lastError: pr.lastRefundStatusError,
      });
    }
  });
}

async function gatherRecoupPending(
  tx: GetReadOnlyAccess<{ recoupGroups: typeof WalletStoresV1.recoupGroups }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.recoupGroups.iter().forEach((rg) => {
    if (rg.timestampFinished) {
      return;
    }
    resp.pendingOperations.push({
      type: PendingTaskType.Recoup,
      givesLifeness: true,
      timestampDue: rg.retryInfo.nextRetry,
      recoupGroupId: rg.recoupGroupId,
      retryInfo: rg.retryInfo,
      lastError: rg.lastError,
    });
  });
}

async function gatherBackupPending(
  tx: GetReadOnlyAccess<{
    backupProviders: typeof WalletStoresV1.backupProviders;
  }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.backupProviders.iter().forEach((bp) => {
    if (bp.state.tag === BackupProviderStateTag.Ready) {
      resp.pendingOperations.push({
        type: PendingTaskType.Backup,
        givesLifeness: false,
        timestampDue: AbsoluteTime.fromTimestamp(bp.state.nextBackupTimestamp),
        backupProviderBaseUrl: bp.baseUrl,
        lastError: undefined,
      });
    } else if (bp.state.tag === BackupProviderStateTag.Retrying) {
      resp.pendingOperations.push({
        type: PendingTaskType.Backup,
        givesLifeness: false,
        timestampDue: bp.state.retryInfo.nextRetry,
        backupProviderBaseUrl: bp.baseUrl,
        retryInfo: bp.state.retryInfo,
        lastError: bp.state.lastError,
      });
    }
  });
}

export async function getPendingOperations(
  ws: InternalWalletState,
): Promise<PendingOperationsResponse> {
  const now = AbsoluteTime.now();
  return await ws.db
    .mktx((x) => ({
      backupProviders: x.backupProviders,
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
      reserves: x.reserves,
      refreshGroups: x.refreshGroups,
      coins: x.coins,
      withdrawalGroups: x.withdrawalGroups,
      proposals: x.proposals,
      tips: x.tips,
      purchases: x.purchases,
      planchets: x.planchets,
      depositGroups: x.depositGroups,
      recoupGroups: x.recoupGroups,
    }))
    .runReadWrite(async (tx) => {
      const resp: PendingOperationsResponse = {
        pendingOperations: [],
      };
      await gatherExchangePending(tx, now, resp);
      await gatherReservePending(tx, now, resp);
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
