/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
 */

import {EddsaPublicKey} from "./emscriptif";
import {Checkable} from "./checkable";
"use strict";

// TODO: factor into multiple files

export interface Mint {
  baseUrl: string;
  keys: Keys
}

export interface CoinWithDenom {
  coin: Coin;
  denom: Denomination;
}

export interface Keys {
  denoms: Denomination[];
}

export interface Denomination {
  value: AmountJson;
  denom_pub: string;
  fee_withdraw: AmountJson;
  fee_deposit: AmountJson;
}

export interface PreCoin {
  coinPub: string;
  coinPriv: string;
  reservePub: string;
  denomPub: string;
  blindingKey: string;
  withdrawSig: string;
  coinEv: string;
  mintBaseUrl: string;
  coinValue: AmountJson;
}

export interface Coin {
  coinPub: string;
  coinPriv: string;
  denomPub: string;
  denomSig: string;
  currentAmount: AmountJson;
  mintBaseUrl: string;
}


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


@Checkable.Class
export class CreateReserveRequest {
  /**
   * The initial amount for the reserve.
   */
  @Checkable.Value(AmountJson)
  amount: AmountJson;

  /**
   * Mint URL where the bank should create the reserve.
   */
  @Checkable.String
  mint: string;

  static checked: (obj: any) => CreateReserveRequest;
}


@Checkable.Class
export class CreateReserveResponse {
  /**
   * Mint URL where the bank should create the reserve.
   * The URL is canonicalized in the response.
   */
  @Checkable.String
  mint: string;

  @Checkable.String
  reservePub: string;

  static checked: (obj: any) => CreateReserveResponse;
}


@Checkable.Class
export class ConfirmReserveRequest {
  /**
   * Public key of then reserve that should be marked
   * as confirmed.
   */
  @Checkable.String
  reservePub: string;

  static checked: (obj: any) => ConfirmReserveRequest;
}


@Checkable.Class
export class MintInfo {
  @Checkable.String
  master_pub: string;

  @Checkable.String
  url: string;

  static checked: (obj: any) => MintInfo;
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

  @Checkable.List(Checkable.Value(MintInfo))
  mints: MintInfo[];

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

  static checked: (obj: any) => Contract;
}


@Checkable.Class
export class  Offer {
  @Checkable.Value(Contract)
  contract: Contract;

  @Checkable.String
  merchant_sig: string;

  @Checkable.String
  H_contract: string;

  static checked: (obj: any) => Offer;
}