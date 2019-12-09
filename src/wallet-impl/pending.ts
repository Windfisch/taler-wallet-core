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
  PendingOperationsResponse,
  getTimestampNow,
  Timestamp,
  Duration,
} from "../walletTypes";
import { runWithReadTransaction, TransactionHandle } from "../util/query";
import { InternalWalletState } from "./state";
import {
  Stores,
  ExchangeUpdateStatus,
  ReserveRecordStatus,
  CoinStatus,
  ProposalStatus,
} from "../dbTypes";

function updateRetryDelay(
  oldDelay: Duration,
  now: Timestamp,
  retryTimestamp: Timestamp,
): Duration {
  if (retryTimestamp.t_ms <= now.t_ms) {
    return { d_ms: 0 };
  }
  return { d_ms: Math.min(oldDelay.d_ms, retryTimestamp.t_ms - now.t_ms) };
}

async function gatherExchangePending(
  tx: TransactionHandle,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue: boolean = false,
): Promise<void> {
  if (onlyDue) {
    // FIXME: exchanges should also be updated regularly
    return;
  }
  await tx.iter(Stores.exchanges).forEach(e => {
    switch (e.updateStatus) {
      case ExchangeUpdateStatus.FINISHED:
        if (e.lastError) {
          resp.pendingOperations.push({
            type: "bug",
            givesLifeness: false,
            message:
              "Exchange record is in FINISHED state but has lastError set",
            details: {
              exchangeBaseUrl: e.baseUrl,
            },
          });
        }
        if (!e.details) {
          resp.pendingOperations.push({
            type: "bug",
            givesLifeness: false,
            message:
              "Exchange record does not have details, but no update in progress.",
            details: {
              exchangeBaseUrl: e.baseUrl,
            },
          });
        }
        if (!e.wireInfo) {
          resp.pendingOperations.push({
            type: "bug",
            givesLifeness: false,
            message:
              "Exchange record does not have wire info, but no update in progress.",
            details: {
              exchangeBaseUrl: e.baseUrl,
            },
          });
        }
        break;
      case ExchangeUpdateStatus.FETCH_KEYS:
        resp.pendingOperations.push({
          type: "exchange-update",
          givesLifeness: false,
          stage: "fetch-keys",
          exchangeBaseUrl: e.baseUrl,
          lastError: e.lastError,
          reason: e.updateReason || "unknown",
        });
        break;
      case ExchangeUpdateStatus.FETCH_WIRE:
        resp.pendingOperations.push({
          type: "exchange-update",
          givesLifeness: false,
          stage: "fetch-wire",
          exchangeBaseUrl: e.baseUrl,
          lastError: e.lastError,
          reason: e.updateReason || "unknown",
        });
        break;
      default:
        resp.pendingOperations.push({
          type: "bug",
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
  tx: TransactionHandle,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue: boolean = false,
): Promise<void> {
  // FIXME: this should be optimized by using an index for "onlyDue==true".
  await tx.iter(Stores.reserves).forEach(reserve => {
    const reserveType = reserve.bankWithdrawStatusUrl ? "taler-bank" : "manual";
    if (!reserve.retryInfo.active) {
      return;
    }
    switch (reserve.reserveStatus) {
      case ReserveRecordStatus.DORMANT:
        // nothing to report as pending
        break;
      case ReserveRecordStatus.UNCONFIRMED:
        if (onlyDue) {
          break;
        }
        resp.pendingOperations.push({
          type: "reserve",
          givesLifeness: false,
          stage: reserve.reserveStatus,
          timestampCreated: reserve.created,
          reserveType,
          reservePub: reserve.reservePub,
          retryInfo: reserve.retryInfo,
        });
        break;
      case ReserveRecordStatus.WAIT_CONFIRM_BANK:
      case ReserveRecordStatus.WITHDRAWING:
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
          type: "reserve",
          givesLifeness: true,
          stage: reserve.reserveStatus,
          timestampCreated: reserve.created,
          reserveType,
          reservePub: reserve.reservePub,
          retryInfo: reserve.retryInfo,
        });
        break;
      default:
        resp.pendingOperations.push({
          type: "bug",
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
  tx: TransactionHandle,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue: boolean = false,
): Promise<void> {
  await tx.iter(Stores.refresh).forEach(r => {
    if (r.finishedTimestamp) {
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
    let refreshStatus: string;
    if (r.norevealIndex === undefined) {
      refreshStatus = "melt";
    } else {
      refreshStatus = "reveal";
    }

    resp.pendingOperations.push({
      type: "refresh",
      givesLifeness: true,
      oldCoinPub: r.meltCoinPub,
      refreshStatus,
      refreshOutputSize: r.newDenoms.length,
      refreshSessionId: r.refreshSessionId,
    });
  });
}

async function gatherCoinsPending(
  tx: TransactionHandle,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue: boolean = false,
): Promise<void> {
  // Refreshing dirty coins is always due.
  await tx.iter(Stores.coins).forEach(coin => {
    if (coin.status == CoinStatus.Dirty) {
      resp.nextRetryDelay = { d_ms: 0 };
      resp.pendingOperations.push({
        givesLifeness: true,
        type: "dirty-coin",
        coinPub: coin.coinPub,
      });
    }
  });
}

async function gatherWithdrawalPending(
  tx: TransactionHandle,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue: boolean = false,
): Promise<void> {
  await tx.iter(Stores.withdrawalSession).forEach(wsr => {
    if (wsr.finishTimestamp) {
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
    const numCoinsWithdrawn = wsr.withdrawn.reduce(
      (a, x) => a + (x ? 1 : 0),
      0,
    );
    const numCoinsTotal = wsr.withdrawn.length;
    resp.pendingOperations.push({
      type: "withdraw",
      givesLifeness: true,
      numCoinsTotal,
      numCoinsWithdrawn,
      source: wsr.source,
      withdrawSessionId: wsr.withdrawSessionId,
    });
  });
}

async function gatherProposalPending(
  tx: TransactionHandle,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue: boolean = false,
): Promise<void> {
  await tx.iter(Stores.proposals).forEach(proposal => {
    if (proposal.proposalStatus == ProposalStatus.PROPOSED) {
      if (onlyDue) {
        return;
      }
      resp.pendingOperations.push({
        type: "proposal-choice",
        givesLifeness: false,
        merchantBaseUrl: proposal.download!!.contractTerms.merchant_base_url,
        proposalId: proposal.proposalId,
        proposalTimestamp: proposal.timestamp,
      });
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
        type: "proposal-download",
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
  tx: TransactionHandle,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue: boolean = false,
): Promise<void> {
  await tx.iter(Stores.tips).forEach(tip => {
    if (tip.pickedUp) {
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
    if (tip.accepted) {
      resp.pendingOperations.push({
        type: "tip",
        givesLifeness: true,
        merchantBaseUrl: tip.merchantBaseUrl,
        tipId: tip.tipId,
        merchantTipId: tip.merchantTipId,
      });
    }
  });
}

async function gatherPurchasePending(
  tx: TransactionHandle,
  now: Timestamp,
  resp: PendingOperationsResponse,
  onlyDue: boolean = false,
): Promise<void> {
  await tx.iter(Stores.purchases).forEach(pr => {
    if (!pr.firstSuccessfulPayTimestamp) {
      resp.nextRetryDelay = updateRetryDelay(
        resp.nextRetryDelay,
        now,
        pr.payRetryInfo.nextRetry,
      );
      if (!onlyDue || pr.payRetryInfo.nextRetry.t_ms <= now.t_ms) {
        resp.pendingOperations.push({
          type: "pay",
          givesLifeness: true,
          isReplay: false,
          proposalId: pr.proposalId,
          retryInfo: pr.payRetryInfo,
          lastError: pr.lastPayError,
        });
      }
    }
    if (pr.refundStatusRequested) {
      resp.nextRetryDelay = updateRetryDelay(
        resp.nextRetryDelay,
        now,
        pr.refundStatusRetryInfo.nextRetry,
      );
      if (!onlyDue || pr.refundStatusRetryInfo.nextRetry.t_ms <= now.t_ms) {
        resp.pendingOperations.push({
          type: "refund-query",
          givesLifeness: true,
          proposalId: pr.proposalId,
          retryInfo: pr.refundStatusRetryInfo,
          lastError: pr.lastRefundStatusError,
        });
      }
    }
    const numRefundsPending = Object.keys(pr.refundsPending).length;
    if (numRefundsPending > 0) {
      const numRefundsDone = Object.keys(pr.refundsDone).length;
      resp.nextRetryDelay = updateRetryDelay(
        resp.nextRetryDelay,
        now,
        pr.refundApplyRetryInfo.nextRetry,
      );
      if (!onlyDue || pr.refundApplyRetryInfo.nextRetry.t_ms <= now.t_ms) {
        resp.pendingOperations.push({
          type: "refund-apply",
          numRefundsDone,
          numRefundsPending,
          givesLifeness: true,
          proposalId: pr.proposalId,
          retryInfo: pr.refundApplyRetryInfo,
          lastError: pr.lastRefundApplyError,
        });
      }
    }
  });
}

export async function getPendingOperations(
  ws: InternalWalletState,
  onlyDue: boolean = false,
): Promise<PendingOperationsResponse> {
  const resp: PendingOperationsResponse = {
    nextRetryDelay: { d_ms: Number.MAX_SAFE_INTEGER },
    pendingOperations: [],
  };
  const now = getTimestampNow();
  await runWithReadTransaction(
    ws.db,
    [
      Stores.exchanges,
      Stores.reserves,
      Stores.refresh,
      Stores.coins,
      Stores.withdrawalSession,
      Stores.proposals,
      Stores.tips,
      Stores.purchases,
    ],
    async tx => {
      await gatherExchangePending(tx, now, resp, onlyDue);
      await gatherReservePending(tx, now, resp, onlyDue);
      await gatherRefreshPending(tx, now, resp, onlyDue);
      await gatherCoinsPending(tx, now, resp, onlyDue);
      await gatherWithdrawalPending(tx, now, resp, onlyDue);
      await gatherProposalPending(tx, now, resp, onlyDue);
      await gatherTipPending(tx, now, resp, onlyDue);
      await gatherPurchasePending(tx, now, resp, onlyDue);
    },
  );
  return resp;
}
