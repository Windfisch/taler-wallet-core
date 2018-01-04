/*
 This file is part of TALER
 (C) 2018 GNUnet e.V. and INRIA

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
 * Types for records stored in the wallet's database.
 *
 * Types for the objects in the database should end in "-Record".
 */

/**
 * Imports.
 */
import { AmountJson } from "./amounts";
import { Checkable } from "./checkable";
import {
  Auditor,
  CoinPaySig,
  ContractTerms,
  Denomination,
  PayReq,
  RefundPermission,
  TipResponse,
  WireDetail,
} from "./talerTypes";


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
   * When did we actually use this exchange last (in milliseconds).  If we
   * never used the exchange for anything but just updated its info, this is
   * set to 0.  (Currently only updated when reserves are created.)
   */
  lastUsedTime: number;

  /**
   * Last observed protocol version.
   */
  protocolVersion?: string;
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

  /**
   * URL to go to once the tip has been accepted.
   */
  nextUrl: string;

  timestamp: number;
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
   * Hased denominations of the newly requested coins.
   */
  newDenomHashes: string[];

  /**
   * Denominations of the newly requested coins.
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
 * Information about wire information for bank accounts we withdrew coins from.
 */
export interface SenderWireRecord {
  /**
   * Wire details.
   */
  senderWire: WireDetail;

  /**
   * Identifier, hash code of canonicalized senderWire.
   */
  id: number;
}
