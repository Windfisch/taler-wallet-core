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
import { PendingOperationInfo, PendingOperationsResponse } from "../walletTypes";
import { oneShotIter } from "../util/query";
import { InternalWalletState } from "./state";
import { Stores, ExchangeUpdateStatus, ReserveRecordStatus, CoinStatus, ProposalStatus } from "../dbTypes";

export async function getPendingOperations(
  ws: InternalWalletState,
): Promise<PendingOperationsResponse> {
  const pendingOperations: PendingOperationInfo[] = [];
  const exchanges = await oneShotIter(ws.db, Stores.exchanges).toArray();
  for (let e of exchanges) {
    switch (e.updateStatus) {
      case ExchangeUpdateStatus.FINISHED:
        if (e.lastError) {
          pendingOperations.push({
            type: "bug",
            message:
              "Exchange record is in FINISHED state but has lastError set",
            details: {
              exchangeBaseUrl: e.baseUrl,
            },
          });
        }
        if (!e.details) {
          pendingOperations.push({
            type: "bug",
            message:
              "Exchange record does not have details, but no update in progress.",
            details: {
              exchangeBaseUrl: e.baseUrl,
            },
          });
        }
        if (!e.wireInfo) {
          pendingOperations.push({
            type: "bug",
            message:
              "Exchange record does not have wire info, but no update in progress.",
            details: {
              exchangeBaseUrl: e.baseUrl,
            },
          });
        }
        break;
      case ExchangeUpdateStatus.FETCH_KEYS:
        pendingOperations.push({
          type: "exchange-update",
          stage: "fetch-keys",
          exchangeBaseUrl: e.baseUrl,
          lastError: e.lastError,
          reason: e.updateReason || "unknown",
        });
        break;
      case ExchangeUpdateStatus.FETCH_WIRE:
        pendingOperations.push({
          type: "exchange-update",
          stage: "fetch-wire",
          exchangeBaseUrl: e.baseUrl,
          lastError: e.lastError,
          reason: e.updateReason || "unknown",
        });
        break;
      default:
        pendingOperations.push({
          type: "bug",
          message: "Unknown exchangeUpdateStatus",
          details: {
            exchangeBaseUrl: e.baseUrl,
            exchangeUpdateStatus: e.updateStatus,
          },
        });
        break;
    }
  }
  await oneShotIter(ws.db, Stores.reserves).forEach(reserve => {
    const reserveType = reserve.bankWithdrawStatusUrl
      ? "taler-bank"
      : "manual";
    switch (reserve.reserveStatus) {
      case ReserveRecordStatus.DORMANT:
        // nothing to report as pending
        break;
      case ReserveRecordStatus.WITHDRAWING:
      case ReserveRecordStatus.UNCONFIRMED:
      case ReserveRecordStatus.QUERYING_STATUS:
      case ReserveRecordStatus.REGISTERING_BANK:
        pendingOperations.push({
          type: "reserve",
          stage: reserve.reserveStatus,
          timestampCreated: reserve.created,
          reserveType,
          reservePub: reserve.reservePub,
        });
        break;
      case ReserveRecordStatus.WAIT_CONFIRM_BANK:
        pendingOperations.push({
          type: "reserve",
          stage: reserve.reserveStatus,
          timestampCreated: reserve.created,
          reserveType,
          reservePub: reserve.reservePub,
          bankWithdrawConfirmUrl: reserve.bankWithdrawConfirmUrl,
        });
        break;
      default:
        pendingOperations.push({
          type: "bug",
          message: "Unknown reserve record status",
          details: {
            reservePub: reserve.reservePub,
            reserveStatus: reserve.reserveStatus,
          },
        });
        break;
    }
  });

  await oneShotIter(ws.db, Stores.refresh).forEach(r => {
    if (r.finished) {
      return;
    }
    let refreshStatus: string;
    if (r.norevealIndex === undefined) {
      refreshStatus = "melt";
    } else {
      refreshStatus = "reveal";
    }

    pendingOperations.push({
      type: "refresh",
      oldCoinPub: r.meltCoinPub,
      refreshStatus,
      refreshOutputSize: r.newDenoms.length,
      refreshSessionId: r.refreshSessionId,
    });
  });

  await oneShotIter(ws.db, Stores.coins).forEach(coin => {
    if (coin.status == CoinStatus.Dirty) {
      pendingOperations.push({
        type: "dirty-coin",
        coinPub: coin.coinPub,
      });
    }
  });

  await oneShotIter(ws.db, Stores.withdrawalSession).forEach(ws => {
    const numCoinsWithdrawn = ws.withdrawn.reduce(
      (a, x) => a + (x ? 1 : 0),
      0,
    );
    const numCoinsTotal = ws.withdrawn.length;
    if (numCoinsWithdrawn < numCoinsTotal) {
      pendingOperations.push({
        type: "withdraw",
        numCoinsTotal,
        numCoinsWithdrawn,
        source: ws.source,
        withdrawSessionId: ws.withdrawSessionId,
      });
    }
  });

  await oneShotIter(ws.db, Stores.proposals).forEach(proposal => {
    if (proposal.proposalStatus == ProposalStatus.PROPOSED) {
      pendingOperations.push({
        type: "proposal",
        merchantBaseUrl: proposal.contractTerms.merchant_base_url,
        proposalId: proposal.proposalId,
        proposalTimestamp: proposal.timestamp,
      });
    }
  });

  await oneShotIter(ws.db, Stores.tips).forEach(tip => {
    if (tip.accepted && !tip.pickedUp) {
      pendingOperations.push({
        type: "tip",
        merchantBaseUrl: tip.merchantBaseUrl,
        tipId: tip.tipId,
        merchantTipId: tip.merchantTipId,
      });
    }
  });

  return {
    pendingOperations,
  };
}
