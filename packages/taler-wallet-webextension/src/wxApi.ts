/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Interface to the wallet through WebExtension messaging.
 */

/**
 * Imports.
 */
import {
  AcceptExchangeTosRequest,
  AcceptManualWithdrawalResult,
  AcceptPeerPullPaymentRequest,
  AcceptPeerPullPaymentResponse,
  AcceptPeerPushPaymentRequest,
  AcceptPeerPushPaymentResponse,
  AcceptTipRequest,
  AcceptTipResponse,
  AcceptWithdrawalResponse,
  AddExchangeRequest,
  AddKnownBankAccountsRequest,
  AmountString,
  ApplyRefundResponse,
  BalancesResponse,
  CheckPeerPullPaymentRequest,
  CheckPeerPullPaymentResponse,
  CheckPeerPushPaymentRequest,
  CheckPeerPushPaymentResponse,
  CoinDumpJson,
  ConfirmPayResult,
  CoreApiResponse,
  CreateDepositGroupRequest,
  CreateDepositGroupResponse,
  DeleteTransactionRequest,
  DepositGroupFees,
  ExchangeFullDetails,
  ExchangesListResponse,
  ForgetKnownBankAccountsRequest,
  GetExchangeTosResult,
  GetFeeForDepositRequest,
  GetWithdrawalDetailsForAmountRequest,
  GetWithdrawalDetailsForUriRequest,
  InitiatePeerPullPaymentRequest,
  InitiatePeerPullPaymentResponse,
  InitiatePeerPushPaymentRequest,
  InitiatePeerPushPaymentResponse,
  KnownBankAccounts,
  Logger,
  ManualWithdrawalDetails,
  NotificationType,
  PaytoUri,
  PrepareDepositRequest,
  PrepareDepositResponse,
  PreparePayResult,
  PrepareRefundRequest,
  PrepareRefundResult,
  PrepareTipRequest,
  PrepareTipResult,
  RetryTransactionRequest,
  SetWalletDeviceIdRequest,
  stringifyPaytoUri,
  Transaction,
  TransactionsResponse,
  WalletCoreVersion,
  WalletDiagnostics,
  WithdrawUriInfoResponse,
} from "@gnu-taler/taler-util";
import {
  AddBackupProviderRequest,
  BackupInfo,
  PendingOperationsResponse,
  RemoveBackupProviderRequest,
  TalerError,
  WalletApiOperation,
  WalletContractData,
  WalletCoreApiClient,
  WalletCoreOpKeys,
  WalletCoreRequestType,
  WalletCoreResponseType,
} from "@gnu-taler/taler-wallet-core";
import { MessageFromBackend, platform } from "./platform/api.js";

/**
 *
 * @author Florian Dold
 * @author sebasjm
 */

export interface ExtendedPermissionsResponse {
  newValue: boolean;
}
const logger = new Logger("wxApi");

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

/**
 * @deprecated Use {@link WxWalletCoreApiClient} instead.
 */
async function callBackend(operation: string, payload: any): Promise<any> {
  let response: CoreApiResponse;
  try {
    response = await platform.sendMessageToWalletBackground(operation, payload);
  } catch (e) {
    console.log("Error calling backend");
    throw new Error(`Error contacting backend: ${e}`);
  }
  logger.info("got response", response);
  if (response.type === "error") {
    throw TalerError.fromUncheckedDetail(response.error);
  }
  return response.result;
}

export class WxWalletCoreApiClient implements WalletCoreApiClient {
  async call<Op extends WalletCoreOpKeys>(
    operation: Op,
    payload: WalletCoreRequestType<Op>,
  ): Promise<WalletCoreResponseType<Op>> {
    let response: CoreApiResponse;
    try {
      response = await platform.sendMessageToWalletBackground(
        operation,
        payload,
      );
    } catch (e) {
      console.log("Error calling backend");
      throw new Error(`Error contacting backend: ${e}`);
    }
    logger.info("got response", response);
    if (response.type === "error") {
      throw TalerError.fromUncheckedDetail(response.error);
    }
    return response.result as any;
  }
}

export const wxClient = new WxWalletCoreApiClient();

/**
 * Pay for a proposal.
 */
export function confirmPay(
  proposalId: string,
  sessionId: string | undefined,
): Promise<ConfirmPayResult> {
  return wxClient.call(WalletApiOperation.ConfirmPay, {
    proposalId,
    sessionId,
  });
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
 * Reset database
 */
export function runGarbageCollector(): Promise<void> {
  return callBackend("run-gc", {});
}

export function getFeeForDeposit(
  depositPaytoUri: string,
  amount: AmountString,
): Promise<DepositGroupFees> {
  return callBackend("getFeeForDeposit", {
    depositPaytoUri,
    amount,
  } as GetFeeForDepositRequest);
}

export function prepareDeposit(
  depositPaytoUri: string,
  amount: AmountString,
): Promise<PrepareDepositResponse> {
  return callBackend("prepareDeposit", {
    depositPaytoUri,
    amount,
  } as PrepareDepositRequest);
}

export function createDepositGroup(
  depositPaytoUri: string,
  amount: AmountString,
): Promise<CreateDepositGroupResponse> {
  return callBackend("createDepositGroup", {
    depositPaytoUri,
    amount,
  } as CreateDepositGroupRequest);
}

/**
 * Get balances for all currencies/exchanges.
 */
export function getBalance(): Promise<BalancesResponse> {
  return callBackend("getBalances", {});
}

export function getContractTermsDetails(
  proposalId: string,
): Promise<WalletContractData> {
  return callBackend("getContractTermsDetails", { proposalId });
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
  auditors: CurrencyInfo[];
  exchanges: CurrencyInfo[];
}

/**
 * Get a list of currencies from known auditors and exchanges
 */
export function listKnownCurrencies(): Promise<ListOfKnownCurrencies> {
  return callBackend("listCurrencies", {}).then((result) => {
    const auditors = result.trustedAuditors.map(
      (a: Record<string, string>) => ({
        name: a.currency,
        baseUrl: a.auditorBaseUrl,
        pub: a.auditorPub,
      }),
    );
    const exchanges = result.trustedExchanges.map(
      (a: Record<string, string>) => ({
        name: a.currency,
        baseUrl: a.exchangeBaseUrl,
        pub: a.exchangeMasterPub,
      }),
    );
    return { auditors, exchanges };
  });
}

export function listExchanges(): Promise<ExchangesListResponse> {
  return callBackend("listExchanges", {});
}

export function getExchangeDetailedInfo(
  exchangeBaseUrl: string,
): Promise<ExchangeFullDetails> {
  return callBackend("getExchangeDetailedInfo", {
    exchangeBaseUrl,
  });
}

export function getVersion(): Promise<WalletCoreVersion> {
  return callBackend("getVersion", {});
}

export function listKnownBankAccounts(
  currency?: string,
): Promise<KnownBankAccounts> {
  return callBackend("listKnownBankAccounts", { currency });
}

export function addKnownBankAccounts(
  payto: PaytoUri,
  currency: string,
  alias: string,
): Promise<void> {
  return callBackend("addKnownBankAccounts", {
    payto: stringifyPaytoUri(payto),
    currency,
    alias,
  } as AddKnownBankAccountsRequest);
}
export function forgetKnownBankAccounts(payto: string): Promise<void> {
  return callBackend("forgetKnownBankAccounts", {
    payto,
  } as ForgetKnownBankAccountsRequest);
}

/**
 * Get information about the current state of wallet backups.
 */
export function getBackupInfo(): Promise<BackupInfo> {
  return callBackend("getBackupInfo", {});
}

/**
 * Add a backup provider and activate it
 */
export function addBackupProvider(
  backupProviderBaseUrl: string,
  name: string,
): Promise<void> {
  return callBackend("addBackupProvider", {
    backupProviderBaseUrl,
    activate: true,
    name,
  } as AddBackupProviderRequest);
}

export function setWalletDeviceId(walletDeviceId: string): Promise<void> {
  return callBackend("setWalletDeviceId", {
    walletDeviceId,
  } as SetWalletDeviceIdRequest);
}

export function syncAllProviders(): Promise<void> {
  return callBackend("runBackupCycle", {});
}

export function syncOneProvider(url: string): Promise<void> {
  return callBackend("runBackupCycle", { providers: [url] });
}
export function removeProvider(url: string): Promise<void> {
  return callBackend("removeBackupProvider", {
    provider: url,
  } as RemoveBackupProviderRequest);
}
export function extendedProvider(url: string): Promise<void> {
  return callBackend("extendBackupProvider", { provider: url });
}

/**
 * Retry a transaction
 * @param transactionId
 * @returns
 */
export function retryTransaction(transactionId: string): Promise<void> {
  return callBackend("retryTransaction", {
    transactionId,
  } as RetryTransactionRequest);
}

/**
 * Permanently delete a transaction from the transaction list
 */
export function deleteTransaction(transactionId: string): Promise<void> {
  return callBackend("deleteTransaction", {
    transactionId,
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
 * Do refund for purchase.
 */
export function applyRefundFromPurchaseId(
  purchaseId: string,
): Promise<ApplyRefundResponse> {
  return callBackend("applyRefundFromPurchaseId", { purchaseId });
}

/**
 * Get details about a pay operation.
 */
export function preparePay(talerPayUri: string): Promise<PreparePayResult> {
  return callBackend("preparePayForUri", { talerPayUri });
}

/**
 * Get details about a withdraw operation.
 */
export function acceptWithdrawal(
  talerWithdrawUri: string,
  selectedExchange: string,
  restrictAge?: number,
): Promise<AcceptWithdrawalResponse> {
  return callBackend("acceptBankIntegratedWithdrawal", {
    talerWithdrawUri,
    exchangeBaseUrl: selectedExchange,
    restrictAge,
  });
}

/**
 * Create a reserve into the exchange that expect the amount indicated
 * @param exchangeBaseUrl
 * @param amount
 * @returns
 */
export function acceptManualWithdrawal(
  exchangeBaseUrl: string,
  amount: string,
  restrictAge?: number,
): Promise<AcceptManualWithdrawalResult> {
  return callBackend("acceptManualWithdrawal", {
    amount,
    exchangeBaseUrl,
    restrictAge,
  });
}

export function setExchangeTosAccepted(
  exchangeBaseUrl: string,
  etag: string | undefined,
): Promise<void> {
  return callBackend("setExchangeTosAccepted", {
    exchangeBaseUrl,
    etag,
  } as AcceptExchangeTosRequest);
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
export function toggleHeaderListener(
  value: boolean,
): Promise<ExtendedPermissionsResponse> {
  return callBackend("toggleHeaderListener", { value });
}

/**
 * Get diagnostics information
 */
export function containsHeaderListener(): Promise<ExtendedPermissionsResponse> {
  return callBackend("containsHeaderListener", {});
}

/**
 * Get diagnostics information
 */
export function getWithdrawalDetailsForUri(
  req: GetWithdrawalDetailsForUriRequest,
): Promise<WithdrawUriInfoResponse> {
  return callBackend("getWithdrawalDetailsForUri", req);
}

export function getWithdrawalDetailsForAmount(
  req: GetWithdrawalDetailsForAmountRequest,
): Promise<ManualWithdrawalDetails> {
  return callBackend("getWithdrawalDetailsForAmount", req);
}

export function getExchangeTos(
  exchangeBaseUrl: string,
  acceptedFormat: string[],
): Promise<GetExchangeTosResult> {
  return callBackend("getExchangeTos", {
    exchangeBaseUrl,
    acceptedFormat,
  });
}

export function dumpCoins(): Promise<CoinDumpJson> {
  return callBackend("dumpCoins", {});
}

export function getPendingOperations(): Promise<PendingOperationsResponse> {
  return callBackend("getPendingOperations", {});
}

export function addExchange(req: AddExchangeRequest): Promise<void> {
  return callBackend("addExchange", req);
}

export function prepareRefund(
  req: PrepareRefundRequest,
): Promise<PrepareRefundResult> {
  return callBackend("prepareRefund", req);
}

export function prepareTip(req: PrepareTipRequest): Promise<PrepareTipResult> {
  return callBackend("prepareTip", req);
}

export function acceptTip(req: AcceptTipRequest): Promise<AcceptTipResponse> {
  return callBackend("acceptTip", req);
}

export function exportDB(): Promise<any> {
  return callBackend("exportDb", {});
}

export function importDB(dump: any): Promise<void> {
  return callBackend("importDb", { dump });
}

export function onUpdateNotification(
  messageTypes: Array<NotificationType>,
  doCallback: () => void,
): () => void {
  const onNewMessage = (message: MessageFromBackend): void => {
    const shouldNotify = messageTypes.includes(message.type);
    if (shouldNotify) {
      doCallback();
    }
  };
  return platform.listenToWalletBackground(onNewMessage);
}

export function initiatePeerPushPayment(
  req: InitiatePeerPushPaymentRequest,
): Promise<InitiatePeerPushPaymentResponse> {
  return callBackend("initiatePeerPushPayment", req);
}
export function checkPeerPushPayment(
  req: CheckPeerPushPaymentRequest,
): Promise<CheckPeerPushPaymentResponse> {
  return callBackend("checkPeerPushPayment", req);
}
export function acceptPeerPushPayment(
  req: AcceptPeerPushPaymentRequest,
): Promise<AcceptPeerPushPaymentResponse> {
  return callBackend("acceptPeerPushPayment", req);
}
export function initiatePeerPullPayment(
  req: InitiatePeerPullPaymentRequest,
): Promise<InitiatePeerPullPaymentResponse> {
  return callBackend("initiatePeerPullPayment", req);
}
export function checkPeerPullPayment(
  req: CheckPeerPullPaymentRequest,
): Promise<CheckPeerPullPaymentResponse> {
  return callBackend("checkPeerPullPayment", req);
}
export function acceptPeerPullPayment(
  req: AcceptPeerPullPaymentRequest,
): Promise<AcceptPeerPullPaymentResponse> {
  return callBackend("acceptPeerPullPayment", req);
}

export function getTransactionById(tid: string): Promise<Transaction> {
  return callBackend("getTransactionById", {
    transactionId: tid,
  });
}
