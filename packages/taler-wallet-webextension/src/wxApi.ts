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
import { AmountJson, walletTypes } from "taler-wallet-core";


export interface ExtendedPermissionsResponse {
  newValue: boolean;
}


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

async function callBackend(
  type: string,
  detail: any,
): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    chrome.runtime.sendMessage({ type, detail }, (resp) => {
      if (chrome.runtime.lastError) {
        console.log("Error calling backend");
        reject(
          new Error(
            `Error contacting backend: chrome.runtime.lastError.message`,
          ),
        );
      }
      if (typeof resp === "object" && resp && resp.error) {
        console.warn("response error:", resp);
        const e = new WalletApiError(resp.error.message, resp.error);
        reject(e);
      } else {
        resolve(resp);
      }
    });
  });
}



/**
 * Start refreshing a coin.
 */
export function refresh(coinPub: string): Promise<void> {
  return callBackend("refresh-coin", { coinPub });
}

/**
 * Pay for a proposal.
 */
export function confirmPay(
  proposalId: string,
  sessionId: string | undefined,
): Promise<walletTypes.ConfirmPayResult> {
  return callBackend("confirm-pay", { proposalId, sessionId });
}

/**
 * Check upgrade information
 */
export function checkUpgrade(): Promise<UpgradeResponse> {
  return callBackend("check-upgrade", {});
}

/**
 * Reset database
 */
export function resetDb(): Promise<void> {
  return callBackend("reset-db", {});
}

/**
 * Get balances for all currencies/exchanges.
 */
export function getBalance(): Promise<walletTypes.BalancesResponse> {
  return callBackend("balances", {});
}

/**
 * Return coins to a bank account.
 */
export function returnCoins(args: {
  amount: AmountJson;
  exchange: string;
  senderWire: string;
}): Promise<void> {
  return callBackend("return-coins", args);
}

/**
 * Look up a purchase in the wallet database from
 * the contract terms hash.
 */
export function getPurchaseDetails(
  proposalId: string,
): Promise<walletTypes.PurchaseDetails> {
  return callBackend("get-purchase-details", { proposalId });
}

/**
 * Get the status of processing a tip.
 */
export function getTipStatus(talerTipUri: string): Promise<walletTypes.TipStatus> {
  return callBackend("get-tip-status", { talerTipUri });
}

/**
 * Mark a tip as accepted by the user.
 */
export function acceptTip(talerTipUri: string): Promise<void> {
  return callBackend("accept-tip", { talerTipUri });
}

/**
 * Download a refund and accept it.
 */
export function applyRefund(
  refundUrl: string,
): Promise<{ contractTermsHash: string; proposalId: string }> {
  return callBackend("accept-refund", { refundUrl });
}

/**
 * Abort a failed payment and try to get a refund.
 */
export function abortFailedPayment(contractTermsHash: string): Promise<void> {
  return callBackend("abort-failed-payment", { contractTermsHash });
}

/**
 * Abort a failed payment and try to get a refund.
 */
export function benchmarkCrypto(repetitions: number): Promise<walletTypes.BenchmarkResult> {
  return callBackend("benchmark-crypto", { repetitions });
}

/**
 * Get details about a pay operation.
 */
export function preparePay(talerPayUri: string): Promise<walletTypes.PreparePayResult> {
  return callBackend("prepare-pay", { talerPayUri });
}

/**
 * Get details about a withdraw operation.
 */
export function acceptWithdrawal(
  talerWithdrawUri: string,
  selectedExchange: string,
): Promise<walletTypes.AcceptWithdrawalResponse> {
  return callBackend("accept-withdrawal", {
    talerWithdrawUri,
    selectedExchange,
  });
}

/**
 * Get diagnostics information
 */
export function getDiagnostics(): Promise<walletTypes.WalletDiagnostics> {
  return callBackend("get-diagnostics", {});
}

/**
 * Get diagnostics information
 */
export function setExtendedPermissions(
  value: boolean,
): Promise<ExtendedPermissionsResponse> {
  return callBackend("set-extended-permissions", { value });
}

/**
 * Get diagnostics information
 */
export function getExtendedPermissions(): Promise<ExtendedPermissionsResponse> {
  return callBackend("get-extended-permissions", {});
}

export function onUpdateNotification(f: () => void): () => void {
  const port = chrome.runtime.connect({ name: "notifications" });
  const listener = (): void => {
    f();
  };
  port.onMessage.addListener(listener);
  return () => {
    port.onMessage.removeListener(listener);
  };
}