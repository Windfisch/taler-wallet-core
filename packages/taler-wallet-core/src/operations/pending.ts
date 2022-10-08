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
  WalletStoresV1,
  BackupProviderStateTag,
  RefreshCoinStatus,
  OperationStatus,
  OperationStatusRange,
} from "../db.js";
import {
  PendingOperationsResponse,
  PendingTaskType,
} from "../pending-types.js";
import { AbsoluteTime } from "@gnu-taler/taler-util";
import { InternalWalletState } from "../internal-wallet-state.js";
import { GetReadOnlyAccess } from "../util/query.js";
import { RetryTags } from "../util/retries.js";
import { GlobalIDB } from "@gnu-taler/idb-bridge";

function getPendingCommon(
  ws: InternalWalletState,
  opTag: string,
  timestampDue: AbsoluteTime,
): {
  id: string;
  isDue: boolean;
  timestampDue: AbsoluteTime;
  isLongpolling: boolean;
} {
  const isDue =
    AbsoluteTime.isExpired(timestampDue) && !ws.activeLongpoll[opTag];
  return {
    id: opTag,
    isDue,
    timestampDue,
    isLongpolling: !!ws.activeLongpoll[opTag],
  };
}

async function gatherExchangePending(
  ws: InternalWalletState,
  tx: GetReadOnlyAccess<{
    exchanges: typeof WalletStoresV1.exchanges;
    exchangeDetails: typeof WalletStoresV1.exchangeDetails;
    operationRetries: typeof WalletStoresV1.operationRetries;
  }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  // FIXME: We should do a range query here based on the update time.
  await tx.exchanges.iter().forEachAsync(async (exch) => {
    const opTag = RetryTags.forExchangeUpdate(exch);
    let opr = await tx.operationRetries.get(opTag);
    const timestampDue =
      opr?.retryInfo.nextRetry ?? AbsoluteTime.fromTimestamp(exch.nextUpdate);
    resp.pendingOperations.push({
      type: PendingTaskType.ExchangeUpdate,
      ...getPendingCommon(ws, opTag, timestampDue),
      givesLifeness: false,
      exchangeBaseUrl: exch.baseUrl,
      lastError: opr?.lastError,
    });

    // We only schedule a check for auto-refresh if the exchange update
    // was successful.
    if (!opr?.lastError) {
      resp.pendingOperations.push({
        type: PendingTaskType.ExchangeCheckRefresh,
        ...getPendingCommon(ws, opTag, timestampDue),
        timestampDue: AbsoluteTime.fromTimestamp(exch.nextRefreshCheck),
        givesLifeness: false,
        exchangeBaseUrl: exch.baseUrl,
      });
    }
  });
}

async function gatherRefreshPending(
  ws: InternalWalletState,
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

    const timestampDue = retryRecord?.retryInfo.nextRetry ?? AbsoluteTime.now();

    resp.pendingOperations.push({
      type: PendingTaskType.Refresh,
      ...getPendingCommon(ws, opId, timestampDue),
      givesLifeness: true,
      refreshGroupId: r.refreshGroupId,
      finishedPerCoin: r.statusPerCoin.map(
        (x) => x === RefreshCoinStatus.Finished,
      ),
      retryInfo: retryRecord?.retryInfo,
    });
  }
}

async function gatherWithdrawalPending(
  ws: InternalWalletState,
  tx: GetReadOnlyAccess<{
    withdrawalGroups: typeof WalletStoresV1.withdrawalGroups;
    planchets: typeof WalletStoresV1.planchets;
    operationRetries: typeof WalletStoresV1.operationRetries;
  }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  const wsrs = await tx.withdrawalGroups.indexes.byStatus.getAll(
    GlobalIDB.KeyRange.bound(
      OperationStatusRange.ACTIVE_START,
      OperationStatusRange.ACTIVE_END,
    ),
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
      ...getPendingCommon(
        ws,
        opTag,
        opr.retryInfo?.nextRetry ?? AbsoluteTime.now(),
      ),
      givesLifeness: true,
      withdrawalGroupId: wsr.withdrawalGroupId,
      lastError: opr.lastError,
      retryInfo: opr.retryInfo,
    });
  }
}

async function gatherDepositPending(
  ws: InternalWalletState,
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
      ...getPendingCommon(ws, opId, timestampDue),
      givesLifeness: true,
      depositGroupId: dg.depositGroupId,
      lastError: retryRecord?.lastError,
      retryInfo: retryRecord?.retryInfo,
    });
  }
}

async function gatherTipPending(
  ws: InternalWalletState,
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
    const timestampDue = retryRecord?.retryInfo.nextRetry ?? AbsoluteTime.now();
    if (tip.acceptedTimestamp) {
      resp.pendingOperations.push({
        type: PendingTaskType.TipPickup,
        ...getPendingCommon(ws, opId, timestampDue),
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
  ws: InternalWalletState,
  tx: GetReadOnlyAccess<{
    purchases: typeof WalletStoresV1.purchases;
    operationRetries: typeof WalletStoresV1.operationRetries;
  }>,
  now: AbsoluteTime,
  resp: PendingOperationsResponse,
): Promise<void> {
  // FIXME: Only iter purchases with some "active" flag!
  const keyRange = GlobalIDB.KeyRange.bound(
    OperationStatusRange.ACTIVE_START,
    OperationStatusRange.ACTIVE_END,
  );
  await tx.purchases.indexes.byStatus
    .iter(keyRange)
    .forEachAsync(async (pr) => {
      const opId = RetryTags.forPay(pr);
      const retryRecord = await tx.operationRetries.get(opId);
      const timestampDue =
        retryRecord?.retryInfo.nextRetry ?? AbsoluteTime.now();
      resp.pendingOperations.push({
        type: PendingTaskType.Purchase,
        ...getPendingCommon(ws, opId, timestampDue),
        givesLifeness: true,
        statusStr: ProposalStatus[pr.status],
        proposalId: pr.proposalId,
        retryInfo: retryRecord?.retryInfo,
        lastError: retryRecord?.lastError,
      });
    });
}

async function gatherRecoupPending(
  ws: InternalWalletState,
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
    const timestampDue = retryRecord?.retryInfo.nextRetry ?? AbsoluteTime.now();
    resp.pendingOperations.push({
      type: PendingTaskType.Recoup,
      ...getPendingCommon(ws, opId, timestampDue),
      givesLifeness: true,
      recoupGroupId: rg.recoupGroupId,
      retryInfo: retryRecord?.retryInfo,
      lastError: retryRecord?.lastError,
    });
  });
}

async function gatherBackupPending(
  ws: InternalWalletState,
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
      const timestampDue = AbsoluteTime.fromTimestamp(
        bp.state.nextBackupTimestamp,
      );
      resp.pendingOperations.push({
        type: PendingTaskType.Backup,
        ...getPendingCommon(ws, opId, timestampDue),
        givesLifeness: false,
        backupProviderBaseUrl: bp.baseUrl,
        lastError: undefined,
      });
    } else if (bp.state.tag === BackupProviderStateTag.Retrying) {
      const timestampDue =
        retryRecord?.retryInfo?.nextRetry ?? AbsoluteTime.now();
      resp.pendingOperations.push({
        type: PendingTaskType.Backup,
        ...getPendingCommon(ws, opId, timestampDue),
        givesLifeness: false,
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
      await gatherExchangePending(ws, tx, now, resp);
      await gatherRefreshPending(ws, tx, now, resp);
      await gatherWithdrawalPending(ws, tx, now, resp);
      await gatherDepositPending(ws, tx, now, resp);
      await gatherTipPending(ws, tx, now, resp);
      await gatherPurchasePending(ws, tx, now, resp);
      await gatherRecoupPending(ws, tx, now, resp);
      await gatherBackupPending(ws, tx, now, resp);
      return resp;
    });
}
