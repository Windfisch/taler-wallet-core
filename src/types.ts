/*
 This file is part of TALER
 (C) 2015 GNUnet e.V.

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
 * Common types that are used by Taler.
 *
 * Note most types are defined in wallet.ts, types that
 * are defined in types.ts are intended to be used by components
 * that do not depend on the whole wallet implementation (which depends on
 * emscripten).
 *
 * @author Florian Dold
 */

import { Checkable } from "./checkable";

@Checkable.Class
export class AmountJson {
  @Checkable.Number
  value: number;

  @Checkable.Number
  fraction: number;

  @Checkable.String
  currency: string;

  static checked: (obj: any) => AmountJson;
}


export interface SignedAmountJson {
  amount: AmountJson;
  isNegative: boolean;
}


export interface ReserveRecord {
  reserve_pub: string;
  reserve_priv: string,
  exchange_base_url: string,
  created: number,
  last_query: number | null,
  /**
   * Current amount left in the reserve
   */
  current_amount: AmountJson | null,
  /**
   * Amount requested when the reserve was created.
   * When a reserve is re-used (rare!)  the current_amount can
   * be higher than the requested_amount
   */
  requested_amount: AmountJson,


  /**
   * What's the current amount that sits
   * in precoins?
   */
  precoin_amount: AmountJson;


  confirmed: boolean,
}

export interface AuditorRecord {
  baseUrl: string;
  auditorPub: string;
  expirationStamp: number;
}

export interface ExchangeForCurrencyRecord {
  /**
   * Priority for automatic selection when withdrawing.
   */
  priority: number;
  pinnedPub?: string;
  baseUrl: string;
}

export interface CurrencyRecord {
  name: string;
  fractionalDigits: number;
  auditors: AuditorRecord[];
  exchanges: ExchangeForCurrencyRecord[];
}


@Checkable.Class
export class CreateReserveResponse {
  /**
   * Exchange URL where the bank should create the reserve.
   * The URL is canonicalized in the response.
   */
  @Checkable.String
  exchange: string;

  @Checkable.String
  reservePub: string;

  static checked: (obj: any) => CreateReserveResponse;
}

export enum DenominationStatus {
  Unverified,
  VerifiedGood,
  VerifiedBad,
}

export class DenominationRecord {
  @Checkable.Value(AmountJson)
  value: AmountJson;

  @Checkable.String
  denomPub: string;

  @Checkable.Value(AmountJson)
  feeWithdraw: AmountJson;

  @Checkable.Value(AmountJson)
  feeDeposit: AmountJson;

  @Checkable.Value(AmountJson)
  feeRefresh: AmountJson;

  @Checkable.Value(AmountJson)
  feeRefund: AmountJson;

  @Checkable.String
  stampStart: string;

  @Checkable.String
  stampExpireWithdraw: string;

  @Checkable.String
  stampExpireLegal: string;

  @Checkable.String
  stampExpireDeposit: string;

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

  @Checkable.String
  exchangeBaseUrl: string;

  static checked: (obj: any) => Denomination;
}

/**
 * Denomination as found in the /keys response from the exchange.
 */
@Checkable.Class
export class Denomination {
  @Checkable.Value(AmountJson)
  value: AmountJson;

  @Checkable.String
  denom_pub: string;

  @Checkable.Value(AmountJson)
  fee_withdraw: AmountJson;

  @Checkable.Value(AmountJson)
  fee_deposit: AmountJson;

  @Checkable.Value(AmountJson)
  fee_refresh: AmountJson;

  @Checkable.Value(AmountJson)
  fee_refund: AmountJson;

  @Checkable.String
  stamp_start: string;

  @Checkable.String
  stamp_expire_withdraw: string;

  @Checkable.String
  stamp_expire_legal: string;

  @Checkable.String
  stamp_expire_deposit: string;

  @Checkable.String
  master_sig: string;

  static checked: (obj: any) => Denomination;
}


export interface Auditor {
  // official name
  name: string;

  // Auditor's public key
  auditor_pub: string;

  // Base URL of the auditor
  url: string;
}


export interface ExchangeRecord {
  baseUrl: string;
  masterPublicKey: string;
  auditors: Auditor[];
  currency: string;

  /**
   * Timestamp for last update.
   */
  lastUpdateTime: number;
}

export interface WireInfo {
  [type: string]: any;
}

export interface ReserveCreationInfo {
  exchangeInfo: ExchangeRecord;
  wireInfo: WireInfo;
  selectedDenoms: DenominationRecord[];
  withdrawFee: AmountJson;
  overhead: AmountJson;
  wireFees: ExchangeWireFeesRecord;
  isAudited: boolean;
  isTrusted: boolean;
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
}

export interface RefreshPreCoinRecord {
  publicKey: string;
  privateKey: string;
  coinEv: string;
  blindingKey: string
}

export function denominationRecordFromKeys(exchangeBaseUrl: string, denomIn: Denomination): DenominationRecord {
  let d: DenominationRecord = {
    denomPub: denomIn.denom_pub,
    exchangeBaseUrl: exchangeBaseUrl,
    feeDeposit: denomIn.fee_deposit,
    masterSig: denomIn.master_sig,
    feeRefund: denomIn.fee_refund,
    feeRefresh: denomIn.fee_refresh,
    feeWithdraw: denomIn.fee_withdraw,
    stampExpireDeposit: denomIn.stamp_expire_deposit,
    stampExpireLegal: denomIn.stamp_expire_legal,
    stampExpireWithdraw: denomIn.stamp_expire_withdraw,
    stampStart: denomIn.stamp_start,
    status: DenominationStatus.Unverified,
    isOffered: true,
    value: denomIn.value,
  };
  return d;
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
  valueWithFee: AmountJson

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


  preCoinsForGammas: RefreshPreCoinRecord[][];


  /**
   * The transfer keys, kappa of them.
   */
  transferPubs: string[];

  transferPrivs: string[];

  /**
   * The no-reveal-index after we've done the melting.
   */
  norevealIndex?: number;

  /**
   * Hash of the session.
   */
  hash: string;

  exchangeBaseUrl: string;

  finished: boolean;
}


export interface CoinPaySig {
  coin_sig: string;
  coin_pub: string;
  ub_sig: string;
  denom_pub: string;
  f: AmountJson;
}


export enum CoinStatus {
  Fresh, TransactionPending, Dirty, Refreshed,
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
   * Status of the coin.
   */
  status: CoinStatus;
}


@Checkable.Class
export class ExchangeHandle {
  @Checkable.String
  master_pub: string;

  @Checkable.String
  url: string;

  static checked: (obj: any) => ExchangeHandle;
}

export interface WalletBalance {
  [currency: string]: WalletBalanceEntry;
}

export interface WalletBalanceEntry {
  available: AmountJson;
  pendingIncoming: AmountJson;
  pendingPayment: AmountJson;
}


interface Merchant {
  /**
   * label for a location with the business address of the merchant
   */
  address: string;

  /**
   * the merchant's legal name of business
   */
  name: string;

  /**
   * label for a location that denotes the jurisdiction for disputes.
   * Some of the typical fields for a location (such as a street address) may be absent.
   */
  jurisdiction: string;

  /**
   * Instance of the merchant, in case one merchant
   * represents multiple receivers.
   */
  instance?: string;
}

@Checkable.ClassWithValidator
export class Contract {

  validate() {
    if (this.exchanges.length == 0) {
      throw Error("no exchanges in contract");
    }
  }

  @Checkable.String
  H_wire: string;

  @Checkable.String
  wire_method: string;

  @Checkable.Optional(Checkable.String)
  summary?: string;

  @Checkable.Optional(Checkable.String)
  nonce?: string;

  @Checkable.Value(AmountJson)
  amount: AmountJson;

  @Checkable.List(Checkable.AnyObject)
  auditors: any[];

  @Checkable.Optional(Checkable.String)
  pay_deadline: string;

  @Checkable.Any
  locations: any;

  @Checkable.Value(AmountJson)
  max_fee: AmountJson;

  @Checkable.Any
  merchant: any;

  @Checkable.String
  merchant_pub: string;

  @Checkable.List(Checkable.Value(ExchangeHandle))
  exchanges: ExchangeHandle[];

  @Checkable.List(Checkable.AnyObject)
  products: any[];

  @Checkable.String
  refund_deadline: string;

  @Checkable.String
  timestamp: string;

  @Checkable.String
  order_id: string;

  @Checkable.String
  pay_url: string;

  @Checkable.String
  fulfillment_url: string;

  @Checkable.Number
  wire_fee_amortization?: number;

  @Checkable.Value(AmountJson)
  max_wire_fee?: AmountJson;

  @Checkable.Any
  extra: any;

  static checked: (obj: any) => Contract;
}


export interface WireFee {
  wireFee: AmountJson;
  closingFee: AmountJson;
  startStamp: number;
  endStamp: number;
  sig: string;
}

export interface ExchangeWireFeesRecord {
  exchangeBaseUrl: string;
  feesForType: { [type: string]: WireFee[] };
}


export type PayCoinInfo = Array<{ updatedCoin: CoinRecord, sig: CoinPaySig }>;


export namespace Amounts {
  export const fractionalBase = 1e8;

  export interface Result {
    amount: AmountJson;
    // Was there an over-/underflow?
    saturated: boolean;
  }

  export function getMaxAmount(currency: string): AmountJson {
    return {
      currency,
      value: Number.MAX_SAFE_INTEGER,
      fraction: 2 ** 32,
    }
  }

  export function getZero(currency: string): AmountJson {
    return {
      currency,
      value: 0,
      fraction: 0,
    }
  }

  export function add(first: AmountJson, ...rest: AmountJson[]): Result {
    let currency = first.currency;
    let value = first.value + Math.floor(first.fraction / fractionalBase);
    if (value > Number.MAX_SAFE_INTEGER) {
      return { amount: getMaxAmount(currency), saturated: true };
    }
    let fraction = first.fraction % fractionalBase;
    for (let x of rest) {
      if (x.currency !== currency) {
        throw Error(`Mismatched currency: ${x.currency} and ${currency}`);
      }

      value = value + x.value + Math.floor((fraction + x.fraction) / fractionalBase);
      fraction = (fraction + x.fraction) % fractionalBase;
      if (value > Number.MAX_SAFE_INTEGER) {
        return { amount: getMaxAmount(currency), saturated: true };
      }
    }
    return { amount: { currency, value, fraction }, saturated: false };
  }


  export function sub(a: AmountJson, ...rest: AmountJson[]): Result {
    let currency = a.currency;
    let value = a.value;
    let fraction = a.fraction;

    for (let b of rest) {
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

  export function cmp(a: AmountJson, b: AmountJson): number {
    if (a.currency !== b.currency) {
      throw Error(`Mismatched currency: ${a.currency} and ${b.currency}`);
    }
    let av = a.value + Math.floor(a.fraction / fractionalBase);
    let af = a.fraction % fractionalBase;
    let bv = b.value + Math.floor(b.fraction / fractionalBase);
    let bf = b.fraction % fractionalBase;
    switch (true) {
      case av < bv:
        return -1;
      case av > bv:
        return 1;
      case af < bf:
        return -1;
      case af > bf:
        return 1;
      case af == bf:
        return 0;
      default:
        throw Error("assertion failed");
    }
  }

  export function copy(a: AmountJson): AmountJson {
    return {
      value: a.value,
      fraction: a.fraction,
      currency: a.currency,
    }
  }

  export function divide(a: AmountJson, n: number): AmountJson {
    if (n == 0) {
      throw Error(`Division by 0`);
    }
    if (n == 1) {
      return {value: a.value, fraction: a.fraction, currency: a.currency};
    }
    let r = a.value % n;
    return {
      currency: a.currency,
      value: Math.floor(a.value / n),
      fraction: Math.floor(((r * fractionalBase) + a.fraction) / n),
    }
  }

  export function isNonZero(a: AmountJson) {
    return a.value > 0 || a.fraction > 0;
  }
}


export interface Notifier {
  notify(): void;
}

/**
 * For terseness.
 */
export function mkAmount(value: number, fraction: number, currency: string): AmountJson {
  return {value, fraction, currency};
}
