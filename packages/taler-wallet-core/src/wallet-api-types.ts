/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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
 * Type declarations for the high-level interface to wallet-core.
 *
 * Documentation is auto-generated from this file.
 */

/**
 * Imports.
 */
import {
  AbortPayWithRefundRequest,
  AcceptBankIntegratedWithdrawalRequest,
  AcceptExchangeTosRequest,
  AcceptManualWithdrawalRequest,
  AcceptManualWithdrawalResult,
  AcceptPeerPullPaymentRequest,
  AcceptPeerPushPaymentRequest,
  AcceptTipRequest,
  AcceptWithdrawalResponse,
  AddExchangeRequest,
  ApplyRefundRequest,
  ApplyRefundResponse,
  BackupRecovery,
  BalancesResponse,
  CheckPeerPullPaymentRequest,
  CheckPeerPullPaymentResponse,
  CheckPeerPushPaymentRequest,
  CheckPeerPushPaymentResponse,
  CoinDumpJson,
  ConfirmPayRequest,
  ConfirmPayResult,
  CreateDepositGroupRequest,
  CreateDepositGroupResponse,
  DeleteTransactionRequest,
  ExchangesListResponse,
  ForceRefreshRequest,
  GetExchangeTosRequest,
  GetExchangeTosResult,
  GetWithdrawalDetailsForAmountRequest,
  GetWithdrawalDetailsForUriRequest,
  InitiatePeerPullPaymentRequest,
  InitiatePeerPullPaymentResponse,
  InitiatePeerPushPaymentRequest,
  InitiatePeerPushPaymentResponse,
  IntegrationTestArgs,
  ManualWithdrawalDetails,
  PreparePayRequest,
  PreparePayResult,
  PrepareTipRequest,
  PrepareTipResult,
  RecoveryLoadRequest,
  RetryTransactionRequest,
  SetCoinSuspendedRequest,
  SetWalletDeviceIdRequest,
  TestPayArgs,
  TestPayResult,
  TrackDepositGroupRequest,
  TrackDepositGroupResponse,
  TransactionsRequest,
  TransactionsResponse,
  WalletBackupContentV1,
  WalletCurrencyInfo,
  WithdrawFakebankRequest,
  WithdrawTestBalanceRequest,
  WithdrawUriInfoResponse,
} from "@gnu-taler/taler-util";
import {
  AddBackupProviderRequest,
  BackupInfo,
} from "./operations/backup/index.js";
import { PendingOperationsResponse as PendingTasksResponse } from "./pending-types.js";

export enum WalletApiOperation {
  InitWallet = "initWallet",
  WithdrawTestkudos = "withdrawTestkudos",
  WithdrawTestBalance = "withdrawTestBalance",
  PreparePayForUri = "preparePayForUri",
  RunIntegrationTest = "runIntegrationTest",
  TestPay = "testPay",
  AddExchange = "addExchange",
  GetTransactions = "getTransactions",
  ListExchanges = "listExchanges",
  ListKnownBankAccounts = "listKnownBankAccounts",
  GetWithdrawalDetailsForUri = "getWithdrawalDetailsForUri",
  GetWithdrawalDetailsForAmount = "getWithdrawalDetailsForAmount",
  AcceptManualWithdrawal = "acceptManualWithdrawal",
  GetBalances = "getBalances",
  GetPendingOperations = "getPendingOperations",
  SetExchangeTosAccepted = "setExchangeTosAccepted",
  ApplyRefund = "applyRefund",
  AcceptBankIntegratedWithdrawal = "acceptBankIntegratedWithdrawal",
  GetExchangeTos = "getExchangeTos",
  RetryPendingNow = "retryPendingNow",
  AbortFailedPayWithRefund = "abortFailedPayWithRefund",
  ConfirmPay = "confirmPay",
  DumpCoins = "dumpCoins",
  SetCoinSuspended = "setCoinSuspended",
  ForceRefresh = "forceRefresh",
  PrepareTip = "prepareTip",
  AcceptTip = "acceptTip",
  ExportBackup = "exportBackup",
  AddBackupProvider = "addBackupProvider",
  RunBackupCycle = "runBackupCycle",
  ExportBackupRecovery = "exportBackupRecovery",
  ImportBackupRecovery = "importBackupRecovery",
  GetBackupInfo = "getBackupInfo",
  TrackDepositGroup = "trackDepositGroup",
  DeleteTransaction = "deleteTransaction",
  RetryTransaction = "retryTransaction",
  GetCoins = "getCoins",
  ListCurrencies = "listCurrencies",
  CreateDepositGroup = "createDepositGroup",
  SetWalletDeviceId = "setWalletDeviceId",
  ExportBackupPlain = "exportBackupPlain",
  WithdrawFakebank = "withdrawFakebank",
  ExportDb = "exportDb",
  InitiatePeerPushPayment = "initiatePeerPushPayment",
  CheckPeerPushPayment = "checkPeerPushPayment",
  AcceptPeerPushPayment = "acceptPeerPushPayment",
  InitiatePeerPullPayment = "initiatePeerPullPayment",
  CheckPeerPullPayment = "checkPeerPullPayment",
  AcceptPeerPullPayment = "acceptPeerPullPayment",
  ClearDb = "clearDb",
  Recycle = "recycle",
}

// group: Initialization

/**
 * Initialize wallet-core.
 *
 * Must be the request before any other operations.
 */
export type InitWalletOp = {
  op: WalletApiOperation.InitWallet;
  request: {};
  response: {};
};

// group: Basic Wallet Information

/**
 * Get current wallet balance.
 */
export type GetBalancesOp = {
  op: WalletApiOperation.GetBalances;
  request: {};
  response: BalancesResponse;
};

// group: Managing Transactions

/**
 * Get transactions.
 */
export type GetTransactionsOp = {
  op: WalletApiOperation.GetTransactions;
  request: TransactionsRequest;
  response: TransactionsResponse;
};

/**
 * Delete a transaction locally in the wallet.
 */
export type DeleteTransactionOp = {
  op: WalletApiOperation.DeleteTransaction;
  request: DeleteTransactionRequest;
  response: {};
};

/**
 * Immediately retry a transaction.
 */
export type RetryTransactionOp = {
  op: WalletApiOperation.RetryTransaction;
  request: RetryTransactionRequest;
  response: {};
};

// group: Withdrawals

/**
 * Get details for withdrawing a particular amount (manual withdrawal).
 */
export type GetWithdrawalDetailsForAmountOp = {
  op: WalletApiOperation.GetWithdrawalDetailsForAmount;
  request: GetWithdrawalDetailsForAmountRequest;
  response: ManualWithdrawalDetails;
};

/**
 * Get details for withdrawing via a particular taler:// URI.
 */
export type GetWithdrawalDetailsForUriOp = {
  op: WalletApiOperation.GetWithdrawalDetailsForUri;
  request: GetWithdrawalDetailsForUriRequest;
  response: WithdrawUriInfoResponse;
};

/**
 * Accept a bank-integrated withdrawal.
 */
export type AcceptBankIntegratedWithdrawalOp = {
  op: WalletApiOperation.AcceptBankIntegratedWithdrawal;
  request: AcceptBankIntegratedWithdrawalRequest;
  response: AcceptWithdrawalResponse;
};

/**
 * Create a manual withdrawal.
 */
export type AcceptManualWithdrawalOp = {
  op: WalletApiOperation.AcceptManualWithdrawal;
  request: AcceptManualWithdrawalRequest;
  response: AcceptManualWithdrawalResult;
};

// group: Merchant Payments

/**
 * Prepare to make a payment
 */
export type PreparePayForUriOp = {
  op: WalletApiOperation.PreparePayForUri;
  request: PreparePayRequest;
  response: PreparePayResult;
};

/**
 * Confirm a payment that was previously prepared with
 * {@link PreparePayForUriOp}
 */
export type ConfirmPayOp = {
  op: WalletApiOperation.ConfirmPay;
  request: ConfirmPayRequest;
  response: ConfirmPayResult;
};

/**
 * Abort a pending payment with a refund.
 */
export type AbortPayWithRefundOp = {
  op: WalletApiOperation.AbortFailedPayWithRefund;
  request: AbortPayWithRefundRequest;
  response: {};
};

/**
 * Check for a refund based on a taler://refund URI.
 */
export type ApplyRefundOp = {
  op: WalletApiOperation.ApplyRefund;
  request: ApplyRefundRequest;
  response: ApplyRefundResponse;
};

// group: Tipping

/**
 * Query and store information about a tip.
 */
export type PrepareTipOp = {
  op: WalletApiOperation.PrepareTip;
  request: PrepareTipRequest;
  response: PrepareTipResult;
};

/**
 * Accept a tip.
 */
export type AcceptTipOp = {
  op: WalletApiOperation.AcceptTip;
  request: AcceptTipRequest;
  response: {};
};

// group: Exchange Management

/**
 * List exchanges known to the wallet.
 */
export type ListExchangesOp = {
  op: WalletApiOperation.ListExchanges;
  request: {};
  response: ExchangesListResponse;
};

/**
 * Add / force-update an exchange.
 */
export type AddExchangeOp = {
  op: WalletApiOperation.AddExchange;
  request: AddExchangeRequest;
  response: {};
};

/**
 * Accept a particular version of the exchange terms of service.
 */
export type SetExchangeTosAcceptedOp = {
  op: WalletApiOperation.SetExchangeTosAccepted;
  request: AcceptExchangeTosRequest;
  response: {};
};

/**
 * Get the current terms of a service of an exchange.
 */
export type GetExchangeTosOp = {
  op: WalletApiOperation.GetExchangeTos;
  request: GetExchangeTosRequest;
  response: GetExchangeTosResult;
};

/**
 * List currencies known to the wallet.
 */
export type ListCurrenciesOp = {
  op: WalletApiOperation.ListCurrencies;
  request: {};
  response: WalletCurrencyInfo;
};

// group: Deposits

/**
 * Create a new deposit group.
 *
 * Deposit groups are used to deposit multiple coins to a bank
 * account, usually the wallet user's own bank account.
 */
export type CreateDepositGroupOp = {
  op: WalletApiOperation.CreateDepositGroup;
  request: CreateDepositGroupRequest;
  response: CreateDepositGroupResponse;
};

/**
 * Track the status of a deposit group by querying the exchange.
 */
export type TrackDepositGroupOp = {
  op: WalletApiOperation.TrackDepositGroup;
  request: TrackDepositGroupRequest;
  response: TrackDepositGroupResponse;
};

// group: Backups

/**
 * Export the recovery information for the wallet.
 */
export type ExportBackupRecoveryOp = {
  op: WalletApiOperation.ExportBackupRecovery;
  request: {};
  response: BackupRecovery;
};

/**
 * Import recovery information into the wallet.
 */
export type ImportBackupRecoveryOp = {
  op: WalletApiOperation.ImportBackupRecovery;
  request: RecoveryLoadRequest;
  response: {};
};

/**
 * Manually make and upload a backup.
 */
export type RunBackupCycleOp = {
  op: WalletApiOperation.RunBackupCycle;
  request: {};
  response: {};
};

/**
 * Add a new backup provider.
 */
export type AddBackupProviderOp = {
  op: WalletApiOperation.AddBackupProvider;
  request: AddBackupProviderRequest;
  response: {};
};

/**
 * Get some useful stats about the backup state.
 */
export type GetBackupInfoOp = {
  op: WalletApiOperation.GetBackupInfo;
  request: {};
  response: BackupInfo;
};

/**
 * Set the internal device ID of the wallet, used to
 * identify whether a different/new wallet is accessing
 * the backup of another wallet.
 */
export type SetWalletDeviceIdOp = {
  op: WalletApiOperation.SetWalletDeviceId;
  request: SetWalletDeviceIdRequest;
  response: {};
};

/**
 * Export a backup JSON, mostly useful for testing.
 */
export type ExportBackupPlainOp = {
  op: WalletApiOperation.ExportBackupPlain;
  request: {};
  response: WalletBackupContentV1;
};

// group: Peer Payments

/**
 * Initiate an outgoing peer push payment.
 */
export type InitiatePeerPushPaymentOp = {
  op: WalletApiOperation.InitiatePeerPushPayment;
  request: InitiatePeerPushPaymentRequest;
  response: InitiatePeerPushPaymentResponse;
};

/**
 * Check an incoming peer push payment.
 */
export type CheckPeerPushPaymentOp = {
  op: WalletApiOperation.CheckPeerPushPayment;
  request: CheckPeerPushPaymentRequest;
  response: CheckPeerPushPaymentResponse;
};

/**
 * Accept an incoming peer push payment.
 */
export type AcceptPeerPushPaymentOp = {
  op: WalletApiOperation.AcceptPeerPushPayment;
  request: AcceptPeerPushPaymentRequest;
  response: {};
};

/**
 * Initiate an outgoing peer pull payment.
 */
export type InitiatePeerPullPaymentOp = {
  op: WalletApiOperation.InitiatePeerPullPayment;
  request: InitiatePeerPullPaymentRequest;
  response: InitiatePeerPullPaymentResponse;
};

/**
 * Prepare for an incoming peer pull payment.
 */
export type CheckPeerPullPaymentOp = {
  op: WalletApiOperation.CheckPeerPullPayment;
  request: CheckPeerPullPaymentRequest;
  response: CheckPeerPullPaymentResponse;
};

/**
 * Accept an incoming peer pull payment.
 */
export type AcceptPeerPullPaymentOp = {
  op: WalletApiOperation.AcceptPeerPullPayment;
  request: AcceptPeerPullPaymentRequest;
  response: {};
};

// group: Database Management

/**
 * Exoport the wallet database's contents to JSON.
 */
export type ExportDbOp = {
  op: WalletApiOperation.ExportDb;
  request: {};
  response: any;
};

/**
 * Dangerously clear the whole wallet database.
 */
export type ClearDbOp = {
  op: WalletApiOperation.ClearDb;
  request: {};
  response: {};
};

/**
 * Export a backup, clear the database and re-import it.
 */
export type RecycleOp = {
  op: WalletApiOperation.Recycle;
  request: {};
  response: {};
};

// group: Testing and Debugging

/**
 * Run a simple integration test on a test deployment
 * of the exchange and merchant.
 */
export type RunIntegrationTestOp = {
  op: WalletApiOperation.RunIntegrationTest;
  request: IntegrationTestArgs;
  response: {};
};

/**
 * Make withdrawal on a test deployment of the exchange
 * and merchant.
 */
export type WithdrawTestBalanceOp = {
  op: WalletApiOperation.WithdrawTestBalance;
  request: WithdrawTestBalanceRequest;
  response: {};
};

/**
 * Make a withdrawal of testkudos on test.taler.net.
 */
export type WithdrawTestkudosOp = {
  op: WalletApiOperation.WithdrawTestkudos;
  request: {};
  response: {};
};

/**
 * Make a test payment using a test deployment of
 * the exchange and merchant.
 */
export type TestPayOp = {
  op: WalletApiOperation.TestPay;
  request: TestPayArgs;
  response: TestPayResult;
};

/**
 * Make a withdrawal from a fakebank, i.e.
 * a bank where test users can be registered freely
 * and testing APIs are available.
 */
export type WithdrawFakebankOp = {
  op: WalletApiOperation.WithdrawFakebank;
  request: WithdrawFakebankRequest;
  response: {};
};

/**
 * Get wallet-internal pending tasks.
 */
export type GetPendingTasksOp = {
  op: WalletApiOperation.GetPendingOperations;
  request: {};
  response: PendingTasksResponse;
};

/**
 * Dump all coins of the wallet in a simple JSON format.
 */
export type DumpCoinsOp = {
  op: WalletApiOperation.DumpCoins;
  request: {};
  response: CoinDumpJson;
};

/**
 * Set a coin as (un-)suspended.
 * Suspended coins won't be used for payments.
 */
export type SetCoinSuspendedOp = {
  op: WalletApiOperation.SetCoinSuspended;
  request: SetCoinSuspendedRequest;
  response: {};
};

/**
 * Force a refresh on coins where it would not
 * be necessary.
 */
export type ForceRefreshOp = {
  op: WalletApiOperation.ForceRefresh;
  request: ForceRefreshRequest;
  response: {};
};

export type WalletOperations = {
  [WalletApiOperation.InitWallet]: InitWalletOp;
  [WalletApiOperation.WithdrawFakebank]: WithdrawFakebankOp;
  [WalletApiOperation.PreparePayForUri]: PreparePayForUriOp;
  [WalletApiOperation.WithdrawTestkudos]: WithdrawTestkudosOp;
  [WalletApiOperation.ConfirmPay]: ConfirmPayOp;
  [WalletApiOperation.AbortFailedPayWithRefund]: AbortPayWithRefundOp;
  [WalletApiOperation.GetBalances]: GetBalancesOp;
  [WalletApiOperation.GetTransactions]: GetTransactionsOp;
  [WalletApiOperation.GetPendingOperations]: GetPendingTasksOp;
  [WalletApiOperation.DumpCoins]: DumpCoinsOp;
  [WalletApiOperation.SetCoinSuspended]: SetCoinSuspendedOp;
  [WalletApiOperation.ForceRefresh]: ForceRefreshOp;
  [WalletApiOperation.DeleteTransaction]: DeleteTransactionOp;
  [WalletApiOperation.RetryTransaction]: RetryTransactionOp;
  [WalletApiOperation.PrepareTip]: PrepareTipOp;
  [WalletApiOperation.AcceptTip]: AcceptTipOp;
  [WalletApiOperation.ApplyRefund]: ApplyRefundOp;
  [WalletApiOperation.ListCurrencies]: ListCurrenciesOp;
  [WalletApiOperation.GetWithdrawalDetailsForAmount]: GetWithdrawalDetailsForAmountOp;
  [WalletApiOperation.GetWithdrawalDetailsForUri]: GetWithdrawalDetailsForUriOp;
  [WalletApiOperation.AcceptBankIntegratedWithdrawal]: AcceptBankIntegratedWithdrawalOp;
  [WalletApiOperation.AcceptManualWithdrawal]: AcceptManualWithdrawalOp;
  [WalletApiOperation.ListExchanges]: ListExchangesOp;
  [WalletApiOperation.AddExchange]: AddExchangeOp;
  [WalletApiOperation.SetExchangeTosAccepted]: SetExchangeTosAcceptedOp;
  [WalletApiOperation.GetExchangeTos]: GetExchangeTosOp;
  [WalletApiOperation.TrackDepositGroup]: TrackDepositGroupOp;
  [WalletApiOperation.CreateDepositGroup]: CreateDepositGroupOp;
  [WalletApiOperation.SetWalletDeviceId]: SetWalletDeviceIdOp;
  [WalletApiOperation.ExportBackupPlain]: ExportBackupPlainOp;
  [WalletApiOperation.ExportBackupRecovery]: ExportBackupRecoveryOp;
  [WalletApiOperation.ImportBackupRecovery]: ImportBackupRecoveryOp;
  [WalletApiOperation.RunBackupCycle]: RunBackupCycleOp;
  [WalletApiOperation.AddBackupProvider]: AddBackupProviderOp;
  [WalletApiOperation.GetBackupInfo]: GetBackupInfoOp;
  [WalletApiOperation.RunIntegrationTest]: RunIntegrationTestOp;
  [WalletApiOperation.WithdrawTestBalance]: WithdrawTestBalanceOp;
  [WalletApiOperation.TestPay]: TestPayOp;
  [WalletApiOperation.ExportDb]: ExportDbOp;
  [WalletApiOperation.InitiatePeerPushPayment]: InitiatePeerPushPaymentOp;
  [WalletApiOperation.CheckPeerPushPayment]: CheckPeerPushPaymentOp;
  [WalletApiOperation.AcceptPeerPushPayment]: AcceptPeerPushPaymentOp;
  [WalletApiOperation.InitiatePeerPullPayment]: InitiatePeerPullPaymentOp;
  [WalletApiOperation.CheckPeerPullPayment]: CheckPeerPullPaymentOp;
  [WalletApiOperation.AcceptPeerPullPayment]: AcceptPeerPullPaymentOp;
  [WalletApiOperation.ClearDb]: ClearDbOp;
  [WalletApiOperation.Recycle]: RecycleOp;
};

export type RequestType<
  Op extends WalletApiOperation & keyof WalletOperations,
> = WalletOperations[Op] extends { request: infer T } ? T : never;

export type ResponseType<
  Op extends WalletApiOperation & keyof WalletOperations,
> = WalletOperations[Op] extends { response: infer T } ? T : never;

export interface WalletCoreApiClient {
  call<Op extends WalletApiOperation & keyof WalletOperations>(
    operation: Op,
    payload: RequestType<Op>,
  ): Promise<ResponseType<Op>>;
}
