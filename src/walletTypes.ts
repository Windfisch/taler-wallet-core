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
import {
  CoinPaySig,
  ContractTerms,
  PayReq,
  TipResponse,
} from "./talerTypes";


/**
 * Response for the create reserve request to the wallet.
 */
@Checkable.Class()
export class CreateReserveResponse {
  /**
   * Exchange URL where the bank should create the reserve.
   * The URL is canonicalized in the response.
   */
  @Checkable.String
  exchange: string;

  /**
   * Reserve public key of the newly created reserve.
   */
  @Checkable.String
  reservePub: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => CreateReserveResponse;
}


/**
 * Wire info, sent to the bank when creating a reserve.  Fee information will
 * be filtered out.  Only methods that the bank also supports should be sent.
 */
export interface WireInfo {
  /**
   * Mapping from wire method type to the exchange's wire info,
   * excluding fees.
   */
  [type: string]: any;
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
  wireInfo: WireInfo;

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
  versionMatch: LibtoolVersion.VersionMatchResult|undefined;

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
export function mkAmount(value: number, fraction: number, currency: string): AmountJson {
  return {value, fraction, currency};
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
 * Response to a query payment request.  Tagged union over the 'found' field.
 */
export type QueryPaymentResult = QueryPaymentNotFound | QueryPaymentFound;


/**
 * Query payment response when the payment was found.
 */
export interface QueryPaymentNotFound {
  found: false;
}


/**
 * Query payment response when the payment wasn't found.
 */
export interface QueryPaymentFound {
  found: true;
  contractTermsHash: string;
  contractTerms: ContractTerms;
  lastSessionSig?: string;
  payReq: PayReq;
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
  senderWires: object[];
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
  @Checkable.String
  exchange: string;

  /**
   * Wire details for the bank account that sent the funds to the exchange.
   */
  @Checkable.Optional(Checkable.Any)
  senderWire?: object;

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
  @Checkable.String
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
  @Checkable.String
  exchange: string;

  /**
   * Wire details for the bank account of the customer that will
   * receive the funds.
   */
  @Checkable.Any
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
  tip: TipRecord;
  rci?: ReserveCreationInfo;
}


/**
 * Request to the wallet for the status of processing a tip.
 */
@Checkable.Class()
export class TipStatusRequest {
  /**
   * Identifier of the tip.
   */
  @Checkable.String
  tipId: string;

  /**
   * Merchant domain.  Within each merchant domain, the tip identifier
   * uniquely identifies a tip.
   */
  @Checkable.String
  merchantDomain: string;

  /**
   * Create a TipStatusRequest from untyped JSON.
   */
  static checked: (obj: any) => TipStatusRequest;
}

/**
 * Request to the wallet to accept a tip.
 */
@Checkable.Class()
export class AcceptTipRequest {
  /**
   * Identifier of the tip.
   */
  @Checkable.String
  tipId: string;

  /**
   * Merchant domain.  Within each merchant domain, the tip identifier
   * uniquely identifies a tip.
   */
  @Checkable.String
  merchantDomain: string;

  /**
   * Create an AcceptTipRequest from untyped JSON.
   * Validates the schema and throws on error.
   */
  static checked: (obj: any) => AcceptTipRequest;
}


/**
 * Request for the wallet to process a tip response from a merchant.
 */
@Checkable.Class()
export class ProcessTipResponseRequest {
  /**
   * Identifier of the tip.
   */
  @Checkable.String
  tipId: string;

  /**
   * Merchant domain.  Within each merchant domain, the tip identifier
   * uniquely identifies a tip.
   */
  @Checkable.String
  merchantDomain: string;

  /**
   * Tip response from the merchant.
   */
  @Checkable.Value(() => TipResponse)
  tipResponse: TipResponse;

  /**
   * Create an AcceptTipRequest from untyped JSON.
   * Validates the schema and throws on error.
   */
  static checked: (obj: any) => ProcessTipResponseRequest;
}


/**
 * Request for the wallet to generate tip planchets.
 */
@Checkable.Class()
export class GetTipPlanchetsRequest {
  /**
   * Identifier of the tip.
   */
  @Checkable.String
  tipId: string;

  /**
   * Merchant domain.  Within each merchant domain, the tip identifier
   * uniquely identifies a tip.
   */
  @Checkable.String
  merchantDomain: string;

  /**
   * Amount of the tip.
   */
  @Checkable.Optional(Checkable.Value(() => AmountJson))
  amount: AmountJson;

  /**
   * Deadline for picking up the tip.
   */
  @Checkable.Number
  deadline: number;

  /**
   * Exchange URL that must be used to pick up the tip.
   */
  @Checkable.String
  exchangeUrl: string;

  /**
   * URL to nagivate to after processing the tip.
   */
  @Checkable.String
  nextUrl: string;

  /**
   * Create an AcceptTipRequest from untyped JSON.
   * Validates the schema and throws on error.
   */
  static checked: (obj: any) => GetTipPlanchetsRequest;
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
