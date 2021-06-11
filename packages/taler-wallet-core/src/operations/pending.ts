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
  ProposalStatus,
  ReserveRecordStatus,
  AbortStatus,
  WalletStoresV1,
} from "../db.js";
import {
  PendingOperationsResponse,
  PendingOperationType,
  ReserveType,
} from "../pending-types";
import { getTimestampNow, Timestamp } from "@gnu-taler/taler-util";
import { InternalWalletState } from "./state";
import { getBalancesInsideTransaction } from "./balance";
import { GetReadOnlyAccess } from "../util/query.js";

async function gatherExchangePending(
  tx: GetReadOnlyAccess<{
    exchanges: typeof WalletStoresV1.exchanges;
    exchangeDetails: typeof WalletStoresV1.exchangeDetails;
  }>,
  now: Timestamp,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.exchanges.iter().forEachAsync(async (e) => {
    resp.pendingOperations.push({
      type: PendingOperationType.ExchangeUpdate,
      givesLifeness: false,
      timestampDue: e.nextUpdate,
      exchangeBaseUrl: e.baseUrl,
      lastError: e.lastError,
    });

    resp.pendingOperations.push({
      type: PendingOperationType.ExchangeCheckRefresh,
      timestampDue: e.nextRefreshCheck,
      givesLifeness: false,
      exchangeBaseUrl: e.baseUrl,
    });
  });
}

async function gatherReservePending(
  tx: GetReadOnlyAccess<{ reserves: typeof WalletStoresV1.reserves }>,
  now: Timestamp,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.reserves.iter().forEach((reserve) => {
    const reserveType = reserve.bankInfo
      ? ReserveType.TalerBankWithdraw
      : ReserveType.Manual;
    switch (reserve.reserveStatus) {
      case ReserveRecordStatus.DORMANT:
        // nothing to report as pending
        break;
      case ReserveRecordStatus.WAIT_CONFIRM_BANK:
      case ReserveRecordStatus.QUERYING_STATUS:
      case ReserveRecordStatus.REGISTERING_BANK:
        resp.pendingOperations.push({
          type: PendingOperationType.Reserve,
          givesLifeness: true,
          timestampDue: reserve.retryInfo.nextRetry,
          stage: reserve.reserveStatus,
          timestampCreated: reserve.timestampCreated,
          reserveType,
          reservePub: reserve.reservePub,
          retryInfo: reserve.retryInfo,
        });
        break;
      default:
        // FIXME: report problem!
        break;
    }
  });
}

async function gatherRefreshPending(
  tx: GetReadOnlyAccess<{ refreshGroups: typeof WalletStoresV1.refreshGroups }>,
  now: Timestamp,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.refreshGroups.iter().forEach((r) => {
    if (r.timestampFinished) {
      return;
    }
    resp.pendingOperations.push({
      type: PendingOperationType.Refresh,
      givesLifeness: true,
      timestampDue: r.retryInfo.nextRetry,
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
): Promise<void> {
  await tx.withdrawalGroups.iter().forEachAsync(async (wsr) => {
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
      type: PendingOperationType.Withdraw,
      givesLifeness: true,
      timestampDue: wsr.retryInfo.nextRetry,
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
): Promise<void> {
  await tx.proposals.iter().forEach((proposal) => {
    if (proposal.proposalStatus == ProposalStatus.PROPOSED) {
      // Nothing to do, user needs to choose.
    } else if (proposal.proposalStatus == ProposalStatus.DOWNLOADING) {
      const timestampDue = proposal.retryInfo?.nextRetry ?? getTimestampNow();
      resp.pendingOperations.push({
        type: PendingOperationType.ProposalDownload,
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

async function gatherTipPending(
  tx: GetReadOnlyAccess<{ tips: typeof WalletStoresV1.tips }>,
  now: Timestamp,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.tips.iter().forEach((tip) => {
    if (tip.pickedUpTimestamp) {
      return;
    }
    if (tip.acceptedTimestamp) {
      resp.pendingOperations.push({
        type: PendingOperationType.TipPickup,
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
  now: Timestamp,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.purchases.iter().forEach((pr) => {
    if (pr.paymentSubmitPending && pr.abortStatus === AbortStatus.None) {
      resp.pendingOperations.push({
        type: PendingOperationType.Pay,
        givesLifeness: true,
        timestampDue: pr.payRetryInfo.nextRetry,
        isReplay: false,
        proposalId: pr.proposalId,
        retryInfo: pr.payRetryInfo,
        lastError: pr.lastPayError,
      });
    }
    if (pr.refundQueryRequested) {
      resp.pendingOperations.push({
        type: PendingOperationType.RefundQuery,
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
  now: Timestamp,
  resp: PendingOperationsResponse,
): Promise<void> {
  await tx.recoupGroups.iter().forEach((rg) => {
    if (rg.timestampFinished) {
      return;
    }
    resp.pendingOperations.push({
      type: PendingOperationType.Recoup,
      givesLifeness: true,
      timestampDue: rg.retryInfo.nextRetry,
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
): Promise<void> {
  await tx.depositGroups.iter().forEach((dg) => {
    if (dg.timestampFinished) {
      return;
    }
    resp.pendingOperations.push({
      type: PendingOperationType.Deposit,
      givesLifeness: true,
      timestampDue: dg.retryInfo.nextRetry,
      depositGroupId: dg.depositGroupId,
      retryInfo: dg.retryInfo,
      lastError: dg.lastError,
    });
  });
}

export async function getPendingOperations(
  ws: InternalWalletState,
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
        walletBalance,
        pendingOperations: [],
      };
      await gatherExchangePending(tx, now, resp);
      await gatherReservePending(tx, now, resp);
      await gatherRefreshPending(tx, now, resp);
      await gatherWithdrawalPending(tx, now, resp);
      await gatherProposalPending(tx, now, resp);
      await gatherTipPending(tx, now, resp);
      await gatherPurchasePending(tx, now, resp);
      await gatherRecoupPending(tx, now, resp);
      await gatherDepositPending(tx, now, resp);
      return resp;
    });
}
