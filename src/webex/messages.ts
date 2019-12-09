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

import { AmountJson } from "../util/amounts";
import * as dbTypes from "../dbTypes";
import * as talerTypes from "../talerTypes";
import * as walletTypes from "../walletTypes";

import { UpgradeResponse } from "./wxApi";

/**
 * Message type information.
 */
export interface MessageMap {
  balances: {
    request: {};
    response: walletTypes.WalletBalance;
  };
  "dump-db": {
    request: {};
    response: any;
  };
  "import-db": {
    request: {
      dump: object;
    };
    response: void;
  };
  ping: {
    request: {};
    response: void;
  };
  "reset-db": {
    request: {};
    response: void;
  };
  "create-reserve": {
    request: {
      amount: AmountJson;
      exchange: string;
    };
    response: void;
  };
  "confirm-reserve": {
    request: { reservePub: string };
    response: void;
  };
  "confirm-pay": {
    request: { proposalId: string; sessionId?: string };
    response: walletTypes.ConfirmPayResult;
  };
  "exchange-info": {
    request: { baseUrl: string };
    response: dbTypes.ExchangeRecord;
  };
  "reserve-creation-info": {
    request: { baseUrl: string; amount: AmountJson };
    response: walletTypes.ExchangeWithdrawDetails;
  };
  "get-history": {
    request: {};
    response: walletTypes.HistoryEvent[];
  };
  "get-coins": {
    request: { exchangeBaseUrl: string };
    response: any;
  };
  "refresh-coin": {
    request: { coinPub: string };
    response: any;
  };
  "get-currencies": {
    request: {};
    response: dbTypes.CurrencyRecord[];
  };
  "update-currency": {
    request: { currencyRecord: dbTypes.CurrencyRecord };
    response: void;
  };
  "get-exchanges": {
    request: {};
    response: dbTypes.ExchangeRecord[];
  };
  "get-reserves": {
    request: { exchangeBaseUrl: string };
    response: dbTypes.ReserveRecord[];
  };
  "get-payback-reserves": {
    request: {};
    response: dbTypes.ReserveRecord[];
  };
  "withdraw-payback-reserve": {
    request: { reservePub: string };
    response: dbTypes.ReserveRecord[];
  };
  "get-denoms": {
    request: { exchangeBaseUrl: string };
    response: dbTypes.DenominationRecord[];
  };
  "payback-coin": {
    request: { coinPub: string };
    response: void;
  };
  "check-upgrade": {
    request: {};
    response: UpgradeResponse;
  };
  "get-sender-wire-infos": {
    request: {};
    response: walletTypes.SenderWireInfos;
  };
  "return-coins": {
    request: {};
    response: void;
  };
  "get-purchase-details": {
    request: { contractTermsHash: string };
    response: walletTypes.PurchaseDetails;
  };
  "accept-tip": {
    request: { talerTipUri: string };
    response: void;
  };
  "get-tip-status": {
    request: { talerTipUri: string };
    response: walletTypes.TipStatus;
  };
  "accept-refund": {
    request: { refundUrl: string };
    response: string;
  };
  "abort-failed-payment": {
    request: { contractTermsHash: string };
    response: void;
  };
  "benchmark-crypto": {
    request: { repetitions: number };
    response: walletTypes.BenchmarkResult;
  };
  "get-withdraw-details": {
    request: { talerWithdrawUri: string; maybeSelectedExchange: string | undefined };
    response: walletTypes.WithdrawDetails;
  };
  "accept-withdrawal": {
    request: { talerWithdrawUri: string; selectedExchange: string };
    response: walletTypes.AcceptWithdrawalResponse;
  };
  "prepare-pay": {
    request: { talerPayUri: string };
    response: walletTypes.PreparePayResult;
  };
  "get-diagnostics": {
    request: { };
    response: walletTypes.WalletDiagnostics;
  };
}


/**
 * String literal types for messages.
 */
export type MessageType = keyof MessageMap;

/**
 * Make a request whose details match the request type.
 */
export function makeRequest<T extends MessageType>(
  type: T,
  details: MessageMap[T]["request"],
) {
  return { type, details };
}

/**
 * Make a response that matches the request type.
 */
export function makeResponse<T extends MessageType>(
  type: T,
  response: MessageMap[T]["response"],
) {
  return response;
}
