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

/**
 * Information about a pending operation.
 */
export type PendingOperationInfo = PendingOperationInfoCommon &
  (
    | PendingWithdrawOperation
    | PendingReserveOperation
    | PendingBugOperation
    | PendingDirtyCoinOperation
    | PendingExchangeUpdateOperation
    | PendingRefreshOperation
    | PendingTipOperation
    | PendingProposalDownloadOperation
    | PendingProposalChoiceOperation
    | PendingPayOperation
    | PendingRefundQueryOperation
    | PendingRefundApplyOperation
  );

export interface PendingExchangeUpdateOperation {
  type: "exchange-update";
  stage: string;
  reason: string;
  exchangeBaseUrl: string;
  lastError: OperationError | undefined;
}

export interface PendingBugOperation {
  type: "bug";
  message: string;
  details: any;
}

export interface PendingReserveOperation {
  type: "reserve";
  retryInfo: RetryInfo | undefined;
  stage: string;
  timestampCreated: Timestamp;
  reserveType: string;
  reservePub: string;
  bankWithdrawConfirmUrl?: string;
}

export interface PendingRefreshOperation {
  type: "refresh";
  lastError?: OperationError;
  refreshSessionId: string;
  oldCoinPub: string;
  refreshStatus: string;
  refreshOutputSize: number;
}

export interface PendingDirtyCoinOperation {
  type: "dirty-coin";
  coinPub: string;
}

export interface PendingProposalDownloadOperation {
  type: "proposal-download";
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
  type: "proposal-choice";
  merchantBaseUrl: string;
  proposalTimestamp: Timestamp;
  proposalId: string;
}

export interface PendingTipOperation {
  type: "tip";
  tipId: string;
  merchantBaseUrl: string;
  merchantTipId: string;
}

export interface PendingPayOperation {
  type: "pay";
  proposalId: string;
  isReplay: boolean;
  retryInfo: RetryInfo,
  lastError: OperationError | undefined;
}

export interface PendingRefundQueryOperation {
  type: "refund-query";
  proposalId: string;
  retryInfo: RetryInfo,
  lastError: OperationError | undefined;
}

export interface PendingRefundApplyOperation {
  type: "refund-apply";
  proposalId: string;
  retryInfo: RetryInfo,
  lastError: OperationError | undefined;
  numRefundsPending: number;
  numRefundsDone: number;
}

export interface PendingOperationInfoCommon {
  type: string;
  givesLifeness: boolean;
}


export interface PendingWithdrawOperation {
  type: "withdraw";
  source: WithdrawalSource;
  withdrawSessionId: string;
  numCoinsWithdrawn: number;
  numCoinsTotal: number;
}

export interface PendingRefreshOperation {
  type: "refresh";
}

export interface PendingPayOperation {
  type: "pay";
}

export interface PendingOperationsResponse {
  pendingOperations: PendingOperationInfo[];
  nextRetryDelay: Duration;
}