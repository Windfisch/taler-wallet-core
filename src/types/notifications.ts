import { OperationError } from "./walletTypes";

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
 * Type and schema definitions for notifications from the wallet to clients
 * of the wallet.
 */

export const enum NotificationType {
  CoinWithdrawn = "coin-withdrawn",
  ProposalAccepted = "proposal-accepted",
  ProposalDownloaded = "proposal-downloaded",
  RefundsSubmitted = "refunds-submitted",
  PaybackStarted = "payback-started",
  PaybackFinished = "payback-finished",
  RefreshRevealed = "refresh-revealed",
  RefreshMelted = "refresh-melted",
  RefreshStarted = "refresh-started",
  RefreshUnwarranted = "refresh-unwarranted",
  ReserveUpdated = "reserve-updated",
  ReserveConfirmed = "reserve-confirmed",
  ReserveDepleted = "reserve-depleted",
  ReserveCreated = "reserve-created",
  WithdrawSessionCreated = "withdraw-session-created",
  WithdrawSessionFinished = "withdraw-session-finished",
  WaitingForRetry = "waiting-for-retry",
  RefundStarted = "refund-started",
  RefundQueried = "refund-queried",
  RefundFinished = "refund-finished",
  ExchangeOperationError = "exchange-operation-error",
  RefreshOperationError = "refresh-operation-error",
  RefundApplyOperationError = "refund-apply-error",
  RefundStatusOperationError = "refund-status-error",
  ProposalOperationError = "proposal-error",
  TipOperationError = "tip-error",
  PayOperationError = "pay-error",
  WithdrawOperationError = "withdraw-error",
  ReserveOperationError = "reserve-error",
  Wildcard = "wildcard",
}

export interface ProposalAcceptedNotification {
  type: NotificationType.ProposalAccepted;
  proposalId: string;
}

export interface CoinWithdrawnNotification {
  type: NotificationType.CoinWithdrawn;
}

export interface RefundStartedNotification {
  type: NotificationType.RefundStarted;
}

export interface RefundQueriedNotification {
  type: NotificationType.RefundQueried;
}

export interface ProposalDownloadedNotification {
  type: NotificationType.ProposalDownloaded;
  proposalId: string;
}

export interface RefundsSubmittedNotification {
  type: NotificationType.RefundsSubmitted;
  proposalId: string;
}

export interface PaybackStartedNotification {
  type: NotificationType.PaybackStarted;
}

export interface PaybackFinishedNotification {
  type: NotificationType.PaybackFinished;
}

export interface RefreshMeltedNotification {
  type: NotificationType.RefreshMelted;
}

export interface RefreshRevealedNotification {
  type: NotificationType.RefreshRevealed;
}

export interface RefreshStartedNotification {
  type: NotificationType.RefreshStarted;
}

export interface RefreshRefusedNotification {
  type: NotificationType.RefreshUnwarranted;
}

export interface ReserveUpdatedNotification {
  type: NotificationType.ReserveUpdated;
}

export interface ReserveConfirmedNotification {
  type: NotificationType.ReserveConfirmed;
}

export interface WithdrawSessionCreatedNotification {
  type: NotificationType.WithdrawSessionCreated;
  withdrawSessionId: string;
}

export interface WithdrawSessionFinishedNotification {
  type: NotificationType.WithdrawSessionFinished;
  withdrawSessionId: string;
}

export interface ReserveDepletedNotification {
  type: NotificationType.ReserveDepleted;
  reservePub: string;
}

export interface WaitingForRetryNotification {
  type: NotificationType.WaitingForRetry;
  numPending: number;
  numGivingLiveness: number;
}

export interface RefundFinishedNotification {
  type: NotificationType.RefundFinished;
}

export interface ExchangeOperationErrorNotification {
  type: NotificationType.ExchangeOperationError;
}

export interface RefreshOperationErrorNotification {
  type: NotificationType.RefreshOperationError;
}

export interface RefundStatusOperationErrorNotification {
  type: NotificationType.RefundStatusOperationError;
}

export interface RefundApplyOperationErrorNotification {
  type: NotificationType.RefundApplyOperationError;
}

export interface PayOperationErrorNotification {
  type: NotificationType.PayOperationError;
}

export interface ProposalOperationErrorNotification {
  type: NotificationType.ProposalOperationError;
}

export interface TipOperationErrorNotification {
  type: NotificationType.TipOperationError;
}

export interface WithdrawOperationErrorNotification {
  type: NotificationType.WithdrawOperationError;
}

export interface ReserveOperationErrorNotification {
  type: NotificationType.ReserveOperationError;
  operationError: OperationError;
}

export interface ReserveCreatedNotification {
  type: NotificationType.ReserveCreated;
}

export interface WildcardNotification {
  type: NotificationType.Wildcard;
}

export type WalletNotification =
  | WithdrawOperationErrorNotification
  | ReserveOperationErrorNotification
  | ExchangeOperationErrorNotification
  | RefreshOperationErrorNotification
  | RefundStatusOperationErrorNotification
  | RefundApplyOperationErrorNotification
  | ProposalOperationErrorNotification
  | PayOperationErrorNotification
  | TipOperationErrorNotification
  | ProposalAcceptedNotification
  | ProposalDownloadedNotification
  | RefundsSubmittedNotification
  | PaybackStartedNotification
  | PaybackFinishedNotification
  | RefreshMeltedNotification
  | RefreshRevealedNotification
  | RefreshStartedNotification
  | RefreshRefusedNotification
  | ReserveUpdatedNotification
  | ReserveCreatedNotification
  | ReserveConfirmedNotification
  | WithdrawSessionFinishedNotification
  | ReserveDepletedNotification
  | WaitingForRetryNotification
  | RefundStartedNotification
  | RefundFinishedNotification
  | RefundQueriedNotification
  | WithdrawSessionCreatedNotification
  | CoinWithdrawnNotification
  | WildcardNotification;
