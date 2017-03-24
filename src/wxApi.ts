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

import {
  AmountJson,
  CoinRecord,
  PreCoinRecord,
  ReserveCreationInfo,
  ExchangeRecord,
  CurrencyRecord,
  ReserveRecord, DenominationRecord
} from "./types";

/**
 * Interface to the wallet through WebExtension messaging.
 * @author Florian Dold
 */


export function getReserveCreationInfo(baseUrl: string,
  amount: AmountJson): Promise<ReserveCreationInfo> {
  let m = { type: "reserve-creation-info", detail: { baseUrl, amount } };
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(m, (resp) => {
      if (resp.error) {
        console.error("error response", resp);
        let e = Error("call to reserve-creation-info failed");
        (e as any).errorResponse = resp;
        reject(e);
        return;
      }
      resolve(resp);
    });
  });
}

export async function callBackend(type: string, detail?: any): Promise<any> {
  return new Promise<ExchangeRecord[]>((resolve, reject) => {
    chrome.runtime.sendMessage({ type, detail }, (resp) => {
      resolve(resp);
    });
  });
}

export async function getExchanges(): Promise<ExchangeRecord[]> {
  return await callBackend("get-exchanges");
}

export async function getCurrencies(): Promise<CurrencyRecord[]> {
  return await callBackend("get-currencies");
}

export async function updateCurrency(currencyRecord: CurrencyRecord): Promise<void> {
  return await callBackend("update-currency", { currencyRecord });
}

export async function getReserves(exchangeBaseUrl: string): Promise<ReserveRecord[]> {
  return await callBackend("get-reserves", { exchangeBaseUrl });
}

export async function getCoins(exchangeBaseUrl: string): Promise<CoinRecord[]> {
  return await callBackend("get-coins", { exchangeBaseUrl });
}

export async function getPreCoins(exchangeBaseUrl: string): Promise<PreCoinRecord[]> {
  return await callBackend("get-precoins", { exchangeBaseUrl });
}

export async function getDenoms(exchangeBaseUrl: string): Promise<DenominationRecord[]> {
  return await callBackend("get-denoms", { exchangeBaseUrl });
}

export async function refresh(coinPub: string): Promise<void> {
  return await callBackend("refresh-coin", { coinPub });
}
