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
import { TalerErrorDetails, BalancesResponse } from "./walletTypes";
import { WithdrawalSource, RetryInfo, ReserveRecordStatus } from "./dbTypes";
import { Timestamp, Duration } from "../util/time";

export const enum PendingOperationType {
  Bug = "bug",
  ExchangeUpdate = "exchange-update",
  Pay = "pay",
  ProposalChoice = "proposal-choice",
  ProposalDownload = "proposal-download",
  Refresh = "refresh",
  Reserve = "reserve",
  Recoup = "recoup",
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
    | PendingRefundQueryOperation
    | PendingReserveOperation
    | PendingTipChoiceOperation
    | PendingTipPickupOperation
    | PendingWithdrawOperation
    | PendingRecoupOperation
  );

/**
 * The wallet is currently updating information about an exchange.
 */
export interface PendingExchangeUpdateOperation {
  type: PendingOperationType.ExchangeUpdate;
  stage: ExchangeUpdateOperationStage;
  reason: string;
  exchangeBaseUrl: string;
  lastError: TalerErrorDetails | undefined;
}

/**
 * Some interal error happened in the wallet.  This pending operation
 * should *only* be reported for problems in the wallet, not when
 * a problem with a merchant/exchange/etc. occurs.
 */
export interface PendingBugOperation {
  type: PendingOperationType.Bug;
  message: string;
  details: any;
}

/**
 * Current state of an exchange update operation.
 */
export const enum ExchangeUpdateOperationStage {
  FetchKeys = "fetch-keys",
  FetchWire = "fetch-wire",
  FinalizeUpdate = "finalize-update",
}

export const enum ReserveType {
  /**
   * Manually created.
   */
  Manual = "manual",
  /**
   * Withdrawn from a bank that has "tight" Taler integration
   */
  TalerBankWithdraw = "taler-bank-withdraw",
}

/**
 * Status of processing a reserve.
 *
 * Does *not* include the withdrawal operation that might result
 * from this.
 */
export interface PendingReserveOperation {
  type: PendingOperationType.Reserve;
  retryInfo: RetryInfo | undefined;
  stage: ReserveRecordStatus;
  timestampCreated: Timestamp;
  reserveType: ReserveType;
  reservePub: string;
  bankWithdrawConfirmUrl?: string;
}

/**
 * Status of an ongoing withdrawal operation.
 */
export interface PendingRefreshOperation {
  type: PendingOperationType.Refresh;
  lastError?: TalerErrorDetails;
  refreshGroupId: string;
  finishedPerCoin: boolean[];
  retryInfo: RetryInfo;
}

/**
 * Status of downloading signed contract terms from a merchant.
 */
export interface PendingProposalDownloadOperation {
  type: PendingOperationType.ProposalDownload;
  merchantBaseUrl: string;
  proposalTimestamp: Timestamp;
  proposalId: string;
  orderId: string;
  lastError?: TalerErrorDetails;
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

/**
 * The wallet is picking up a tip that the user has accepted.
 */
export interface PendingTipPickupOperation {
  type: PendingOperationType.TipPickup;
  tipId: string;
  merchantBaseUrl: string;
  merchantTipId: string;
}

/**
 * The wallet has been offered a tip, and the user now needs to
 * decide whether to accept or reject the tip.
 */
export interface PendingTipChoiceOperation {
  type: PendingOperationType.TipChoice;
  tipId: string;
  merchantBaseUrl: string;
  merchantTipId: string;
}

/**
 * The wallet is signing coins and then sending them to
 * the merchant.
 */
export interface PendingPayOperation {
  type: PendingOperationType.Pay;
  proposalId: string;
  isReplay: boolean;
  retryInfo: RetryInfo;
  lastError: TalerErrorDetails | undefined;
}

/**
 * The wallet is querying the merchant about whether any refund
 * permissions are available for a purchase.
 */
export interface PendingRefundQueryOperation {
  type: PendingOperationType.RefundQuery;
  proposalId: string;
  retryInfo: RetryInfo;
  lastError: TalerErrorDetails | undefined;
}

export interface PendingRecoupOperation {
  type: PendingOperationType.Recoup;
  recoupGroupId: string;
  retryInfo: RetryInfo;
  lastError: TalerErrorDetails | undefined;
}

/**
 * Status of an ongoing withdrawal operation.
 */
export interface PendingWithdrawOperation {
  type: PendingOperationType.Withdraw;
  source: WithdrawalSource;
  lastError: TalerErrorDetails | undefined;
  retryInfo: RetryInfo;
  withdrawalGroupId: string;
  numCoinsWithdrawn: number;
  numCoinsTotal: number;
}

/**
 * Fields that are present in every pending operation.
 */
export interface PendingOperationInfoCommon {
  /**
   * Type of the pending operation.
   */
  type: PendingOperationType;

  /**
   * Set to true if the operation indicates that something is really in progress,
   * as opposed to some regular scheduled operation or a permanent failure.
   */
  givesLifeness: boolean;

  /**
   * Retry info, not available on all pending operations.
   * If it is available, it must have the same name.
   */
  retryInfo?: RetryInfo;
}

/**
 * Response returned from the pending operations API.
 */
export interface PendingOperationsResponse {
  /**
   * List of pending operations.
   */
  pendingOperations: PendingOperationInfo[];

  /**
   * Current wallet balance, including pending balances.
   */
  walletBalance: BalancesResponse;

  /**
   * When is the next pending operation due to be re-tried?
   */
  nextRetryDelay: Duration;

  /**
   * Does this response only include pending operations that
   * are due to be executed right now?
   */
  onlyDue: boolean;
}
