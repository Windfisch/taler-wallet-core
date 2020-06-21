/*
 This file is part of GNU Taler
 (C) 2015-2020 Taler Systems SA

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Types used by clients of the wallet.
 *
 * These types are defined in a separate file make tree shaking easier, since
 * some components use these types (via RPC) but do not depend on the wallet
 * code directly.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports.
 */
import { AmountJson, codecForAmountJson } from "../util/amounts";
import * as LibtoolVersion from "../util/libtoolVersion";
import {
  ExchangeRecord,
  ExchangeWireInfo,
  DenominationSelectionInfo,
} from "./dbTypes";
import { Timestamp } from "../util/time";
import {
  makeCodecForObject,
  codecForString,
  makeCodecOptional,
  Codec,
} from "../util/codec";

/**
 * Response for the create reserve request to the wallet.
 */
export class CreateReserveResponse {
  /**
   * Exchange URL where the bank should create the reserve.
   * The URL is canonicalized in the response.
   */
  exchange: string;

  /**
   * Reserve public key of the newly created reserve.
   */
  reservePub: string;
}

/**
 * Information about what will happen when creating a reserve.
 *
 * Sent to the wallet frontend to be rendered and shown to the user.
 */
export interface ExchangeWithdrawDetails {
  /**
   * Exchange that the reserve will be created at.
   */
  exchangeInfo: ExchangeRecord;

  /**
   * Filtered wire info to send to the bank.
   */
  exchangeWireAccounts: string[];

  /**
   * Selected denominations for withdraw.
   */
  selectedDenoms: DenominationSelectionInfo;

  /**
   * Fees for withdraw.
   */
  withdrawFee: AmountJson;

  /**
   * Remaining balance that is too small to be withdrawn.
   */
  overhead: AmountJson;

  /**
   * Wire fees from the exchange.
   */
  wireFees: ExchangeWireInfo;

  /**
   * Does the wallet know about an auditor for
   * the exchange that the reserve.
   */
  isAudited: boolean;

  /**
   * Did the user already accept the current terms of service for the exchange?
   */
  termsOfServiceAccepted: boolean;

  /**
   * The exchange is trusted directly.
   */
  isTrusted: boolean;

  /**
   * The earliest deposit expiration of the selected coins.
   */
  earliestDepositExpiration: Timestamp;

  /**
   * Number of currently offered denominations.
   */
  numOfferedDenoms: number;

  /**
   * Public keys of trusted auditors for the currency we're withdrawing.
   */
  trustedAuditorPubs: string[];

  /**
   * Result of checking the wallet's version
   * against the exchange's version.
   *
   * Older exchanges don't return version information.
   */
  versionMatch: LibtoolVersion.VersionMatchResult | undefined;

  /**
   * Libtool-style version string for the exchange or "unknown"
   * for older exchanges.
   */
  exchangeVersion: string;

  /**
   * Libtool-style version string for the wallet.
   */
  walletVersion: string;
}

export interface WithdrawDetails {
  bankWithdrawDetails: BankWithdrawDetails;
  exchangeWithdrawDetails: ExchangeWithdrawDetails | undefined;
}

/**
 * Mapping from currency/exchange to detailed balance
 * information.
 */
export interface WalletBalance {
  /**
   * Mapping from currency name to detailed balance info.
   */
  byExchange: { [exchangeBaseUrl: string]: WalletBalanceEntry };

  /**
   * Mapping from currency name to detailed balance info.
   */
  byCurrency: { [currency: string]: WalletBalanceEntry };
}

/**
 * Detailed wallet balance for a particular currency.
 */
export interface WalletBalanceEntry {
  /**
   * Directly available amount.
   */
  available: AmountJson;
  /**
   * Amount that we're waiting for (refresh, withdrawal).
   */
  pendingIncoming: AmountJson;
  /**
   * Amount that's marked for a pending payment.
   */
  pendingPayment: AmountJson;
  /**
   * Amount that was paid back and we could withdraw again.
   */
  paybackAmount: AmountJson;

  pendingIncomingWithdraw: AmountJson;
  pendingIncomingRefresh: AmountJson;
  pendingIncomingDirty: AmountJson;
}

/**
 * For terseness.
 */
export function mkAmount(
  value: number,
  fraction: number,
  currency: string,
): AmountJson {
  return { value, fraction, currency };
}

/**
 * Result for confirmPay
 */
export interface ConfirmPayResult {
  nextUrl: string;
}

/**
 * Information about all sender wire details known to the wallet,
 * as well as exchanges that accept these wire types.
 */
export interface SenderWireInfos {
  /**
   * Mapping from exchange base url to list of accepted
   * wire types.
   */
  exchangeWireTypes: { [exchangeBaseUrl: string]: string[] };

  /**
   * Sender wire information stored in the wallet.
   */
  senderWires: string[];
}

/**
 * Request to create a reserve.
 */
export interface CreateReserveRequest {
  /**
   * The initial amount for the reserve.
   */
  amount: AmountJson;

  /**
   * Exchange URL where the bank should create the reserve.
   */
  exchange: string;

  /**
   * Payto URI that identifies the exchange's account that the funds
   * for this reserve go into.
   */
  exchangeWire: string;

  /**
   * Wire details (as a payto URI) for the bank account that sent the funds to
   * the exchange.
   */
  senderWire?: string;

  /**
   * URL to fetch the withdraw status from the bank.
   */
  bankWithdrawStatusUrl?: string;
}

export const codecForCreateReserveRequest = (): Codec<CreateReserveRequest> =>
  makeCodecForObject<CreateReserveRequest>()
    .property("amount", codecForAmountJson())
    .property("exchange", codecForString)
    .property("exchangeWire", codecForString)
    .property("senderWire", makeCodecOptional(codecForString))
    .property("bankWithdrawStatusUrl", makeCodecOptional(codecForString))
    .build("CreateReserveRequest");

/**
 * Request to mark a reserve as confirmed.
 */
export interface ConfirmReserveRequest {
  /**
   * Public key of then reserve that should be marked
   * as confirmed.
   */
  reservePub: string;
}

export const codecForConfirmReserveRequest = (): Codec<ConfirmReserveRequest> =>
  makeCodecForObject<ConfirmReserveRequest>()
    .property("reservePub", codecForString)
    .build("ConfirmReserveRequest");

/**
 * Wire coins to the user's own bank account.
 */
export class ReturnCoinsRequest {
  /**
   * The amount to wire.
   */
  amount: AmountJson;

  /**
   * The exchange to take the coins from.
   */
  exchange: string;

  /**
   * Wire details for the bank account of the customer that will
   * receive the funds.
   */
  senderWire?: object;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => ReturnCoinsRequest;
}

/**
 * Status of processing a tip.
 */
export interface TipStatus {
  accepted: boolean;
  amount: AmountJson;
  amountLeft: AmountJson;
  nextUrl: string;
  exchangeUrl: string;
  tipId: string;
  merchantTipId: string;
  merchantOrigin: string;
  expirationTimestamp: Timestamp;
  timestamp: Timestamp;
  totalFees: AmountJson;
}

export interface BenchmarkResult {
  time: { [s: string]: number };
  repetitions: number;
}

/**
 * Cached next URL for a particular session id.
 */
export interface NextUrlResult {
  nextUrl: string;
  lastSessionId: string | undefined;
}

export type PreparePayResult =
  | PreparePayResultError
  | PreparePayResultInsufficientBalance
  | PreparePayResultPaid
  | PreparePayResultPaymentPossible;

export interface PreparePayResultPaymentPossible {
  status: "payment-possible";
  proposalId: string;
  contractTermsRaw: string;
  totalFees: AmountJson;
}

export interface PreparePayResultInsufficientBalance {
  status: "insufficient-balance";
  proposalId: string;
  contractTermsRaw: any;
}

export interface PreparePayResultError {
  status: "error";
  error: string;
}

export interface PreparePayResultPaid {
  status: "paid";
  contractTermsRaw: any;
  nextUrl: string;
}

export interface BankWithdrawDetails {
  selectionDone: boolean;
  transferDone: boolean;
  amount: AmountJson;
  senderWire?: string;
  suggestedExchange?: string;
  confirmTransferUrl?: string;
  wireTypes: string[];
  extractedStatusUrl: string;
}

export interface AcceptWithdrawalResponse {
  reservePub: string;
  confirmTransferUrl?: string;
}

/**
 * Details about a purchase, including refund status.
 */
export interface PurchaseDetails {
  contractTerms: any;
  hasRefund: boolean;
  totalRefundAmount: AmountJson;
  totalRefundAndRefreshFees: AmountJson;
}

export interface WalletDiagnostics {
  walletManifestVersion: string;
  walletManifestDisplayVersion: string;
  errors: string[];
  firefoxIdbProblem: boolean;
  dbOutdated: boolean;
}

export interface OperationError {
  type: string;
  message: string;
  details: any;
}

export interface PlanchetCreationResult {
  coinPub: string;
  coinPriv: string;
  reservePub: string;
  denomPubHash: string;
  denomPub: string;
  blindingKey: string;
  withdrawSig: string;
  coinEv: string;
  coinValue: AmountJson;
  coinEvHash: string;
}

export interface PlanchetCreationRequest {
  value: AmountJson;
  feeWithdraw: AmountJson;
  denomPub: string;
  reservePub: string;
  reservePriv: string;
}

/**
 * Reasons for why a coin is being refreshed.
 */
export const enum RefreshReason {
  Manual = "manual",
  Pay = "pay",
  Refund = "refund",
  AbortPay = "abort-pay",
  Recoup = "recoup",
  BackupRestored = "backup-restored",
}

/**
 * Wrapper for coin public keys.
 */
export interface CoinPublicKey {
  readonly coinPub: string;
}

/**
 * Wrapper for refresh group IDs.
 */
export interface RefreshGroupId {
  readonly refreshGroupId: string;
}

/**
 * Private data required to make a deposit permission.
 */
export interface DepositInfo {
  exchangeBaseUrl: string;
  contractTermsHash: string;
  coinPub: string;
  coinPriv: string;
  spendAmount: AmountJson;
  timestamp: Timestamp;
  refundDeadline: Timestamp;
  merchantPub: string;
  feeDeposit: AmountJson;
  wireInfoHash: string;
  denomPub: string;
  denomSig: string;
}

export interface ExtendedPermissionsResponse {
  newValue: boolean;
}
