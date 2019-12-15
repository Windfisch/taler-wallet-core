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
 * Type and schema definitions for pending operations in the wallet.
 */

/**
 * Imports.
 */
import { OperationError, Timestamp, Duration } from "./walletTypes";
import { WithdrawalSource, RetryInfo } from "./dbTypes";

export const enum PendingOperationType {
  Bug = "bug",
  ExchangeUpdate = "exchange-update",
  Pay = "pay",
  ProposalChoice = "proposal-choice",
  ProposalDownload = "proposal-download",
  Refresh = "refresh",
  Reserve = "reserve",
  RefundApply = "refund-apply",
  RefundQuery = "refund-query",
  TipChoice = "tip-choice",
  TipPickup = "tip-pickup",
  Withdraw = "withdraw",
}

/**
 * Information about a pending operation.
 */
export type PendingOperationInfo = PendingOperationInfoCommon &
  (
    | PendingBugOperation
    | PendingExchangeUpdateOperation
    | PendingPayOperation
    | PendingProposalChoiceOperation
    | PendingProposalDownloadOperation
    | PendingRefreshOperation
    | PendingRefundApplyOperation
    | PendingRefundQueryOperation
    | PendingReserveOperation
    | PendingTipPickupOperation
    | PendingWithdrawOperation
  );

export interface PendingExchangeUpdateOperation {
  type: PendingOperationType.ExchangeUpdate;
  stage: string;
  reason: string;
  exchangeBaseUrl: string;
  lastError: OperationError | undefined;
}

export interface PendingBugOperation {
  type: PendingOperationType.Bug;
  message: string;
  details: any;
}

export interface PendingReserveOperation {
  type: PendingOperationType.Reserve;
  retryInfo: RetryInfo | undefined;
  stage: string;
  timestampCreated: Timestamp;
  reserveType: string;
  reservePub: string;
  bankWithdrawConfirmUrl?: string;
}

export interface PendingRefreshOperation {
  type: PendingOperationType.Refresh;
  lastError?: OperationError;
  refreshGroupId: string;
}

export interface PendingProposalDownloadOperation {
  type: PendingOperationType.ProposalDownload;
  merchantBaseUrl: string;
  proposalTimestamp: Timestamp;
  proposalId: string;
  orderId: string;
  lastError?: OperationError;
  retryInfo: RetryInfo;
}

/**
 * User must choose whether to accept or reject the merchant's
 * proposed contract terms.
 */
export interface PendingProposalChoiceOperation {
  type: PendingOperationType.ProposalChoice;
  merchantBaseUrl: string;
  proposalTimestamp: Timestamp;
  proposalId: string;
}

export interface PendingTipPickupOperation {
  type: PendingOperationType.TipPickup;
  tipId: string;
  merchantBaseUrl: string;
  merchantTipId: string;
}

export interface PendingPayOperation {
  type: PendingOperationType.Pay;
  proposalId: string;
  isReplay: boolean;
  retryInfo: RetryInfo;
  lastError: OperationError | undefined;
}

export interface PendingRefundQueryOperation {
  type: PendingOperationType.RefundQuery;
  proposalId: string;
  retryInfo: RetryInfo;
  lastError: OperationError | undefined;
}

export interface PendingRefundApplyOperation {
  type: PendingOperationType.RefundApply;
  proposalId: string;
  retryInfo: RetryInfo;
  lastError: OperationError | undefined;
  numRefundsPending: number;
  numRefundsDone: number;
}

export interface PendingWithdrawOperation {
  type: PendingOperationType.Withdraw;
  source: WithdrawalSource;
  withdrawSessionId: string;
  numCoinsWithdrawn: number;
  numCoinsTotal: number;
}

export interface PendingOperationInfoCommon {
  type: PendingOperationType;
  givesLifeness: boolean;
}

export interface PendingOperationsResponse {
  pendingOperations: PendingOperationInfo[];
  nextRetryDelay: Duration;
}
