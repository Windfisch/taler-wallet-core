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
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Interface to the wallet through WebExtension messaging.
 */


/**
 * Imports.
 */
import {
  AmountJson,
  CheckPayResult,
  CoinRecord,
  ConfirmPayResult,
  CurrencyRecord,
  DenominationRecord,
  ExchangeRecord,
  PreCoinRecord,
  ReserveCreationInfo,
  ReserveRecord,
  QueryPaymentResult,
} from "../types";

import { MessageType, MessageMap } from "./messages";


/**
 * Response with information about available version upgrades.
 */
export interface UpgradeResponse {
  /**
   * Is a reset required because of a new DB version
   * that can't be atomatically upgraded?
   */
  dbResetRequired: boolean;

  /**
   * Current database version.
   */
  currentDbVersion: string;

  /**
   * Old db version (if applicable).
   */
  oldDbVersion: string;
}


async function callBackend<T extends MessageType>(type: T, detail: MessageMap[T]["request"]): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    chrome.runtime.sendMessage({ type, detail }, (resp) => {
      if (resp && resp.error) {
        reject(resp);
      } else {
        resolve(resp);
      }
    });
  });
}


/**
 * Query the wallet for the coins that would be used to withdraw
 * from a given reserve.
 */
export function getReserveCreationInfo(baseUrl: string,
                                       amount: AmountJson): Promise<ReserveCreationInfo> {
  return callBackend("reserve-creation-info", { baseUrl, amount });
}


/**
 * Get all exchanges the wallet knows about.
 */
export function getExchanges(): Promise<ExchangeRecord[]> {
  return callBackend("get-exchanges", { });
}


/**
 * Get all currencies the exchange knows about.
 */
export function getCurrencies(): Promise<CurrencyRecord[]> {
  return callBackend("get-currencies", { });
}


/**
 * Get information about a specific currency.
 */
export function getCurrency(name: string): Promise<CurrencyRecord|null> {
  return callBackend("currency-info", {name});
}


/**
 * Get information about a specific exchange.
 */
export function getExchangeInfo(baseUrl: string): Promise<ExchangeRecord> {
  return callBackend("exchange-info", {baseUrl});
}


/**
 * Replace an existing currency record with the one given.  The currency to
 * replace is specified inside the currency record.
 */
export function updateCurrency(currencyRecord: CurrencyRecord): Promise<void> {
  return callBackend("update-currency", { currencyRecord });
}


/**
 * Get all reserves the wallet has at an exchange.
 */
export function getReserves(exchangeBaseUrl: string): Promise<ReserveRecord[]> {
  return callBackend("get-reserves", { exchangeBaseUrl });
}


/**
 * Get all reserves for which a payback is available.
 */
export function getPaybackReserves(): Promise<ReserveRecord[]> {
  return callBackend("get-payback-reserves", { });
}


/**
 * Withdraw the payback that is available for a reserve.
 */
export function withdrawPaybackReserve(reservePub: string): Promise<ReserveRecord[]> {
  return callBackend("withdraw-payback-reserve", { reservePub });
}


/**
 * Get all coins withdrawn from the given exchange.
 */
export function getCoins(exchangeBaseUrl: string): Promise<CoinRecord[]> {
  return callBackend("get-coins", { exchangeBaseUrl });
}


/**
 * Get all precoins withdrawn from the given exchange.
 */
export function getPreCoins(exchangeBaseUrl: string): Promise<PreCoinRecord[]> {
  return callBackend("get-precoins", { exchangeBaseUrl });
}


/**
 * Get all denoms offered by the given exchange.
 */
export function getDenoms(exchangeBaseUrl: string): Promise<DenominationRecord[]> {
  return callBackend("get-denoms", { exchangeBaseUrl });
}


/**
 * Start refreshing a coin.
 */
export function refresh(coinPub: string): Promise<void> {
  return callBackend("refresh-coin", { coinPub });
}


/**
 * Request payback for a coin.  Only works for non-refreshed coins.
 */
export function payback(coinPub: string): Promise<void> {
  return callBackend("payback-coin", { coinPub });
}

/**
 * Get a proposal stored in the wallet by its proposal id.
 */
export function getProposal(proposalId: number) {
  return callBackend("get-proposal", { proposalId });
}

/**
 * Check if payment is possible or already done.
 */
export function checkPay(proposalId: number): Promise<CheckPayResult> {
  return callBackend("check-pay", { proposalId });
}

/**
 * Pay for a proposal.
 */
export function confirmPay(proposalId: number): Promise<ConfirmPayResult> {
  return callBackend("confirm-pay", { proposalId });
}

/**
 * Hash a contract.  Throws if its not a valid contract.
 */
export function hashContract(contract: object): Promise<string> {
  return callBackend("hash-contract", { contract });
}


/**
 * Save a proposal in the wallet.  Returns the proposal id that
 * the proposal is stored under.
 */
export function saveProposal(proposal: any): Promise<number> {
  return callBackend("save-proposal", proposal);
}

/**
 * Mark a reserve as confirmed.
 */
export function confirmReserve(reservePub: string): Promise<void> {
  return callBackend("confirm-reserve", { reservePub });
}

/**
 * Query for a payment by fulfillment URL.
 */
export function queryPayment(url: string): Promise<QueryPaymentResult> {
  return callBackend("query-payment", { url });
}

/**
 * Add a new history item.
 */
export function putHistory(historyEntry: any): Promise<void> {
  return callBackend("put-history-entry", { historyEntry });
}

/**
 * Mark a payment as succeeded.
 */
export function paymentSucceeded(contractTermsHash: string, merchantSig: string): Promise<void> {
  return callBackend("payment-succeeded", { contractTermsHash, merchantSig });
}

/**
 * Mark a payment as succeeded.
 */
export function paymentFailed(contractTermsHash: string): Promise<void> {
  return callBackend("payment-failed", { contractTermsHash });
}

/**
 * Get the payment cookie for the current tab, or undefined if no payment
 * cookie was set.
 */
export function getTabCookie(contractTermsHash: string, merchantSig: string): Promise<any> {
  return callBackend("get-tab-cookie", { });
}

/**
 * Generate a contract nonce (EdDSA key pair), store it in the wallet's
 * database and return the public key.
 */
export function generateNonce(): Promise<string> {
  return callBackend("generate-nonce", { });
}

/**
 * Check upgrade information
 */
export function checkUpgrade(): Promise<UpgradeResponse> {
  return callBackend("check-upgrade", { });
}

/**
 * Reset database
 */
export function resetDb(): Promise<void> {
  return callBackend("reset-db", { });
}
