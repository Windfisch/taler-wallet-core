/*
 This file is part of GNU Taler
 (C) 2019 Taler Systems S.A.

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
 * Type and schema definitions for the wallet's history.
 */

 /**
  * Imports.
  */
import { RefreshReason } from "./walletTypes";
import { ReserveTransaction } from "./ReserveTransaction";
import { WithdrawalSource } from "./dbTypes";
import { Timestamp } from "../util/time";

/**
 * Type tags for the history event types.
 */
export const enum HistoryEventType {
  AuditorComplaintSent = "auditor-complained-sent",
  AuditorComplaintProcessed = "auditor-complaint-processed",
  AuditorTrustAdded = "auditor-trust-added",
  AuditorTrustRemoved = "auditor-trust-removed",
  ExchangeAdded = "exchange-added",
  ExchangeTermsAccepted = "exchange-terms-accepted",
  ExchangePolicyChanged = "exchange-policy-changed",
  ExchangeTrustAdded = "exchange-trust-added",
  ExchangeTrustRemoved = "exchange-trust-removed",
  ExchangeUpdated = "exchange-updated",
  FundsDepositedToSelf = "funds-deposited-to-self",
  FundsRecouped = "funds-recouped",
  OrderAccepted = "order-accepted",
  OrderRedirected = "order-redirected",
  OrderRefused = "order-refused",
  PaymentAborted = "payment-aborted",
  PaymentSent = "payment-sent",
  Refreshed = "refreshed",
  Refund = "refund",
  ReserveBalanceUpdated = "reserve-balance-updated",
  ReserveCreated = "reserve-created",
  TipAccepted = "tip-accepted",
  TipDeclined = "tip-declined",
  Withdrawn = "withdrawn",
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
 * Short info about a reserve.  Enough to display in a list view and
 * to query more information from the wallet.
 */
export interface ReserveShortInfo {
  /**
   * The exchange that the reserve will be at.
   */
  exchangeBaseUrl: string;

  /**
   * Key to query more details
   */
  reservePub: string;

  /**
   * Detail about how the reserve has been created.
   */
  reserveCreationDetail: ReserveCreationDetail;
}

export type ReserveCreationDetail =
  | { type: ReserveType.Manual }
  | { type: ReserveType.TalerBankWithdraw; bankUrl: string };

export interface HistoryReserveCreatedEvent {
  type: HistoryEventType.ReserveCreated;

  /**
   * Amount that the should appear in the reserve once its status
   * is requested from the exchange.
   */
  expectedAmount: string;

  /**
   * Condensed information about the reserve.
   */
  reserveShortInfo: ReserveShortInfo;
}

/**
 * This event is emitted every time we ask the exchange for the status
 * of the reserve, and the status has changed.
 */
export interface HistoryReserveBalanceUpdatedEvent {
  type: HistoryEventType.ReserveBalanceUpdated;

  /**
   * Point in time when the reserve was confirmed.
   */
  timestamp: Timestamp;

  newHistoryTransactions: ReserveTransaction[];

  /**
   * Condensed information about the reserve.
   */
  reserveShortInfo: ReserveShortInfo;

  /**
   * Amount currently left in the reserve.
   */
  amountReserveBalance: string;

  /**
   * Amount we expected to be in the reserve at that time,
   * considering ongoing withdrawals from that reserve.
   */
  amountExpected: string;
}

/**
 * History event to indicate that the user has accepted a tip.
 */
export interface HistoryTipAcceptedEvent {
  type: HistoryEventType.TipAccepted;

  /**
   * Point in time when the tip has been accepted.
   */
  timestamp: Timestamp;

  /**
   * Unique identifier for the tip to query more information.
   */
  tipId: string;

  /**
   * Raw amount of the tip, without extra fees that apply.
   */
  tipAmountRaw: string;
}

/**
 * History event to indicate that the user has accepted a tip.
 */
export interface HistoryTipDeclinedEvent {
  type: HistoryEventType.TipDeclined;

  /**
   * Point in time when the tip has been declined.
   */
  timestamp: Timestamp;

  /**
   * Unique identifier for the tip to query more information.
   */
  tipId: string;

  /**
   * Raw amount of the tip, without extra fees that apply.
   */
  tipAmountRaw: string;
}

/**
 * The wallet has send a complaint (typically with cryptographic evidence of
 * something having gone wrong) to the auditor.
 */
export interface HistoryAuditorComplaintSentEvent {
  type: HistoryEventType.AuditorComplaintSent;

  auditorComplaintId: string;

  /* FIXME: add fields once this feature is implemented */
}

/**
 * The wallet has received a response from the auditor to a complaint.
 */
export interface HistoryAuditorComplaintProcessedEvent {
  type: HistoryEventType.AuditorComplaintProcessed;

  auditorComplaintId: string;

  /* FIXME: add fields once this feature is implemented */
}

/**
 * The wallet has added an auditor as a trusted auditor.
 */
export interface HistoryAuditorTrustAddedEvent {
  type: HistoryEventType.AuditorTrustAdded;

  /**
   * Base URL of the auditor.
   */
  auditorBaseUrl: string;

  /**
   * If set to true, this auditor hasn't been added by the user,
   * but is part of the pre-set trusted auditors in the wallet.
   */
  builtIn: boolean;
}

/**
 * The wallet has added an auditor as a trusted auditor.
 */
export interface HistoryAuditorTrustRemovedEvent {
  type: HistoryEventType.AuditorTrustRemoved;

  /**
   * Base URL of the auditor.
   */
  auditorBaseUrl: string;
}

/**
 * An exchange has been added to the wallet.  The wallet only
 * downloads information about the exchange, but does not necessarily
 * trust it yet.
 */
export interface HistoryExchangeAddedEvent {
  type: HistoryEventType.ExchangeAdded;

  exchangeBaseUrl: string;

  /**
   * Set to true if the exchange was pre-configured
   * by the wallet.
   */
  builtIn: boolean;
}

/**
 * History event to indicate that the wallet now trusts
 * an exchange.
 */
export interface HistoryExchangeTrustAddedEvent {
  type: HistoryEventType.ExchangeTrustAdded;

  exchangeBaseUrl: string;

  /**
   * Set to true if the exchange was pre-configured
   * by the wallet.
   */
  builtIn: boolean;
}

/**
 * History event to indicate that the wallet doesn't trust
 * an exchange anymore.
 */
export interface HistoryExchangeTrustRemovedEvent {
  type: HistoryEventType.ExchangeTrustRemoved;

  exchangeBaseUrl: string;
}

/**
 * This event indicates that the user accepted the terms of service
 * of the exchange.
 */
export interface HistoryExchangeTermsAcceptedEvent {
  type: HistoryEventType.ExchangeTermsAccepted;

  exchangeBaseUrl: string;

  /**
   * Etag that the exchange sent with the terms of service.
   * Identifies the version of the terms of service.
   */
  termsEtag: string | undefined;
}

/**
 * The exchange has changed the terms of service or privacy
 * policy.
 */
export interface HistoryExchangePolicyChangedEvent {
  type: HistoryEventType.ExchangePolicyChanged;

  exchangeBaseUrl: string;

  /**
   * Etag that the exchange sent with the terms of service.
   * Identifies the version of the terms of service.
   */
  termsEtag: string | undefined;

  /**
   * Etag that the exchange sent with the privacy policy.
   * Identifies the version of the privacy policy.
   */
  privacyPolicyEtag: string | undefined;
}

/**
 * This history event indicates that the exchange has updated
 * the /keys or /wire information.  The event is only emitted if
 * this information changed since the last time the wallet checked it.
 */
export interface HistoryExchangeUpdatedEvent {
  type: HistoryEventType.ExchangeUpdated;

  exchangeBaseUrl: string;
}

/**
 * History event to indicate that the user sent back digital cash from
 * their wallet back to their own bank account (basically acting as a merchant).
 */
export interface HistoryFundsDepositedToSelfEvent {
  type: HistoryEventType.FundsDepositedToSelf;

  /**
   * Amount that got sent back.
   */
  amount: string;

  /**
   * Account that received the funds.
   */
  receiverPaytoUri: string;
}

/**
 * History event to indicate that the exchange marked
 * some denominations as "compromised", and the wallet has
 * converted funds in these denominations to new funds.
 */
export interface HistoryFundsRecoupedEvent {
  type: HistoryEventType.FundsRecouped;
  numCoinsRecouped: number;
}

/**
 * Condensed information about an order, enough to display in a list view
 * and to query more details from the wallet for a detail view.
 */
export interface OrderShortInfo {
  /**
   * Wallet-internal identifier of the proposal.
   */
  proposalId: string;

  /**
   * Order ID, uniquely identifies the order within a merchant instance.
   */
  orderId: string;

  /**
   * Base URL of the merchant.
   */
  merchantBaseUrl: string;

  /**
   * Amount that must be paid for the contract.
   */
  amount: string;

  /**
   * Summary of the proposal, given by the merchant.
   */
  summary: string;

  /**
   * URL of the fulfillment, given by the merchant.
   */
  fulfillmentUrl: string;
}

/**
 * The user has accepted purchasing something.
 */
export interface HistoryOrderAcceptedEvent {
  /**
   * Type tag.
   */
  type: HistoryEventType.OrderAccepted;

  /**
   * Condensed info about the order.
   */
  orderShortInfo: OrderShortInfo;
}

/**
 * The customer refused to pay.
 */
export interface HistoryOrderRefusedEvent {
  /**
   * Type tag.
   */
  type: HistoryEventType.OrderRefused;

  /**
   * Condensed info about the order.
   */
  orderShortInfo: OrderShortInfo;
}

/**
 * The wallet has claimed an order.
 */
export interface HistoryOrderRedirectedEvent {
  /**
   * Type tag.
   */
  type: HistoryEventType.OrderRedirected;

  /**
   * Condensed info about the new order that contains a
   * product (identified by the fulfillment URL) that we've already paid for.
   */
  newOrderShortInfo: OrderShortInfo;

  /**
   * Condensed info about the order that we already paid for.
   */
  alreadyPaidOrderShortInfo: OrderShortInfo;
}

/**
 * The user aborted a pending, partially submitted payment.
 */
export interface HistoryPaymentAbortedEvent {
  /**
   * Type tag.
   */
  type: HistoryEventType.PaymentAborted;

  /**
   * Condensed info about the order that we already paid for.
   */
  orderShortInfo: OrderShortInfo;

  /**
   * Amount that was lost due to refund and refreshing fees.
   */
  amountLost: string;
}

export interface VerbosePayCoinDetails {
  coins: {
    value: string;
    contribution: string;
    denomPub: string;
  }[];
}

/**
 * History event to indicate that a payment has been (re-)submitted
 * to the merchant.
 */
export interface HistoryPaymentSent {
  /**
   * Type tag.
   */
  type: HistoryEventType.PaymentSent;

  /**
   * Condensed info about the order that we already paid for.
   */
  orderShortInfo: OrderShortInfo;

  /**
   * Set to true if the payment has been previously sent
   * to the merchant successfully, possibly with a different session ID.
   */
  replay: boolean;

  /**
   * Number of coins that were involved in the payment.
   */
  numCoins: number;

  /**
   * Amount that was paid, including deposit and wire fees.
   */
  amountPaidWithFees: string;

  /**
   * Session ID that the payment was (re-)submitted under.
   */
  sessionId: string | undefined;

  verboseDetails?: VerbosePayCoinDetails;
}

/**
 * A refund has been applied.
 */
export interface HistoryRefunded {
  /**
   * Type tag.
   */
  type: HistoryEventType.Refund;

  timestamp: Timestamp;

  orderShortInfo: OrderShortInfo;

  /**
   * Unique identifier for this refund.
   * (Identifies multiple refund permissions that were obtained at once.)
   */
  refundGroupId: string;

  /**
   * Part of the refund that couldn't be applied because
   * the refund permissions were expired.
   */
  amountRefundedInvalid: string;

  /**
   * Amount that has been refunded by the merchant.
   */
  amountRefundedRaw: string;

  /**
   * Amount will be added to the wallet's balance after fees and refreshing.
   */
  amountRefundedEffective: string;
}

export interface VerboseRefreshDetails {
  outputCoins: {
    denomPub: string;
    value: string;
  }[];
}

/**
 * Event to indicate that a group of refresh sessions has completed.
 */
export interface HistoryRefreshedEvent {
  /**
   * Type tag.
   */
  type: HistoryEventType.Refreshed;

  /**
   * Amount that is now available again because it has
   * been refreshed.
   */
  amountRefreshedEffective: string;

  /**
   * Amount that we spent for refreshing.
   */
  amountRefreshedRaw: string;

  /**
   * Why was the refreshing done?
   */
  refreshReason: RefreshReason;

  numInputCoins: number;
  numRefreshedInputCoins: number;
  numOutputCoins: number;

  /**
   * Identifier for a refresh group, contains one or
   * more refresh session IDs.
   */
  refreshGroupId: string;

  verboseDetails?: VerboseRefreshDetails;
}

export interface VerboseWithdrawDetails {
  coins: {
    value: string;
    denomPub: string;
  }[];
}

/**
 * A withdrawal has completed.
 */
export interface HistoryWithdrawnEvent {
  type: HistoryEventType.Withdrawn;

  /**
   * Exchange that was withdrawn from.
   */
  exchangeBaseUrl: string;

  /**
   * Unique identifier for the withdrawal session, can be used to
   * query more detailed information from the wallet.
   */
  withdrawSessionId: string;

  withdrawalSource: WithdrawalSource;

  /**
   * Amount that has been subtracted from the reserve's balance
   * for this withdrawal.
   */
  amountWithdrawnRaw: string;

  /**
   * Amount that actually was added to the wallet's balance.
   */
  amountWithdrawnEffective: string;

  /**
   * Verbose details of the operations, only generated when requested.
   */
  verboseDetails?: VerboseWithdrawDetails;
}

/**
 * Common fields that all history events need to have.
 */
export interface HistoryEventBase {
  type: HistoryEventType;

  /**
   * Main timestamp of the history event.
   */
  timestamp: Timestamp;

  /**
   * Opaque unique ID for the event, used as a starting point
   * for paginating history queries and for invoking actions
   * on the event (e.g. hiding it from the history).
   */
  eventId: string;

  /**
   * Extra details for debugging.
   */
  verboseDetails?: any;
}

/**
 * Union of all history detail types, discriminated by their type.
 */
export type HistoryEvent = HistoryEventBase &
  (
    | HistoryAuditorComplaintSentEvent
    | HistoryAuditorComplaintProcessedEvent
    | HistoryAuditorTrustAddedEvent
    | HistoryAuditorTrustRemovedEvent
    | HistoryExchangeAddedEvent
    | HistoryExchangeTermsAcceptedEvent
    | HistoryExchangePolicyChangedEvent
    | HistoryExchangeTrustAddedEvent
    | HistoryExchangeTrustRemovedEvent
    | HistoryExchangeUpdatedEvent
    | HistoryFundsDepositedToSelfEvent
    | HistoryFundsRecoupedEvent
    | HistoryOrderAcceptedEvent
    | HistoryOrderRedirectedEvent
    | HistoryOrderRefusedEvent
    | HistoryPaymentAbortedEvent
    | HistoryPaymentSent
    | HistoryRefreshedEvent
    | HistoryRefunded
    | HistoryReserveBalanceUpdatedEvent
    | HistoryReserveCreatedEvent
    | HistoryTipAcceptedEvent
    | HistoryTipDeclinedEvent
    | HistoryWithdrawnEvent
  );

export interface HistoryQuery {
  /**
   * Output extra verbose details, intended for debugging
   * and not for end users.
   */
  extraDebug?: boolean;
}
