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
import { AmountJson } from "../amounts";
import {
  CoinRecord,
  CurrencyRecord,
  DenominationRecord,
  ExchangeRecord,
  PreCoinRecord,
  PurchaseRecord,
  ReserveRecord,
} from "../dbTypes";
import {
  CheckPayResult,
  ConfirmPayResult,
  ReserveCreationInfo,
  SenderWireInfos,
  TipStatus,
  WalletBalance,
} from "../walletTypes";

import {
  RefundPermission,
  TipToken,
} from "../talerTypes";

import { MessageMap, MessageType } from "./messages";


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
export function confirmPay(proposalId: number, sessionId: string | undefined): Promise<ConfirmPayResult> {
  return callBackend("confirm-pay", { proposalId, sessionId });
}

/**
 * Replay paying for a purchase.
 */
export function submitPay(contractTermsHash: string, sessionId: string | undefined): Promise<ConfirmPayResult> {
  return callBackend("submit-pay", { contractTermsHash, sessionId });
}

/**
 * Hash a contract.  Throws if its not a valid contract.
 */
export function hashContract(contract: object): Promise<string> {
  return callBackend("hash-contract", { contract });
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
export function queryPaymentByFulfillmentUrl(url: string): Promise<PurchaseRecord> {
  return callBackend("query-payment", { url });
}

/**
 * Check upgrade information
 */
export function checkUpgrade(): Promise<UpgradeResponse> {
  return callBackend("check-upgrade", { });
}

/**
 * Create a reserve.
 */
export function createReserve(args: { amount: AmountJson, exchange: string, senderWire?: object }): Promise<any> {
  return callBackend("create-reserve", args);
}

/**
 * Reset database
 */
export function resetDb(): Promise<void> {
  return callBackend("reset-db", { });
}

/**
 * Get balances for all currencies/exchanges.
 */
export function getBalance(): Promise<WalletBalance> {
  return callBackend("balances", { });
}


/**
 * Get possible sender wire infos for getting money
 * wired from an exchange.
 */
export function getSenderWireInfos(): Promise<SenderWireInfos> {
  return callBackend("get-sender-wire-infos", { });
}

/**
 * Return coins to a bank account.
 */
export function returnCoins(args: { amount: AmountJson, exchange: string, senderWire: object }): Promise<void> {
  return callBackend("return-coins", args);
}


/**
 * Record an error report and display it in a tabl.
 *
 * If sameTab is set, the error report will be opened in the current tab,
 * otherwise in a new tab.
 */
export function logAndDisplayError(args: any): Promise<void> {
  return callBackend("log-and-display-error", args);
}

/**
 * Get an error report from the logging database for the
 * given report UID.
 */
export function getReport(reportUid: string): Promise<any> {
  return callBackend("get-report", { reportUid });
}


/**
 * Look up a purchase in the wallet database from
 * the contract terms hash.
 */
export function getPurchase(contractTermsHash: string): Promise<PurchaseRecord> {
  return callBackend("get-purchase", { contractTermsHash });
}

/**
 * Get the refund fees for a refund permission, including
 * subsequent refresh and unrefreshable coins.
 */
export function getFullRefundFees(args: { refundPermissions: RefundPermission[] }): Promise<AmountJson> {
  return callBackend("get-full-refund-fees", { refundPermissions: args.refundPermissions });
}


/**
 * Get the status of processing a tip.
 */
export function getTipStatus(tipToken: TipToken): Promise<TipStatus> {
  return callBackend("get-tip-status", { tipToken });
}

/**
 * Mark a tip as accepted by the user.
 */
export function acceptTip(tipToken: TipToken): Promise<TipStatus> {
  return callBackend("accept-tip", { tipToken });
}


/**
 * Clear notifications that the wallet shows to the user.
 */
export function clearNotification(): Promise<void> {
  return callBackend("clear-notification", { });
}

/**
 * Trigger taler payment processing (for payment, tipping and refunds).
 */
export function talerPay(msg: any): Promise<void> {
  return callBackend("taler-pay", msg);
}

/**
 * Download a contract.
 */
export function downloadProposal(url: string): Promise<number> {
  return callBackend("download-proposal", { url });
}

/**
 * Download a refund and accept it.
 */
export function acceptRefund(refundUrl: string): Promise<string> {
  return callBackend("accept-refund", { refundUrl });
}
