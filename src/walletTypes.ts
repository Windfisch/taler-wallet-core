/*
 This file is part of TALER
 (C) 2015-2017 GNUnet e.V. and INRIA

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
 */

/**
 * Imports.
 */
import { Checkable } from "./checkable";
import * as LibtoolVersion from "./libtoolVersion";

import { AmountJson } from "./amounts";

import {
  CoinRecord,
  DenominationRecord,
  ExchangeRecord,
  ExchangeWireFeesRecord,
  TipRecord,
} from "./dbTypes";
import { CoinPaySig, ContractTerms, PayReq } from "./talerTypes";

/**
 * Response for the create reserve request to the wallet.
 */
@Checkable.Class()
export class CreateReserveResponse {
  /**
   * Exchange URL where the bank should create the reserve.
   * The URL is canonicalized in the response.
   */
  @Checkable.String()
  exchange: string;

  /**
   * Reserve public key of the newly created reserve.
   */
  @Checkable.String()
  reservePub: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => CreateReserveResponse;
}

/**
 * Information about what will happen when creating a reserve.
 *
 * Sent to the wallet frontend to be rendered and shown to the user.
 */
export interface ReserveCreationInfo {
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
  selectedDenoms: DenominationRecord[];

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
  wireFees: ExchangeWireFeesRecord;

  /**
   * Does the wallet know about an auditor for
   * the exchange that the reserve.
   */
  isAudited: boolean;

  /**
   * The exchange is trusted directly.
   */
  isTrusted: boolean;

  /**
   * The earliest deposit expiration of the selected coins.
   */
  earliestDepositExpiration: number;

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
  withdrawInfo: DownloadedWithdrawInfo;
  reserveCreationInfo: ReserveCreationInfo | undefined;
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
}

/**
 * Coins used for a payment, with signatures authorizing the payment and the
 * coins with remaining value updated to accomodate for a payment.
 */
export interface PayCoinInfo {
  originalCoins: CoinRecord[];
  updatedCoins: CoinRecord[];
  sigs: CoinPaySig[];
}

/**
 * Listener for notifications from the wallet.
 */
export interface Notifier {
  /**
   * Called when a new notification arrives.
   */
  notify(): void;
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
 * Possible results for checkPay.
 */
export interface CheckPayResult {
  status: "paid" | "payment-possible" | "insufficient-balance";
  coinSelection?: CoinSelectionResult;
}

/**
 * Result for confirmPay
 */
export interface ConfirmPayResult {
  nextUrl: string;
}

/**
 * Activity history record.
 */
export interface HistoryRecord {
  /**
   * Type of the history event.
   */
  type: string;

  /**
   * Time when the activity was recorded.
   */
  timestamp: number;

  /**
   * Subject of the entry.  Used to group multiple history records together.
   * Only the latest history record with the same subjectId will be shown.
   */
  subjectId?: string;

  /**
   * Details used when rendering the history record.
   */
  detail: any;
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
 * Request to mark a reserve as confirmed.
 */
@Checkable.Class()
export class CreateReserveRequest {
  /**
   * The initial amount for the reserve.
   */
  @Checkable.Value(() => AmountJson)
  amount: AmountJson;

  /**
   * Exchange URL where the bank should create the reserve.
   */
  @Checkable.String()
  exchange: string;

  /**
   * Payto URI that identifies the exchange's account that the funds
   * for this reserve go into.
   */
  @Checkable.String()
  exchangeWire: string;

  /**
   * Wire details (as a payto URI) for the bank account that sent the funds to
   * the exchange.
   */
  @Checkable.Optional(Checkable.String())
  senderWire?: string;

  /**
   * URL to fetch the withdraw status from the bank.
   */
  @Checkable.Optional(Checkable.String())
  bankWithdrawStatusUrl?: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => CreateReserveRequest;
}

/**
 * Request to mark a reserve as confirmed.
 */
@Checkable.Class()
export class ConfirmReserveRequest {
  /**
   * Public key of then reserve that should be marked
   * as confirmed.
   */
  @Checkable.String()
  reservePub: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => ConfirmReserveRequest;
}

/**
 * Wire coins to the user's own bank account.
 */
@Checkable.Class()
export class ReturnCoinsRequest {
  /**
   * The amount to wire.
   */
  @Checkable.Value(() => AmountJson)
  amount: AmountJson;

  /**
   * The exchange to take the coins from.
   */
  @Checkable.String()
  exchange: string;

  /**
   * Wire details for the bank account of the customer that will
   * receive the funds.
   */
  @Checkable.Any()
  senderWire?: object;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => ReturnCoinsRequest;
}

/**
 * Result of selecting coins, contains the exchange, and selected
 * coins with their denomination.
 */
export interface CoinSelectionResult {
  exchangeUrl: string;
  cds: CoinWithDenom[];
  totalFees: AmountJson;
  /**
   * Total amount, including wire fees payed by the customer.
   */
  totalAmount: AmountJson;
}

/**
 * Named tuple of coin and denomination.
 */
export interface CoinWithDenom {
  /**
   * A coin.  Must have the same denomination public key as the associated
   * denomination.
   */
  coin: CoinRecord;
  /**
   * An associated denomination.
   */
  denom: DenominationRecord;
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
  merchantOrigin: string;
  expirationTimestamp: number;
  timestamp: number;
  totalFees: AmountJson;
}

/**
 * Badge that shows activity for the wallet.
 */
export interface Badge {
  /**
   * Start indicating background activity.
   */
  startBusy(): void;

  /**
   * Stop indicating background activity.
   */
  stopBusy(): void;

  /**
   * Show the notification in the badge.
   */
  showNotification(): void;

  /**
   * Stop showing the notification.
   */
  clearNotification(): void;
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
  proposalId?: number;
  contractTerms?: ContractTerms;
  totalFees?: AmountJson;
}

export interface PreparePayResultInsufficientBalance {
  status: "insufficient-balance";
  proposalId?: number;
  contractTerms?: ContractTerms;
  totalFees?: AmountJson;
}

export interface PreparePayResultError {
  status: "error";
  error: string;
}

export interface PreparePayResultPaid {
  status: "paid";
  proposalId?: number;
  contractTerms?: ContractTerms;
  nextUrl: string;
}

export interface DownloadedWithdrawInfo {
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
  contractTerms: ContractTerms;
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
