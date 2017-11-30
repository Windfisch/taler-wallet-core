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
 * Common types that are used by Taler and some helper functions
 * to deal with them.
 *
 * Note most types are defined in wallet.ts, types that
 * are defined in types.ts are intended to be used by components
 * that do not depend on the whole wallet implementation.
 */

/**
 * Imports.
 */
import { Checkable } from "./checkable";
import * as LibtoolVersion from "./libtoolVersion";

/**
 * Non-negative financial amount.  Fractional values are expressed as multiples
 * of 1e-8.
 */
@Checkable.Class()
export class AmountJson {
  /**
   * Value, must be an integer.
   */
  @Checkable.Number
  readonly value: number;

  /**
   * Fraction, must be an integer.  Represent 1/1e8 of a unit.
   */
  @Checkable.Number
  readonly fraction: number;

  /**
   * Currency of the amount.
   */
  @Checkable.String
  readonly currency: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => AmountJson;
}


/**
 * Amount with a sign.
 */
export interface SignedAmountJson {
  /**
   * The absolute amount.
   */
  amount: AmountJson;
  /**
   * Sign.
   */
  isNegative: boolean;
}


/**
 * A reserve record as stored in the wallet's database.
 */
export interface ReserveRecord {
  /**
   * The reserve public key.
   */
  reserve_pub: string;

  /**
   * The reserve private key.
   */
  reserve_priv: string;

  /**
   * The exchange base URL.
   */
  exchange_base_url: string;

  /**
   * Time when the reserve was created.
   */
  created: number;

  /**
   * Time when the reserve was depleted.
   * Set to 0 if not depleted yet.
   */
  timestamp_depleted: number;

  /**
   * Time when the reserve was confirmed.
   *
   * Set to 0 if not confirmed yet.
   */
  timestamp_confirmed: number;

  /**
   * Current amount left in the reserve
   */
  current_amount: AmountJson | null;

  /**
   * Amount requested when the reserve was created.
   * When a reserve is re-used (rare!)  the current_amount can
   * be higher than the requested_amount
   */
  requested_amount: AmountJson;

  /**
   * What's the current amount that sits
   * in precoins?
   */
  precoin_amount: AmountJson;

  /**
   * We got some payback to this reserve.  We'll cease to automatically
   * withdraw money from it.
   */
  hasPayback: boolean;

  /**
   * Wire information for the bank account that
   * transfered funds for this reserve.
   */
  senderWire?: object;
}


/**
 * Auditor record as stored with currencies in the exchange database.
 */
export interface AuditorRecord {
  /**
   * Base url of the auditor.
   */
  baseUrl: string;
  /**
   * Public signing key of the auditor.
   */
  auditorPub: string;
  /**
   * Time when the auditing expires.
   */
  expirationStamp: number;
}


/**
 * Exchange for currencies as stored in the wallet's currency
 * information database.
 */
export interface ExchangeForCurrencyRecord {
  /**
   * FIXME: unused?
   */
  exchangePub: string;
  /**
   * Base URL of the exchange.
   */
  baseUrl: string;
}


/**
 * Information about a currency as displayed in the wallet's database.
 */
export interface CurrencyRecord {
  /**
   * Name of the currency.
   */
  name: string;
  /**
   * Number of fractional digits to show when rendering the currency.
   */
  fractionalDigits: number;
  /**
   * Auditors that the wallet trusts for this currency.
   */
  auditors: AuditorRecord[];
  /**
   * Exchanges that the wallet trusts for this currency.
   */
  exchanges: ExchangeForCurrencyRecord[];
}


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
 * Status of a denomination.
 */
export enum DenominationStatus {
  /**
   * Verification was delayed.
   */
  Unverified,
  /**
   * Verified as valid.
   */
  VerifiedGood,
  /**
   * Verified as invalid.
   */
  VerifiedBad,
}

/**
 * Denomination record as stored in the wallet's database.
 */
@Checkable.Class()
export class DenominationRecord {
  /**
   * Value of one coin of the denomination.
   */
  @Checkable.Value(AmountJson)
  value: AmountJson;

  /**
   * The denomination public key.
   */
  @Checkable.String
  denomPub: string;

  /**
   * Hash of the denomination public key.
   * Stored in the database for faster lookups.
   */
  @Checkable.String
  denomPubHash: string;

  /**
   * Fee for withdrawing.
   */
  @Checkable.Value(AmountJson)
  feeWithdraw: AmountJson;

  /**
   * Fee for depositing.
   */
  @Checkable.Value(AmountJson)
  feeDeposit: AmountJson;

  /**
   * Fee for refreshing.
   */
  @Checkable.Value(AmountJson)
  feeRefresh: AmountJson;

  /**
   * Fee for refunding.
   */
  @Checkable.Value(AmountJson)
  feeRefund: AmountJson;

  /**
   * Validity start date of the denomination.
   */
  @Checkable.String
  stampStart: string;

  /**
   * Date after which the currency can't be withdrawn anymore.
   */
  @Checkable.String
  stampExpireWithdraw: string;

  /**
   * Date after the denomination officially doesn't exist anymore.
   */
  @Checkable.String
  stampExpireLegal: string;

  /**
   * Data after which coins of this denomination can't be deposited anymore.
   */
  @Checkable.String
  stampExpireDeposit: string;

  /**
   * Signature by the exchange's master key over the denomination
   * information.
   */
  @Checkable.String
  masterSig: string;

  /**
   * Did we verify the signature on the denomination?
   */
  @Checkable.Number
  status: DenominationStatus;

  /**
   * Was this denomination still offered by the exchange the last time
   * we checked?
   * Only false when the exchange redacts a previously published denomination.
   */
  @Checkable.Boolean
  isOffered: boolean;

  /**
   * Base URL of the exchange.
   */
  @Checkable.String
  exchangeBaseUrl: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => Denomination;
}

/**
 * Denomination as found in the /keys response from the exchange.
 */
@Checkable.Class()
export class Denomination {
  /**
   * Value of one coin of the denomination.
   */
  @Checkable.Value(AmountJson)
  value: AmountJson;

  /**
   * Public signing key of the denomination.
   */
  @Checkable.String
  denom_pub: string;

  /**
   * Fee for withdrawing.
   */
  @Checkable.Value(AmountJson)
  fee_withdraw: AmountJson;

  /**
   * Fee for depositing.
   */
  @Checkable.Value(AmountJson)
  fee_deposit: AmountJson;

  /**
   * Fee for refreshing.
   */
  @Checkable.Value(AmountJson)
  fee_refresh: AmountJson;

  /**
   * Fee for refunding.
   */
  @Checkable.Value(AmountJson)
  fee_refund: AmountJson;

  /**
   * Start date from which withdraw is allowed.
   */
  @Checkable.String
  stamp_start: string;

  /**
   * End date for withdrawing.
   */
  @Checkable.String
  stamp_expire_withdraw: string;

  /**
   * Expiration date after which the exchange can forget about
   * the currency.
   */
  @Checkable.String
  stamp_expire_legal: string;

  /**
   * Date after which the coins of this denomination can't be
   * deposited anymore.
   */
  @Checkable.String
  stamp_expire_deposit: string;

  /**
   * Signature over the denomination information by the exchange's master
   * signing key.
   */
  @Checkable.String
  master_sig: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => Denomination;
}


/**
 * Signature by the auditor that a particular denomination key is audited.
 */
@Checkable.Class()
export class AuditorDenomSig {
  /**
   * Denomination public key's hash.
   */
  @Checkable.String
  denom_pub_h: string;

  /**
   * The signature.
   */
  @Checkable.String
  auditor_sig: string;
}

/**
 * Auditor information as given by the exchange in /keys.
 */
@Checkable.Class()
export class Auditor {
  /**
   * Auditor's public key.
   */
  @Checkable.String
  auditor_pub: string;

  /**
   * Base URL of the auditor.
   */
  @Checkable.String
  auditor_url: string;

  /**
   * List of signatures for denominations by the auditor.
   */
  @Checkable.List(Checkable.Value(AuditorDenomSig))
  denomination_keys: AuditorDenomSig[];
}


/**
 * Exchange record as stored in the wallet's database.
 */
export interface ExchangeRecord {
  /**
   * Base url of the exchange.
   */
  baseUrl: string;
  /**
   * Master public key of the exchange.
   */
  masterPublicKey: string;
  /**
   * Auditors (partially) auditing the exchange.
   */
  auditors: Auditor[];

  /**
   * Currency that the exchange offers.
   */
  currency: string;

  /**
   * Timestamp for last update.
   */
  lastUpdateTime: number;

  /**
   * Last observed protocol version.
   */
  protocolVersion?: string;
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
}


/**
 * A coin that isn't yet signed by an exchange.
 */
export interface PreCoinRecord {
  coinPub: string;
  coinPriv: string;
  reservePub: string;
  denomPub: string;
  blindingKey: string;
  withdrawSig: string;
  coinEv: string;
  exchangeBaseUrl: string;
  coinValue: AmountJson;
  /**
   * Set to true if this pre-coin came from a tip.
   * Until the tip is marked as "accepted", the resulting
   * coin will not be used for payments.
   */
  isFromTip: boolean;
}

/**
 * Planchet for a coin during refrehs.
 */
export interface RefreshPreCoinRecord {
  /**
   * Public key for the coin.
   */
  publicKey: string;
  /**
   * Private key for the coin.
   */
  privateKey: string;
  /**
   * Blinded public key.
   */
  coinEv: string;
  /**
   * Blinding key used.
   */
  blindingKey: string;
}

/**
 * Request that we send to the exchange to get a payback.
 */
export interface PaybackRequest {
  /**
   * Denomination public key of the coin we want to get
   * paid back.
   */
  denom_pub: string;

  /**
   * Signature over the coin public key by the denomination.
   */
  denom_sig: string;

  /**
   * Coin public key of the coin we want to refund.
   */
  coin_pub: string;

  /**
   * Blinding key that was used during withdraw,
   * used to prove that we were actually withdrawing the coin.
   */
  coin_blind_key_secret: string;

  /**
   * Signature made by the coin, authorizing the payback.
   */
  coin_sig: string;
}

/**
 * Response that we get from the exchange for a payback request.
 */
@Checkable.Class()
export class PaybackConfirmation {
  /**
   * public key of the reserve that will receive the payback.
   */
  @Checkable.String
  reserve_pub: string;

  /**
   * How much will the exchange pay back (needed by wallet in
   * case coin was partially spent and wallet got restored from backup)
   */
  @Checkable.Value(AmountJson)
  amount: AmountJson;

  /**
   * Time by which the exchange received the /payback request.
   */
  @Checkable.String
  timestamp: string;

  /**
   * the EdDSA signature of TALER_PaybackConfirmationPS using a current
   * signing key of the exchange affirming the successful
   * payback request, and that the exchange promises to transfer the funds
   * by the date specified (this allows the exchange delaying the transfer
   * a bit to aggregate additional payback requests into a larger one).
   */
  @Checkable.String
  exchange_sig: string;

  /**
   * Public EdDSA key of the exchange that was used to generate the signature.
   * Should match one of the exchange's signing keys from /keys.  It is given
   * explicitly as the client might otherwise be confused by clock skew as to
   * which signing key was used.
   */
  @Checkable.String
  exchange_pub: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => PaybackConfirmation;
}

/**
 * Ongoing refresh
 */
export interface RefreshSessionRecord {
  /**
   * Public key that's being melted in this session.
   */
  meltCoinPub: string;

  /**
   * How much of the coin's value is melted away
   * with this refresh session?
   */
  valueWithFee: AmountJson;

  /**
   * Sum of the value of denominations we want
   * to withdraw in this session, without fees.
   */
  valueOutput: AmountJson;

  /**
   * Signature to confirm the melting.
   */
  confirmSig: string;

  /**
   * Denominations of the newly requested coins
   */
  newDenoms: string[];

  /**
   * Precoins for each cut-and-choose instance.
   */
  preCoinsForGammas: RefreshPreCoinRecord[][];

  /**
   * The transfer keys, kappa of them.
   */
  transferPubs: string[];

  /**
   * Private keys for the transfer public keys.
   */
  transferPrivs: string[];

  /**
   * The no-reveal-index after we've done the melting.
   */
  norevealIndex?: number;

  /**
   * Hash of the session.
   */
  hash: string;

  /**
   * Base URL for the exchange we're doing the refresh with.
   */
  exchangeBaseUrl: string;

  /**
   * Is this session finished?
   */
  finished: boolean;

  /**
   * Record ID when retrieved from the DB.
   */
  id?: number;
}


/**
 * Deposit permission for a single coin.
 */
export interface CoinPaySig {
  /**
   * Signature by the coin.
   */
  coin_sig: string;
  /**
   * Public key of the coin being spend.
   */
  coin_pub: string;
  /**
   * Signature made by the denomination public key.
   */
  ub_sig: string;
  /**
   * The denomination public key associated with this coin.
   */
  denom_pub: string;
  /**
   * The amount that is subtracted from this coin with this payment.
   */
  f: AmountJson;
}


/**
 * Status of a coin.
 */
export enum CoinStatus {
  /**
   * Withdrawn and never shown to anybody.
   */
  Fresh,
  /**
   * Currently planned to be sent to a merchant for a purchase.
   */
  PurchasePending,
  /**
   * Used for a completed transaction and now dirty.
   */
  Dirty,
  /**
   * A coin that was refreshed.
   */
  Refreshed,
  /**
   * Coin marked to be paid back, but payback not finished.
   */
  PaybackPending,
  /**
   * Coin fully paid back.
   */
  PaybackDone,
  /**
   * Coin was dirty but can't be refreshed.
   */
  Useless,
  /**
   * The coin was withdrawn for a tip that the user hasn't accepted yet.
   */
  TainedByTip,
}


/**
 * State of returning a list of coins
 * to the customer's bank account.
 */
export interface CoinsReturnRecord {
  /**
   * Coins that we're returning.
   */
  coins: CoinPaySig[];

  /**
   * Responses to the deposit requests.
   */
  responses: any;

  /**
   * Ephemeral dummy merchant key for
   * the coins returns operation.
   */
  dummyMerchantPub: string;

  /**
   * Ephemeral dummy merchant key for
   * the coins returns operation.
   */
  dummyMerchantPriv: string;

  /**
   * Contract terms.
   */
  contractTerms: string;

  /**
   * Hash of contract terms.
   */
  contractTermsHash: string;

  /**
   * Wire info to send the money for the coins to.
   */
  wire: object;

  /**
   * Hash of the wire object.
   */
  wireHash: string;

  /**
   * All coins were deposited.
   */
  finished: boolean;
}


/**
 * CoinRecord as stored in the "coins" data store
 * of the wallet database.
 */
export interface CoinRecord {
  /**
   * Public key of the coin.
   */
  coinPub: string;

  /**
   * Private key to authorize operations on the coin.
   */
  coinPriv: string;

  /**
   * Key used by the exchange used to sign the coin.
   */
  denomPub: string;

  /**
   * Unblinded signature by the exchange.
   */
  denomSig: string;

  /**
   * Amount that's left on the coin.
   */
  currentAmount: AmountJson;

  /**
   * Base URL that identifies the exchange from which we got the
   * coin.
   */
  exchangeBaseUrl: string;

  /**
   * We have withdrawn the coin, but it's not accepted by the exchange anymore.
   * We have to tell an auditor and wait for compensation or for the exchange
   * to fix it.
   */
  suspended?: boolean;

  /**
   * Blinding key used when withdrawing the coin.
   * Potentionally sed again during payback.
   */
  blindingKey: string;

  /**
   * Reserve public key for the reserve we got this coin from,
   * or zero when we got the coin from refresh.
   */
  reservePub: string|undefined;

  /**
   * Status of the coin.
   */
  status: CoinStatus;
}


/**
 * Information about an exchange as stored inside a
 * merchant's contract terms.
 */
@Checkable.Class()
export class ExchangeHandle {
  /**
   * Master public signing key of the exchange.
   */
  @Checkable.String
  master_pub: string;

  /**
   * Base URL of the exchange.
   */
  @Checkable.String
  url: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => ExchangeHandle;
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
 * Contract terms from a merchant.
 */
@Checkable.Class({validate: true})
export class ContractTerms {
  static validate(x: ContractTerms) {
    if (x.exchanges.length === 0) {
      throw Error("no exchanges in contract terms");
    }
  }

  /**
   * Hash of the merchant's wire details.
   */
  @Checkable.String
  H_wire: string;

  /**
   * Wire method the merchant wants to use.
   */
  @Checkable.String
  wire_method: string;

  /**
   * Human-readable short summary of the contract.
   */
  @Checkable.Optional(Checkable.String)
  summary?: string;

  /**
   * Nonce used to ensure freshness.
   */
  @Checkable.Optional(Checkable.String)
  nonce?: string;

  /**
   * Total amount payable.
   */
  @Checkable.Value(AmountJson)
  amount: AmountJson;

  /**
   * Auditors accepted by the merchant.
   */
  @Checkable.List(Checkable.AnyObject)
  auditors: any[];

  /**
   * Deadline to pay for the contract.
   */
  @Checkable.Optional(Checkable.String)
  pay_deadline: string;

  /**
   * Delivery locations.
   */
  @Checkable.Any
  locations: any;

  /**
   * Maximum deposit fee covered by the merchant.
   */
  @Checkable.Value(AmountJson)
  max_fee: AmountJson;

  /**
   * Information about the merchant.
   */
  @Checkable.Any
  merchant: any;

  /**
   * Public key of the merchant.
   */
  @Checkable.String
  merchant_pub: string;

  /**
   * List of accepted exchanges.
   */
  @Checkable.List(Checkable.Value(ExchangeHandle))
  exchanges: ExchangeHandle[];

  /**
   * Products that are sold in this contract.
   */
  @Checkable.List(Checkable.AnyObject)
  products: any[];

  /**
   * Deadline for refunds.
   */
  @Checkable.String
  refund_deadline: string;

  /**
   * Time when the contract was generated by the merchant.
   */
  @Checkable.String
  timestamp: string;

  /**
   * Order id to uniquely identify the purchase within
   * one merchant instance.
   */
  @Checkable.String
  order_id: string;

  /**
   * URL to post the payment to.
   */
  @Checkable.String
  pay_url: string;

  /**
   * Fulfillment URL to view the product or
   * delivery status.
   */
  @Checkable.String
  fulfillment_url: string;

  /**
   * Share of the wire fee that must be settled with one payment.
   */
  @Checkable.Optional(Checkable.Number)
  wire_fee_amortization?: number;

  /**
   * Maximum wire fee that the merchant agrees to pay for.
   */
  @Checkable.Optional(Checkable.Value(AmountJson))
  max_wire_fee?: AmountJson;

  /**
   * Extra data, interpreted by the mechant only.
   */
  @Checkable.Any
  extra: any;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => ContractTerms;
}


/**
 * Proposal record, stored in the wallet's database.
 */
@Checkable.Class()
export class ProposalRecord {
  /**
   * The contract that was offered by the merchant.
   */
  @Checkable.Value(ContractTerms)
  contractTerms: ContractTerms;

  /**
   * Signature by the merchant over the contract details.
   */
  @Checkable.String
  merchantSig: string;

  /**
   * Hash of the contract terms.
   */
  @Checkable.String
  contractTermsHash: string;

  /**
   * Serial ID when the offer is stored in the wallet DB.
   */
  @Checkable.Optional(Checkable.Number)
  id?: number;

  /**
   * Timestamp (in ms) of when the record
   * was created.
   */
  @Checkable.Number
  timestamp: number;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => ProposalRecord;
}


/**
 * Wire fee for one wire method as stored in the
 * wallet's database.
 */
export interface WireFee {
  /**
   * Fee for wire transfers.
   */
  wireFee: AmountJson;

  /**
   * Fees to close and refund a reserve.
   */
  closingFee: AmountJson;

  /**
   * Start date of the fee.
   */
  startStamp: number;

  /**
   * End date of the fee.
   */
  endStamp: number;

  /**
   * Signature made by the exchange master key.
   */
  sig: string;
}


/**
 * Wire fees for an exchange.
 */
export interface ExchangeWireFeesRecord {
  /**
   * Base URL of the exchange.
   */
  exchangeBaseUrl: string;

  /**
   * Mapping from wire method type to the wire fee.
   */
  feesForType: { [wireMethod: string]: WireFee[] };
}


/**
 * Coins used for a payment, with signatures authorizing the payment and the
 * coins with remaining value updated to accomodate for a payment.
 */
export type PayCoinInfo = Array<{ updatedCoin: CoinRecord, sig: CoinPaySig }>;


/**
 * Amount helpers.
 */
export namespace Amounts {
  /**
   * Number of fractional units that one value unit represents.
   */
  export const fractionalBase = 1e8;

  /**
   * Result of a possibly overflowing operation.
   */
  export interface Result {
    /**
     * Resulting, possibly saturated amount.
     */
    amount: AmountJson;
    /**
     * Was there an over-/underflow?
     */
    saturated: boolean;
  }

  /**
   * Get the largest amount that is safely representable.
   */
  export function getMaxAmount(currency: string): AmountJson {
    return {
      currency,
      fraction: 2 ** 32,
      value: Number.MAX_SAFE_INTEGER,
    };
  }

  /**
   * Get an amount that represents zero units of a currency.
   */
  export function getZero(currency: string): AmountJson {
    return {
      currency,
      fraction: 0,
      value: 0,
    };
  }

  /**
   * Add two amounts.  Return the result and whether
   * the addition overflowed.  The overflow is always handled
   * by saturating and never by wrapping.
   *
   * Throws when currencies don't match.
   */
  export function add(first: AmountJson, ...rest: AmountJson[]): Result {
    const currency = first.currency;
    let value = first.value + Math.floor(first.fraction / fractionalBase);
    if (value > Number.MAX_SAFE_INTEGER) {
      return { amount: getMaxAmount(currency), saturated: true };
    }
    let fraction = first.fraction % fractionalBase;
    for (const x of rest) {
      if (x.currency !== currency) {
        throw Error(`Mismatched currency: ${x.currency} and ${currency}`);
      }

      value = value + x.value + Math.floor((fraction + x.fraction) / fractionalBase);
      fraction = Math.floor((fraction + x.fraction) % fractionalBase);
      if (value > Number.MAX_SAFE_INTEGER) {
        return { amount: getMaxAmount(currency), saturated: true };
      }
    }
    return { amount: { currency, value, fraction }, saturated: false };
  }

  /**
   * Subtract two amounts.  Return the result and whether
   * the subtraction overflowed.  The overflow is always handled
   * by saturating and never by wrapping.
   *
   * Throws when currencies don't match.
   */
  export function sub(a: AmountJson, ...rest: AmountJson[]): Result {
    const currency = a.currency;
    let value = a.value;
    let fraction = a.fraction;

    for (const b of rest) {
      if (b.currency !== currency) {
        throw Error(`Mismatched currency: ${b.currency} and ${currency}`);
      }
      if (fraction < b.fraction) {
        if (value < 1) {
          return { amount: { currency, value: 0, fraction: 0 }, saturated: true };
        }
        value--;
        fraction += fractionalBase;
      }
      console.assert(fraction >= b.fraction);
      fraction -= b.fraction;
      if (value < b.value) {
        return { amount: { currency, value: 0, fraction: 0 }, saturated: true };
      }
      value -= b.value;
    }

    return { amount: { currency, value, fraction }, saturated: false };
  }

  /**
   * Compare two amounts.  Returns 0 when equal, -1 when a < b
   * and +1 when a > b.  Throws when currencies don't match.
   */
  export function cmp(a: AmountJson, b: AmountJson): number {
    if (a.currency !== b.currency) {
      throw Error(`Mismatched currency: ${a.currency} and ${b.currency}`);
    }
    const av = a.value + Math.floor(a.fraction / fractionalBase);
    const af = a.fraction % fractionalBase;
    const bv = b.value + Math.floor(b.fraction / fractionalBase);
    const bf = b.fraction % fractionalBase;
    switch (true) {
      case av < bv:
        return -1;
      case av > bv:
        return 1;
      case af < bf:
        return -1;
      case af > bf:
        return 1;
      case af === bf:
        return 0;
      default:
        throw Error("assertion failed");
    }
  }

  /**
   * Create a copy of an amount.
   */
  export function copy(a: AmountJson): AmountJson {
    return {
      currency: a.currency,
      fraction: a.fraction,
      value: a.value,
    };
  }

  /**
   * Divide an amount.  Throws on division by zero.
   */
  export function divide(a: AmountJson, n: number): AmountJson {
    if (n === 0) {
      throw Error(`Division by 0`);
    }
    if (n === 1) {
      return {value: a.value, fraction: a.fraction, currency: a.currency};
    }
    const r = a.value % n;
    return {
      currency: a.currency,
      fraction: Math.floor(((r * fractionalBase) + a.fraction) / n),
      value: Math.floor(a.value / n),
    };
  }

  /**
   * Check if an amount is non-zero.
   */
  export function isNonZero(a: AmountJson): boolean {
    return a.value > 0 || a.fraction > 0;
  }

  /**
   * Parse an amount like 'EUR:20.5' for 20 Euros and 50 ct.
   */
  export function parse(s: string): AmountJson|undefined {
    const res = s.match(/([a-zA-Z0-9_*-]+):([0-9])+([.][0-9]+)?/);
    if (!res) {
      return undefined;
    }
    return {
      currency: res[1],
      fraction: Math.round(fractionalBase * Number.parseFloat(res[3] || "0")),
      value: Number.parseInt(res[2]),
    };
  }

  /**
   * Convert the amount to a float.
   */
  export function toFloat(a: AmountJson): number {
    return a.value + (a.fraction / fractionalBase);
  }

  /**
   * Convert a float to a Taler amount.
   * Loss of precision possible.
   */
  export function fromFloat(floatVal: number, currency: string) {
    return {
      currency,
      fraction: Math.floor((floatVal - Math.floor(floatVal)) * fractionalBase),
      value: Math.floor(floatVal),
    };
  }
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
 * Possible results for confirmPay.
 */
export type ConfirmPayResult = "paid" | "insufficient-balance";


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
 * Payment body sent to the merchant's /pay.
 */
export interface PayReq {
  /**
   * Coins with signature.
   */
  coins: CoinPaySig[];

  /**
   * The merchant public key, used to uniquely
   * identify the merchant instance.
   */
  merchant_pub: string;

  /**
   * Order ID that's being payed for.
   */
  order_id: string;

  /**
   * Exchange that the coins are from (base URL).
   */
  exchange: string;
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
   * Sender wire types stored in the wallet.
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
  @Checkable.Value(AmountJson)
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
  @Checkable.Value(AmountJson)
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
 * Refund permission in the format that the merchant gives it to us.
 */
export interface RefundPermission {
  /**
   * Amount to be refunded.
   */
  refund_amount: AmountJson;

  /**
   * Fee for the refund.
   */
  refund_fee: AmountJson;

  /**
   * Contract terms hash to identify the contract that this
   * refund is for.
   */
  h_contract_terms: string;

  /**
   * Public key of the coin being refunded.
   */
  coin_pub: string;

  /**
   * Refund transaction ID between merchant and exchange.
   */
  rtransaction_id: number;

  /**
   * Public key of the merchant.
   */
  merchant_pub: string;

  /**
   * Signature made by the merchant over the refund permission.
   */
  merchant_sig: string;
}


/**
 * Record that stores status information about one purchase, starting from when
 * the customer accepts a proposal.  Includes refund status if applicable.
 */
export interface PurchaseRecord {
  contractTermsHash: string;
  contractTerms: ContractTerms;
  payReq: PayReq;
  merchantSig: string;

  /**
   * The purchase isn't active anymore, it's either successfully paid or
   * refunded/aborted.
   */
  finished: boolean;

  refundsPending: { [refundSig: string]: RefundPermission };
  refundsDone: { [refundSig: string]: RefundPermission };

  /**
   * When was the purchase made?
   * Refers to the time that the user accepted.
   */
  timestamp: number;

  /**
   * When was the last refund made?
   * Set to 0 if no refund was made on the purchase.
   */
  timestamp_refund: number;
}


/**
 * Result of selecting coins, contains the exchange, and selected
 * coins with their denomination.
 */
export interface CoinSelectionResult {
  exchangeUrl: string;
  cds: CoinWithDenom[];
  totalFees: AmountJson;
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
 * Planchet detail sent to the merchant.
 */
export interface TipPlanchetDetail {
  /**
   * Hashed denomination public key.
   */
  denom_pub_hash: string;

  /**
   * Coin's blinded public key.
   */
  coin_ev: string;
}


export interface TipPickupRequest {
  /**
   * Identifier of the tip.
   */
  tip_id: string;

  /**
   * List of planchets the wallet wants to use for the tip.
   */
  planchets: TipPlanchetDetail[];
}

@Checkable.Class()
export class ReserveSigSingleton {
  @Checkable.String
  reserve_sig: string;

  static checked: (obj: any) => ReserveSigSingleton;
}

/**
 * Response of the merchant
 * to the TipPickupRequest.
 */
@Checkable.Class()
export class TipResponse {
  /**
   * Public key of the reserve
   */
  @Checkable.String
  reserve_pub: string;

  /**
   * The order of the signatures matches the planchets list.
   */
  @Checkable.List(Checkable.Value(ReserveSigSingleton))
  reserve_sigs: ReserveSigSingleton[];

  static checked: (obj: any) => TipResponse;
}


/**
 * Tipping planchet stored in the database.
 */
export interface TipPlanchet {
  blindingKey: string;
  coinEv: string;
  coinPriv: string;
  coinPub: string;
  coinValue: AmountJson;
  denomPubHash: string;
  denomPub: string;
}

/**
 * Status of a tip we got from a merchant.
 */
export interface TipRecord {
  /**
   * Has the user accepted the tip?  Only after the tip has been accepted coins
   * withdrawn from the tip may be used.
   */
  accepted: boolean;

  /**
   * The tipped amount.
   */
  amount: AmountJson;

  /**
   * Coin public keys from the planchets.
   * This field is redundant and used for indexing the record via
   * a multi-entry index to look up tip records by coin public key.
   */
  coinPubs: string[];

  /**
   * Timestamp, the tip can't be picked up anymore after this deadline.
   */
  deadline: number;

  /**
   * The exchange that will sign our coins, chosen by the merchant.
   */
  exchangeUrl: string;

  /**
   * Domain of the merchant, necessary to uniquely identify the tip since
   * merchants can freely choose the ID and a malicious merchant might cause a
   * collision.
   */
  merchantDomain: string;

  /**
   * Planchets, the members included in TipPlanchetDetail will be sent to the
   * merchant.
   */
  planchets: TipPlanchet[];

  /**
   * Response if the merchant responded,
   * undefined otherwise.
   */
  response?: TipResponse[];

  /**
   * Identifier for the tip, chosen by the merchant.
   */
  tipId: string;
}


export interface TipStatus {
  tip: TipRecord;
  rci?: ReserveCreationInfo;
}


@Checkable.Class()
export class TipStatusRequest {
  @Checkable.String
  tipId: string;

  @Checkable.String
  merchantDomain: string;

  static checked: (obj: any) => TipStatusRequest;
}


@Checkable.Class()
export class AcceptTipRequest {
  @Checkable.String
  tipId: string;

  @Checkable.String
  merchantDomain: string;

  static checked: (obj: any) => AcceptTipRequest;
}


@Checkable.Class()
export class ProcessTipResponseRequest {
  @Checkable.String
  tipId: string;

  @Checkable.String
  merchantDomain: string;

  @Checkable.Value(TipResponse)
  tipResponse: TipResponse;

  static checked: (obj: any) => ProcessTipResponseRequest;
}

@Checkable.Class()
export class GetTipPlanchetsRequest {
  @Checkable.String
  tipId: string;

  @Checkable.String
  merchantDomain: string;

  @Checkable.Optional(Checkable.Value(AmountJson))
  amount: AmountJson;

  @Checkable.Number
  deadline: number;

  @Checkable.String
  exchangeUrl: string;

  static checked: (obj: any) => GetTipPlanchetsRequest;
}

@Checkable.Class()
export class TipToken {
  @Checkable.String
  expiration: string;

  @Checkable.String
  exchange_url: string;

  @Checkable.String
  pickup_url: string;

  @Checkable.String
  tip_id: string;

  @Checkable.Value(AmountJson)
  amount: AmountJson;

  static checked: (obj: any) => TipToken;
}
