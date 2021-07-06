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
  CoreApiResponse,
  ConfirmPayResult,
  BalancesResponse,
  TransactionsResponse,
  ApplyRefundResponse,
  PreparePayResult,
  AcceptWithdrawalResponse,
  WalletDiagnostics,
  GetWithdrawalDetailsForUriRequest,
  WithdrawUriInfoResponse,
  PrepareTipRequest,
  PrepareTipResult,
  AcceptTipRequest,
  DeleteTransactionRequest,
  RetryTransactionRequest,
  SetWalletDeviceIdRequest,
} from "@gnu-taler/taler-util";
import { AddBackupProviderRequest, BackupProviderState, OperationFailedError } from "@gnu-taler/taler-wallet-core";
import { BackupInfo } from "@gnu-taler/taler-wallet-core";

export interface ExtendedPermissionsResponse {
  newValue: boolean;
}

/**
 * Response with information about available version upgrades.
 */
export interface UpgradeResponse {
  /**
   * Is a reset required because of a new DB version
   * that can't be automatically upgraded?
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
 * Retrieve the full event history for this wallet.
 */
export function getTransactions(): Promise<TransactionsResponse> {
  return callBackend("getTransactions", {});
}

interface CurrencyInfo {
  name: string;
  baseUrl: string;
  pub: string;
}
interface ListOfKnownCurrencies {
  auditors: CurrencyInfo[],
  exchanges: CurrencyInfo[],
}

/**
 * Get a list of currencies from known auditors and exchanges
 */
export function listKnownCurrencies(): Promise<ListOfKnownCurrencies> {
  return callBackend("listCurrencies", {}).then(result => {
    console.log("result list", result)
    const auditors = result.trustedAuditors.map((a: Record<string, string>) => ({
      name: a.currency,
      baseUrl: a.auditorBaseUrl,
      pub: a.auditorPub,
    }))
    const exchanges = result.trustedExchanges.map((a: Record<string, string>) => ({
      name: a.currency,
      baseUrl: a.exchangeBaseUrl,
      pub: a.exchangeMasterPub,
    }))
    return { auditors, exchanges }
  });
}

/**
 * Get information about the current state of wallet backups.
 */
export function getBackupInfo(): Promise<BackupInfo> {
  return callBackend("getBackupInfo", {})
}

/**
 * Add a backup provider and activate it
 */
export function addBackupProvider(backupProviderBaseUrl: string): Promise<void> {
  return callBackend("addBackupProvider", {
    backupProviderBaseUrl, activate: true
  } as AddBackupProviderRequest)
}

export function setWalletDeviceId(walletDeviceId: string): Promise<void> {
  return callBackend("setWalletDeviceId", {
    walletDeviceId
  } as SetWalletDeviceIdRequest)
}

export function syncAllProviders(): Promise<void> {
  return callBackend("runBackupCycle", {})
}


/**
 * Retry a transaction
 * @param transactionId 
 * @returns 
 */
export function retryTransaction(transactionId: string): Promise<void> {
  return callBackend("retryTransaction", {
    transactionId
  } as RetryTransactionRequest);
}

/**
 * Permanently delete a transaction from the transaction list
 */
export function deleteTransaction(transactionId: string): Promise<void> {
  return callBackend("deleteTransaction", {
    transactionId
  } as DeleteTransactionRequest);
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
