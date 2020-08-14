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
 * Type and schema definitions for the wallet's transaction list.
 *
 * @author Florian Dold
 * @author Torsten Grote
 */

/**
 * Imports.
 */
import { Timestamp } from "../util/time";
import { AmountString, Product } from "./talerTypes";
import {
  Codec,
  buildCodecForObject,
  codecOptional,
  codecForString,
  codecForList,
  codecForAny,
} from "../util/codec";

export interface TransactionsRequest {
  /**
   * return only transactions in the given currency
   */
  currency?: string;

  /**
   * if present, results will be limited to transactions related to the given search string
   */
  search?: string;
}

export interface TransactionsResponse {
  // a list of past and pending transactions sorted by pending, timestamp and transactionId.
  // In case two events are both pending and have the same timestamp,
  // they are sorted by the transactionId
  // (lexically ascending and locale-independent comparison).
  transactions: Transaction[];
}

export interface TransactionError {
  /**
   * TALER_EC_* unique error code.
   * The action(s) offered and message displayed on the transaction item depend on this code.
   */
  ec: number;

  /**
   * English-only error hint, if available.
   */
  hint?: string;

  /**
   * Error details specific to "ec", if applicable/available
   */
  details?: any;
}

export interface TransactionCommon {
  // opaque unique ID for the transaction, used as a starting point for paginating queries
  // and for invoking actions on the transaction (e.g. deleting/hiding it from the history)
  transactionId: string;

  // the type of the transaction; different types might provide additional information
  type: TransactionType;

  // main timestamp of the transaction
  timestamp: Timestamp;

  // true if the transaction is still pending, false otherwise
  // If a transaction is not longer pending, its timestamp will be updated,
  // but its transactionId will remain unchanged
  pending: boolean;

  // Raw amount of the transaction (exclusive of fees or other extra costs)
  amountRaw: AmountString;

  // Amount added or removed from the wallet's balance (including all fees and other costs)
  amountEffective: AmountString;

  error?: TransactionError;
}

export type Transaction =
  | TransactionWithdrawal
  | TransactionPayment
  | TransactionRefund
  | TransactionTip
  | TransactionRefresh;

export const enum TransactionType {
  Withdrawal = "withdrawal",
  Payment = "payment",
  Refund = "refund",
  Refresh = "refresh",
  Tip = "tip",
}

export const enum WithdrawalType {
  TalerBankIntegrationApi = "taler-bank-integration-api",
  ManualTransfer = "manual-transfer",
}

export type WithdrawalDetails =
  | WithdrawalDetailsForManualTransfer
  | WithdrawalDetailsForTalerBankIntegrationApi;

interface WithdrawalDetailsForManualTransfer {
  type: WithdrawalType.ManualTransfer;

  /**
   * Payto URIs that the exchange supports.
   *
   * Already contains the amount and message.
   */
  exchangePaytoUris: string[];
}

interface WithdrawalDetailsForTalerBankIntegrationApi {
  type: WithdrawalType.TalerBankIntegrationApi;

  /**
   * Set to true if the bank has confirmed the withdrawal, false if not.
   * An unconfirmed withdrawal usually requires user-input and should be highlighted in the UI.
   * See also bankConfirmationUrl below.
   */
  confirmed: boolean;

  /**
   * If the withdrawal is unconfirmed, this can include a URL for user
   * initiated confirmation.
   */
  bankConfirmationUrl?: string;
}

// This should only be used for actual withdrawals
// and not for tips that have their own transactions type.
interface TransactionWithdrawal extends TransactionCommon {
  type: TransactionType.Withdrawal;

  /**
   * Exchange of the withdrawal.
   */
  exchangeBaseUrl: string;

  /**
   * Amount that got subtracted from the reserve balance.
   */
  amountRaw: AmountString;

  /**
   * Amount that actually was (or will be) added to the wallet's balance.
   */
  amountEffective: AmountString;

  withdrawalDetails: WithdrawalDetails;
}

export const enum PaymentStatus {
  /**
   * Explicitly aborted after timeout / failure
   */
  Aborted = "aborted",

  /**
   * Payment failed, wallet will auto-retry.
   * User should be given the option to retry now / abort.
   */
  Failed = "failed",

  /**
   * Paid successfully
   */
  Paid = "paid",

  /**
   * User accepted, payment is processing.
   */
  Accepted = "accepted",
}

export interface TransactionPayment extends TransactionCommon {
  type: TransactionType.Payment;

  /**
   * Additional information about the payment.
   */
  info: PaymentShortInfo;

  /**
   * How far did the wallet get with processing the payment?
   */
  status: PaymentStatus;

  /**
   * Amount that must be paid for the contract
   */
  amountRaw: AmountString;

  /**
   * Amount that was paid, including deposit, wire and refresh fees.
   */
  amountEffective: AmountString;
}

export interface PaymentShortInfo {
  /**
   * Order ID, uniquely identifies the order within a merchant instance
   */
  orderId: string;

  /**
   * More information about the merchant
   */
  merchant: any;

  /**
   * Summary of the order, given by the merchant
   */
  summary: string;

  /**
   * Map from IETF BCP 47 language tags to localized summaries
   */
  summary_i18n?: { [lang_tag: string]: string };

  /**
   * List of products that are part of the order
   */
  products: Product[] | undefined;

  /**
   * URL of the fulfillment, given by the merchant
   */
  fulfillmentUrl: string;
}

interface TransactionRefund extends TransactionCommon {
  type: TransactionType.Refund;

  // ID for the transaction that is refunded
  refundedTransactionId: string;

  // Additional information about the refunded payment
  info: PaymentShortInfo;

  // Amount that has been refunded by the merchant
  amountRaw: AmountString;

  // Amount will be added to the wallet's balance after fees and refreshing
  amountEffective: AmountString;
}

interface TransactionTip extends TransactionCommon {
  type: TransactionType.Tip;

  // true if the user still needs to accept/decline this tip
  waiting: boolean;

  // true if the user has accepted this top, false otherwise
  accepted: boolean;

  // Exchange that the tip will be (or was) withdrawn from
  exchangeBaseUrl: string;

  // More information about the merchant that sent the tip
  merchant: any;

  // Raw amount of the tip, without extra fees that apply
  amountRaw: AmountString;

  // Amount will be (or was) added to the wallet's balance after fees and refreshing
  amountEffective: AmountString;
}

// A transaction shown for refreshes that are not associated to other transactions
// such as a refresh necessary before coin expiration.
// It should only be returned by the API if the effective amount is different from zero.
interface TransactionRefresh extends TransactionCommon {
  type: TransactionType.Refresh;

  // Exchange that the coins are refreshed with
  exchangeBaseUrl: string;

  // Raw amount that is refreshed
  amountRaw: AmountString;

  // Amount that will be paid as fees for the refresh
  amountEffective: AmountString;
}

export const codecForTransactionsRequest = (): Codec<TransactionsRequest> =>
  buildCodecForObject<TransactionsRequest>()
    .property("currency", codecOptional(codecForString()))
    .property("search", codecOptional(codecForString()))
    .build("TransactionsRequest");

// FIXME: do full validation here!
export const codecForTransactionsResponse = (): Codec<TransactionsResponse> =>
  buildCodecForObject<TransactionsResponse>()
    .property("transactions", codecForList(codecForAny()))
    .build("TransactionsResponse");