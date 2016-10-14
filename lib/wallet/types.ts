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
   * Amount we've already withdrawn from the reserve.
   */
  withdrawn_amount: AmountJson;
  confirmed: boolean,
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


export interface IExchangeInfo {
  baseUrl: string;
  masterPublicKey: string;

  /**
   * All denominations we ever received from the exchange.
   * Expired denominations may be garbage collected.
   */
  all_denoms: Denomination[];

  /**
   * Denominations we received with the last update.
   * Subset of "denoms".
   */
  active_denoms: Denomination[];

  /**
   * Timestamp for last update.
   */
  last_update_time: number;
}

export interface WireInfo {
  [type: string]: any;
}

export interface ReserveCreationInfo {
  exchangeInfo: IExchangeInfo;
  wireInfo: WireInfo;
  selectedDenoms: Denomination[];
  withdrawFee: AmountJson;
  overhead: AmountJson;
}


/**
 * A coin that isn't yet signed by an exchange.
 */
export interface PreCoin {
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

export interface RefreshPreCoin {
  publicKey: string;
  privateKey: string;
  coinEv: string;
  blindingKey: string
}


/**
 * Ongoing refresh
 */
export interface RefreshSession {
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
   * Signature to confirm the melting.
   */
  confirmSig: string;

  /**
   * Denominations of the newly requested coins
   */
  newDenoms: string[];


  preCoinsForGammas: RefreshPreCoin[][];


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
}


export interface CoinPaySig {
  coin_sig: string;
  coin_pub: string;
  ub_sig: string;
  denom_pub: string;
  f: AmountJson;
}

/**
 * Coin as stored in the "coins" data store
 * of the wallet database.
 */
export interface Coin {
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
}


@Checkable.Class
export class ExchangeHandle {
  @Checkable.String
  master_pub: string;

  @Checkable.String
  url: string;

  static checked: (obj: any) => ExchangeHandle;
}


@Checkable.Class
export class Contract {
  @Checkable.String
  H_wire: string;

  @Checkable.Value(AmountJson)
  amount: AmountJson;

  @Checkable.List(Checkable.AnyObject)
  auditors: any[];

  @Checkable.String
  expiry: string;

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

  @Checkable.Number
  transaction_id: number;

  @Checkable.String
  fulfillment_url: string;

  @Checkable.Optional(Checkable.String)
  repurchase_correlation_id: string;

  @Checkable.Optional(Checkable.String)
  receiver: string;

  static checked: (obj: any) => Contract;
}


export type PayCoinInfo = Array<{ updatedCoin: Coin, sig: CoinPaySig }>;


export namespace Amounts {
  export interface Result {
    amount: AmountJson;
    // Was there an over-/underflow?
    saturated: boolean;
  }

  function getMaxAmount(currency: string): AmountJson {
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
    let value = first.value + Math.floor(first.fraction / 1e6);
    if (value > Number.MAX_SAFE_INTEGER) {
      return { amount: getMaxAmount(currency), saturated: true };
    }
    let fraction = first.fraction % 1e6;
    for (let x of rest) {
      if (x.currency !== currency) {
        throw Error(`Mismatched currency: ${x.currency} and ${currency}`);
      }

      value = value + x.value + Math.floor((fraction + x.fraction) / 1e6);
      fraction = (fraction + x.fraction) % 1e6;
      if (value > Number.MAX_SAFE_INTEGER) {
        return { amount: getMaxAmount(currency), saturated: true };
      }
    }
    return { amount: { currency, value, fraction }, saturated: false };
  }


  export function sub(a: AmountJson, b: AmountJson): Result {
    if (a.currency !== b.currency) {
      throw Error(`Mismatched currency: ${a.currency} and ${b.currency}`);
    }
    let currency = a.currency;
    let value = a.value;
    let fraction = a.fraction;
    if (fraction < b.fraction) {
      if (value < 1) {
        return { amount: { currency, value: 0, fraction: 0 }, saturated: true };
      }
      value--;
      fraction += 1e6;
    }
    console.assert(fraction >= b.fraction);
    fraction -= b.fraction;
    if (value < b.value) {
      return { amount: { currency, value: 0, fraction: 0 }, saturated: true };
    }
    value -= b.value;
    return { amount: { currency, value, fraction }, saturated: false };
  }

  export function cmp(a: AmountJson, b: AmountJson): number {
    if (a.currency !== b.currency) {
      throw Error(`Mismatched currency: ${a.currency} and ${b.currency}`);
    }
    let av = a.value + Math.floor(a.fraction / 1e6);
    let af = a.fraction % 1e6;
    let bv = b.value + Math.floor(b.fraction / 1e6);
    let bf = b.fraction % 1e6;
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

  export function isNonZero(a: AmountJson) {
    return a.value > 0 || a.fraction > 0;
  }
}


export interface CheckRepurchaseResult {
  isRepurchase: boolean;
  existingContractHash?: string;
  existingFulfillmentUrl?: string;
}


export interface Notifier {
  notify(): void;
}
