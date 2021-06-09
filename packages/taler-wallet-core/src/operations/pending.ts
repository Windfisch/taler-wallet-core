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
import {
  ExchangeUpdateStatus,
  ProposalStatus,
  ReserveRecordStatus,
  AbortStatus,
  WalletStoresV1,
} from "../db.js";
import {
  PendingOperationsResponse,
  PendingOperationType,
  ExchangeUpdateOperationStage,
  ReserveType,
} from "../pending-types";
import {
  Duration,
  getTimestampNow,
  Timestamp,
  getDurationRemaining,
  durationMin,
} from "@gnu-taler/taler-util";
import { InternalWalletState } from "./state";
import { getBalancesInsideTransaction } from "./balance";
import { getExchangeDetails } from "./exchanges.js";
import { GetReadOnlyAccess } from "../util/query.js";

function updateRetryDelay(
  oldDelay: Duration,
  now: Timestamp,
  retryTimestamp: Timestamp,
): Duration {
  const remaining = getDurationRemaining(retryTimestamp, now);
  const nextDelay = durationMin(oldDelay, remaining);
  return nextDelay;
}

async function gatherExchangePending(
  tx: GetReadOnlyAccess<{
    exchanges: typeof WalletStoresV1.exchanges;
    exchangeDetails: typeof WalletStoresV1.exchangeDetails;
  }>,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue = false,
): Promise<void> {
  await tx.exchanges.iter().forEachAsync(async (e) => {
    switch (e.updateStatus) {
      case ExchangeUpdateStatus.Finished:
        if (e.lastError) {
          resp.pendingOperations.push({
            type: PendingOperationType.Bug,
            givesLifeness: false,
            message:
              "Exchange record is in FINISHED state but has lastError set",
            details: {
              exchangeBaseUrl: e.baseUrl,
            },
          });
        }
        const details = await getExchangeDetails(tx, e.baseUrl);
        const keysUpdateRequired =
          details && details.nextUpdateTime.t_ms < now.t_ms;
        if (keysUpdateRequired) {
          resp.pendingOperations.push({
            type: PendingOperationType.ExchangeUpdate,
            givesLifeness: false,
            stage: ExchangeUpdateOperationStage.FetchKeys,
            exchangeBaseUrl: e.baseUrl,
            lastError: e.lastError,
            reason: "scheduled",
          });
        }
        if (
          details &&
          (!e.nextRefreshCheck || e.nextRefreshCheck.t_ms < now.t_ms)
        ) {
          resp.pendingOperations.push({
            type: PendingOperationType.ExchangeCheckRefresh,
            exchangeBaseUrl: e.baseUrl,
            givesLifeness: false,
          });
        }
        break;
      case ExchangeUpdateStatus.FetchKeys:
        if (onlyDue && e.retryInfo.nextRetry.t_ms > now.t_ms) {
          return;
        }
        resp.pendingOperations.push({
          type: PendingOperationType.ExchangeUpdate,
          givesLifeness: false,
          stage: ExchangeUpdateOperationStage.FetchKeys,
          exchangeBaseUrl: e.baseUrl,
          lastError: e.lastError,
          reason: e.updateReason || "unknown",
        });
        break;
      case ExchangeUpdateStatus.FetchWire:
        if (onlyDue && e.retryInfo.nextRetry.t_ms > now.t_ms) {
          return;
        }
        resp.pendingOperations.push({
          type: PendingOperationType.ExchangeUpdate,
          givesLifeness: false,
          stage: ExchangeUpdateOperationStage.FetchWire,
          exchangeBaseUrl: e.baseUrl,
          lastError: e.lastError,
          reason: e.updateReason || "unknown",
        });
        break;
      case ExchangeUpdateStatus.FinalizeUpdate:
        if (onlyDue && e.retryInfo.nextRetry.t_ms > now.t_ms) {
          return;
        }
        resp.pendingOperations.push({
          type: PendingOperationType.ExchangeUpdate,
          givesLifeness: false,
          stage: ExchangeUpdateOperationStage.FinalizeUpdate,
          exchangeBaseUrl: e.baseUrl,
          lastError: e.lastError,
          reason: e.updateReason || "unknown",
        });
        break;
      default:
        resp.pendingOperations.push({
          type: PendingOperationType.Bug,
          givesLifeness: false,
          message: "Unknown exchangeUpdateStatus",
          details: {
            exchangeBaseUrl: e.baseUrl,
            exchangeUpdateStatus: e.updateStatus,
          },
        });
        break;
    }
  });
}

async function gatherReservePending(
  tx: GetReadOnlyAccess<{ reserves: typeof WalletStoresV1.reserves }>,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue = false,
): Promise<void> {
  // FIXME: this should be optimized by using an index for "onlyDue==true".
  await tx.reserves.iter().forEach((reserve) => {
    const reserveType = reserve.bankInfo
      ? ReserveType.TalerBankWithdraw
      : ReserveType.Manual;
    if (!reserve.retryInfo.active) {
      return;
    }
    switch (reserve.reserveStatus) {
      case ReserveRecordStatus.DORMANT:
        // nothing to report as pending
        break;
      case ReserveRecordStatus.WAIT_CONFIRM_BANK:
      case ReserveRecordStatus.QUERYING_STATUS:
      case ReserveRecordStatus.REGISTERING_BANK:
        resp.nextRetryDelay = updateRetryDelay(
          resp.nextRetryDelay,
          now,
          reserve.retryInfo.nextRetry,
        );
        if (onlyDue && reserve.retryInfo.nextRetry.t_ms > now.t_ms) {
          return;
        }
        resp.pendingOperations.push({
          type: PendingOperationType.Reserve,
          givesLifeness: true,
          stage: reserve.reserveStatus,
          timestampCreated: reserve.timestampCreated,
          reserveType,
          reservePub: reserve.reservePub,
          retryInfo: reserve.retryInfo,
        });
        break;
      default:
        resp.pendingOperations.push({
          type: PendingOperationType.Bug,
          givesLifeness: false,
          message: "Unknown reserve record status",
          details: {
            reservePub: reserve.reservePub,
            reserveStatus: reserve.reserveStatus,
          },
        });
        break;
    }
  });
}

async function gatherRefreshPending(
  tx: GetReadOnlyAccess<{ refreshGroups: typeof WalletStoresV1.refreshGroups }>,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue = false,
): Promise<void> {
  await tx.refreshGroups.iter().forEach((r) => {
    if (r.timestampFinished) {
      return;
    }
    resp.nextRetryDelay = updateRetryDelay(
      resp.nextRetryDelay,
      now,
      r.retryInfo.nextRetry,
    );
    if (onlyDue && r.retryInfo.nextRetry.t_ms > now.t_ms) {
      return;
    }

    resp.pendingOperations.push({
      type: PendingOperationType.Refresh,
      givesLifeness: true,
      refreshGroupId: r.refreshGroupId,
      finishedPerCoin: r.finishedPerCoin,
      retryInfo: r.retryInfo,
    });
  });
}

async function gatherWithdrawalPending(
  tx: GetReadOnlyAccess<{
    withdrawalGroups: typeof WalletStoresV1.withdrawalGroups;
    planchets: typeof WalletStoresV1.planchets;
  }>,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue = false,
): Promise<void> {
  await tx.withdrawalGroups.iter().forEachAsync(async (wsr) => {
    if (wsr.timestampFinish) {
      return;
    }
    resp.nextRetryDelay = updateRetryDelay(
      resp.nextRetryDelay,
      now,
      wsr.retryInfo.nextRetry,
    );
    if (onlyDue && wsr.retryInfo.nextRetry.t_ms > now.t_ms) {
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
      type: PendingOperationType.Withdraw,
      givesLifeness: true,
      numCoinsTotal,
      numCoinsWithdrawn,
      withdrawalGroupId: wsr.withdrawalGroupId,
      lastError: wsr.lastError,
      retryInfo: wsr.retryInfo,
    });
  });
}

async function gatherProposalPending(
  tx: GetReadOnlyAccess<{ proposals: typeof WalletStoresV1.proposals }>,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue = false,
): Promise<void> {
  await tx.proposals.iter().forEach((proposal) => {
    if (proposal.proposalStatus == ProposalStatus.PROPOSED) {
      if (onlyDue) {
        return;
      }
      const dl = proposal.download;
      if (!dl) {
        resp.pendingOperations.push({
          type: PendingOperationType.Bug,
          message: "proposal is in invalid state",
          details: {},
          givesLifeness: false,
        });
      } else {
        resp.pendingOperations.push({
          type: PendingOperationType.ProposalChoice,
          givesLifeness: false,
          merchantBaseUrl: dl.contractData.merchantBaseUrl,
          proposalId: proposal.proposalId,
          proposalTimestamp: proposal.timestamp,
        });
      }
    } else if (proposal.proposalStatus == ProposalStatus.DOWNLOADING) {
      resp.nextRetryDelay = updateRetryDelay(
        resp.nextRetryDelay,
        now,
        proposal.retryInfo.nextRetry,
      );
      if (onlyDue && proposal.retryInfo.nextRetry.t_ms > now.t_ms) {
        return;
      }
      resp.pendingOperations.push({
        type: PendingOperationType.ProposalDownload,
        givesLifeness: true,
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

async function gatherTipPending(
  tx: GetReadOnlyAccess<{ tips: typeof WalletStoresV1.tips }>,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue = false,
): Promise<void> {
  await tx.tips.iter().forEach((tip) => {
    if (tip.pickedUpTimestamp) {
      return;
    }
    resp.nextRetryDelay = updateRetryDelay(
      resp.nextRetryDelay,
      now,
      tip.retryInfo.nextRetry,
    );
    if (onlyDue && tip.retryInfo.nextRetry.t_ms > now.t_ms) {
      return;
    }
    if (tip.acceptedTimestamp) {
      resp.pendingOperations.push({
        type: PendingOperationType.TipPickup,
        givesLifeness: true,
        merchantBaseUrl: tip.merchantBaseUrl,
        tipId: tip.walletTipId,
        merchantTipId: tip.merchantTipId,
      });
    }
  });
}

async function gatherPurchasePending(
  tx: GetReadOnlyAccess<{ purchases: typeof WalletStoresV1.purchases }>,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue = false,
): Promise<void> {
  await tx.purchases.iter().forEach((pr) => {
    if (pr.paymentSubmitPending && pr.abortStatus === AbortStatus.None) {
      resp.nextRetryDelay = updateRetryDelay(
        resp.nextRetryDelay,
        now,
        pr.payRetryInfo.nextRetry,
      );
      if (!onlyDue || pr.payRetryInfo.nextRetry.t_ms <= now.t_ms) {
        resp.pendingOperations.push({
          type: PendingOperationType.Pay,
          givesLifeness: true,
          isReplay: false,
          proposalId: pr.proposalId,
          retryInfo: pr.payRetryInfo,
          lastError: pr.lastPayError,
        });
      }
    }
    if (pr.refundQueryRequested) {
      resp.nextRetryDelay = updateRetryDelay(
        resp.nextRetryDelay,
        now,
        pr.refundStatusRetryInfo.nextRetry,
      );
      if (!onlyDue || pr.refundStatusRetryInfo.nextRetry.t_ms <= now.t_ms) {
        resp.pendingOperations.push({
          type: PendingOperationType.RefundQuery,
          givesLifeness: true,
          proposalId: pr.proposalId,
          retryInfo: pr.refundStatusRetryInfo,
          lastError: pr.lastRefundStatusError,
        });
      }
    }
  });
}

async function gatherRecoupPending(
  tx: GetReadOnlyAccess<{ recoupGroups: typeof WalletStoresV1.recoupGroups }>,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue = false,
): Promise<void> {
  await tx.recoupGroups.iter().forEach((rg) => {
    if (rg.timestampFinished) {
      return;
    }
    resp.nextRetryDelay = updateRetryDelay(
      resp.nextRetryDelay,
      now,
      rg.retryInfo.nextRetry,
    );
    if (onlyDue && rg.retryInfo.nextRetry.t_ms > now.t_ms) {
      return;
    }
    resp.pendingOperations.push({
      type: PendingOperationType.Recoup,
      givesLifeness: true,
      recoupGroupId: rg.recoupGroupId,
      retryInfo: rg.retryInfo,
      lastError: rg.lastError,
    });
  });
}

async function gatherDepositPending(
  tx: GetReadOnlyAccess<{ depositGroups: typeof WalletStoresV1.depositGroups }>,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue = false,
): Promise<void> {
  await tx.depositGroups.iter().forEach((dg) => {
    if (dg.timestampFinished) {
      return;
    }
    resp.nextRetryDelay = updateRetryDelay(
      resp.nextRetryDelay,
      now,
      dg.retryInfo.nextRetry,
    );
    if (onlyDue && dg.retryInfo.nextRetry.t_ms > now.t_ms) {
      return;
    }
    resp.pendingOperations.push({
      type: PendingOperationType.Deposit,
      givesLifeness: true,
      depositGroupId: dg.depositGroupId,
      retryInfo: dg.retryInfo,
      lastError: dg.lastError,
    });
  });
}

export async function getPendingOperations(
  ws: InternalWalletState,
  { onlyDue = false } = {},
): Promise<PendingOperationsResponse> {
  const now = getTimestampNow();
  return await ws.db
    .mktx((x) => ({
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
      const walletBalance = await getBalancesInsideTransaction(ws, tx);
      const resp: PendingOperationsResponse = {
        nextRetryDelay: { d_ms: Number.MAX_SAFE_INTEGER },
        onlyDue: onlyDue,
        walletBalance,
        pendingOperations: [],
      };
      await gatherExchangePending(tx, now, resp, onlyDue);
      await gatherReservePending(tx, now, resp, onlyDue);
      await gatherRefreshPending(tx, now, resp, onlyDue);
      await gatherWithdrawalPending(tx, now, resp, onlyDue);
      await gatherProposalPending(tx, now, resp, onlyDue);
      await gatherTipPending(tx, now, resp, onlyDue);
      await gatherPurchasePending(tx, now, resp, onlyDue);
      await gatherRecoupPending(tx, now, resp, onlyDue);
      await gatherDepositPending(tx, now, resp, onlyDue);
      return resp;
    });
}
