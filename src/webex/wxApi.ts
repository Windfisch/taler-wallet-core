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
  ProposalDownloadRecord,
  PurchaseRecord,
  ReserveRecord,
} from "../dbTypes";
import {
  BenchmarkResult,
  CheckPayResult,
  ConfirmPayResult,
  ReserveCreationInfo,
  SenderWireInfos,
  TipStatus,
  WalletBalance,
  PurchaseDetails,
} from "../walletTypes";

import {
  MerchantRefundPermission,
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


/**
 * Error thrown when the function from the backend (via RPC) threw an error.
 */
export class WalletApiError extends Error {
  constructor(message: string, public detail: any) {
    super(message);
    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}


async function callBackend<T extends MessageType>(
  type: T,
  detail: MessageMap[T]["request"],
): Promise<MessageMap[T]["response"]> {
  return new Promise<MessageMap[T]["response"]>((resolve, reject) => {
    chrome.runtime.sendMessage({ type, detail }, (resp) => {
      if (typeof resp === "object" && resp && resp.error) {
        const e = new WalletApiError(resp.error.message, resp.error);
        reject(e);
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
 * Check upgrade information
 */
export function checkUpgrade(): Promise<UpgradeResponse> {
  return callBackend("check-upgrade", { });
}

/**
 * Create a reserve.
 */
export function createReserve(args: { amount: AmountJson, exchange: string, senderWire?: string }): Promise<any> {
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
export function getPurchaseDetails(contractTermsHash: string): Promise<PurchaseDetails> {
  return callBackend("get-purchase-details", { contractTermsHash });
}


/**
 * Get the status of processing a tip.
 */
export function getTipStatus(talerTipUri: string): Promise<TipStatus> {
  return callBackend("get-tip-status", { talerTipUri });
}

/**
 * Mark a tip as accepted by the user.
 */
export function acceptTip(talerTipUri: string): Promise<void> {
  return callBackend("accept-tip", { talerTipUri });
}


/**
 * Clear notifications that the wallet shows to the user.
 */
export function clearNotification(): Promise<void> {
  return callBackend("clear-notification", { });
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
export function applyRefund(refundUrl: string): Promise<string> {
  return callBackend("accept-refund", { refundUrl });
}

/**
 * Abort a failed payment and try to get a refund.
 */
export function abortFailedPayment(contractTermsHash: string) {
  return callBackend("abort-failed-payment", { contractTermsHash });
}


/**
 * Abort a failed payment and try to get a refund.
 */
export function benchmarkCrypto(repetitions: number): Promise<BenchmarkResult> {
  return callBackend("benchmark-crypto", { repetitions });
}

/**
 * Get details about a withdraw operation.
 */
export function getWithdrawDetails(talerWithdrawUri: string, maybeSelectedExchange: string | undefined) {
  return callBackend("get-withdraw-details", { talerWithdrawUri, maybeSelectedExchange });
}

/**
 * Get details about a pay operation.
 */
export function preparePay(talerPayUri: string) {
  return callBackend("prepare-pay", { talerPayUri });
}

/**
 * Get details about a withdraw operation.
 */
export function acceptWithdrawal(talerWithdrawUri: string, selectedExchange: string) {
  return callBackend("accept-withdrawal", { talerWithdrawUri, selectedExchange });
}
