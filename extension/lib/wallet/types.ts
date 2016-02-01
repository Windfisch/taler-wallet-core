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


export interface AmountJson {
  value: number;
  fraction: number
  currency: string;
}


export interface ConfirmReserveRequest {
  /**
   * Name of the form field for the amount.
   */
  field_amount;

  /**
   * Name of the form field for the reserve public key.
   */
  field_reserve_pub;

  /**
   * Name of the form field for the reserve public key.
   */
  field_mint;

  /**
   * The actual amount in string form.
   * TODO: where is this format specified?
   */
  amount_str;

  /**
   * Target URL for the reserve creation request.
   */
  post_url;

  /**
   * Mint URL where the bank should create the reserve.
   */
  mint;
}


export interface ConfirmReserveResponse {
  backlink?: string;
  success: boolean;
}