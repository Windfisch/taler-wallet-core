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
  ConfirmPayResult,
  BalancesResponse,
  PreparePayResult,
  AcceptWithdrawalResponse,
  WalletDiagnostics,
  CoreApiResponse,
  OperationFailedError,
  GetWithdrawalDetailsForUriRequest,
  WithdrawUriInfoResponse,
  TransactionsResponse,
  ApplyRefundResponse,
  PrepareTipRequest,
  PrepareTipResult,
  AcceptTipRequest,
} from "taler-wallet-core";

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

async function callBackend(operation: string, payload: any): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    chrome.runtime.sendMessage({ operation, payload, id: "(none)" }, (resp) => {
      if (chrome.runtime.lastError) {
        console.log("Error calling backend");
        reject(
          new Error(
            `Error contacting backend: chrome.runtime.lastError.message`,
          ),
        );
      }
      console.log("got response", resp);
      const r = resp as CoreApiResponse;
      if (r.type === "error") {
        reject(new OperationFailedError(r.error));
        return;
      }
      resolve(r.result);
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
): Promise<ConfirmPayResult> {
  return callBackend("confirmPay", { proposalId, sessionId });
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
export function getBalance(): Promise<BalancesResponse> {
  return callBackend("getBalances", {});
}

/**
 * Get balances for all currencies/exchanges.
 */
export function getTransactions(): Promise<TransactionsResponse> {
  return callBackend("getTransactions", {});
}

/**
 * Download a refund and accept it.
 */
export function applyRefund(
  talerRefundUri: string,
): Promise<ApplyRefundResponse> {
  return callBackend("applyRefund", { talerRefundUri });
}

/**
 * Get details about a pay operation.
 */
export function preparePay(talerPayUri: string): Promise<PreparePayResult> {
  return callBackend("preparePay", { talerPayUri });
}

/**
 * Get details about a withdraw operation.
 */
export function acceptWithdrawal(
  talerWithdrawUri: string,
  selectedExchange: string,
): Promise<AcceptWithdrawalResponse> {
  return callBackend("acceptBankIntegratedWithdrawal", {
    talerWithdrawUri,
    exchangeBaseUrl: selectedExchange,
  });
}

/**
 * Get diagnostics information
 */
export function getDiagnostics(): Promise<WalletDiagnostics> {
  return callBackend("wxGetDiagnostics", {});
}

/**
 * Get diagnostics information
 */
export function setExtendedPermissions(
  value: boolean,
): Promise<ExtendedPermissionsResponse> {
  return callBackend("wxSetExtendedPermissions", { value });
}

/**
 * Get diagnostics information
 */
export function getExtendedPermissions(): Promise<ExtendedPermissionsResponse> {
  return callBackend("wxGetExtendedPermissions", {});
}

/**
 * Get diagnostics information
 */
export function getWithdrawalDetailsForUri(
  req: GetWithdrawalDetailsForUriRequest,
): Promise<WithdrawUriInfoResponse> {
  return callBackend("getWithdrawalDetailsForUri", req);
}

export function prepareTip(req: PrepareTipRequest): Promise<PrepareTipResult> {
  return callBackend("prepareTip", req);
}

export function acceptTip(req: AcceptTipRequest): Promise<void> {
  return callBackend("acceptTip", req);
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
