/*
 This file is part of TALER
 (C) 2017 Inria and GNUnet e.V.

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
 * Type definitions for messages between content scripts/pages and backend.
 */

// Messages are already documented in wxApi.
/* tslint:disable:completed-docs */

import * as types from "../types";

export interface MessageMap {
  "balances": { };
  "dump-db": { };
  "import-db": { dump: object };
  "get-tab-cookie": { };
  "ping": { };
  "reset": { };
  "create-reserve": { amount: types.AmountJson; exchange: string }; 
  "confirm-reserve": { reservePub: string };
  "generate-nonce": { };
  "confirm-pay": { offer: types.OfferRecord; };
  "check-pay": { offer: types.OfferRecord; };
  "query-payment": { };
  "exchange-info": { baseUrl: string };
  "currency-info": { name: string };
  "hash-contract": { contract: object };
  "put-history-entry": { historyEntry: types.HistoryRecord };
  "safe-offer": { offer: types.OfferRecord };
  "reserve-creation-info": { baseUrl: string };
  "get-history": { };
  "get-offer": { offerId: number }
  "get-currencies": { };
  "update-currency": { currencyRecord: types.CurrencyRecord };
  "get-reserves": { exchangeBaseUrl: string };
  "get-payback-reserves": { };
  "withdraw-payback-reserve": { reservePub: string };
  "get-precoins": { exchangeBaseUrl: string };
  "get-denoms": { exchangeBaseUrl: string };
  "payback-coin": { coinPub: string };
  "payment-failed": { contractTermsHash: string };
  "payment-succeeded": { contractTermsHash: string; merchantSig: string };
}

export type MessageType = keyof MessageMap;

export class Message<T extends MessageType> {
  constructor (public type: T, public detail: MessageMap[T]) {
  }
}
