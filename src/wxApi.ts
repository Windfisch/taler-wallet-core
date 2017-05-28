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
  CoinRecord,
  CurrencyRecord,
  DenominationRecord,
  ExchangeRecord,
  PreCoinRecord,
  ReserveCreationInfo,
  ReserveRecord,
} from "./types";


/**
 * Query the wallet for the coins that would be used to withdraw
 * from a given reserve.
 */
export function getReserveCreationInfo(baseUrl: string,
                                       amount: AmountJson): Promise<ReserveCreationInfo> {
  const m = { type: "reserve-creation-info", detail: { baseUrl, amount } };
  return new Promise<ReserveCreationInfo>((resolve, reject) => {
    chrome.runtime.sendMessage(m, (resp) => {
      if (resp.error) {
        console.error("error response", resp);
        const e = Error("call to reserve-creation-info failed");
        (e as any).errorResponse = resp;
        reject(e);
        return;
      }
      resolve(resp);
    });
  });
}


async function callBackend(type: string, detail?: any): Promise<any> {
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
 * Get all exchanges the wallet knows about.
 */
export async function getExchanges(): Promise<ExchangeRecord[]> {
  return await callBackend("get-exchanges");
}


/**
 * Get all currencies the exchange knows about.
 */
export async function getCurrencies(): Promise<CurrencyRecord[]> {
  return await callBackend("get-currencies");
}


/**
 * Get information about a specific currency.
 */
export async function getCurrency(name: string): Promise<CurrencyRecord|null> {
  return await callBackend("currency-info", {name});
}


/**
 * Get information about a specific exchange.
 */
export async function getExchangeInfo(baseUrl: string): Promise<ExchangeRecord> {
  return await callBackend("exchange-info", {baseUrl});
}


/**
 * Replace an existing currency record with the one given.  The currency to
 * replace is specified inside the currency record.
 */
export async function updateCurrency(currencyRecord: CurrencyRecord): Promise<void> {
  return await callBackend("update-currency", { currencyRecord });
}


/**
 * Get all reserves the wallet has at an exchange.
 */
export async function getReserves(exchangeBaseUrl: string): Promise<ReserveRecord[]> {
  return await callBackend("get-reserves", { exchangeBaseUrl });
}


/**
 * Get all reserves for which a payback is available.
 */
export async function getPaybackReserves(): Promise<ReserveRecord[]> {
  return await callBackend("get-payback-reserves");
}


/**
 * Withdraw the payback that is available for a reserve.
 */
export async function withdrawPaybackReserve(reservePub: string): Promise<ReserveRecord[]> {
  return await callBackend("withdraw-payback-reserve", { reservePub });
}


/**
 * Get all coins withdrawn from the given exchange.
 */
export async function getCoins(exchangeBaseUrl: string): Promise<CoinRecord[]> {
  return await callBackend("get-coins", { exchangeBaseUrl });
}


/**
 * Get all precoins withdrawn from the given exchange.
 */
export async function getPreCoins(exchangeBaseUrl: string): Promise<PreCoinRecord[]> {
  return await callBackend("get-precoins", { exchangeBaseUrl });
}


/**
 * Get all denoms offered by the given exchange.
 */
export async function getDenoms(exchangeBaseUrl: string): Promise<DenominationRecord[]> {
  return await callBackend("get-denoms", { exchangeBaseUrl });
}


/**
 * Start refreshing a coin.
 */
export async function refresh(coinPub: string): Promise<void> {
  return await callBackend("refresh-coin", { coinPub });
}


/**
 * Request payback for a coin.  Only works for non-refreshed coins.
 */
export async function payback(coinPub: string): Promise<void> {
  return await callBackend("payback-coin", { coinPub });
}
