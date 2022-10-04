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
import { PendingOperationsResponse } from "./pending-types.js";

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

/**
 * Initialize wallet-core.
 *
 * Must be the first message sent before any other operations.
 */
export type InitWalletOp = {
  op: WalletApiOperation.InitWallet;
  request: {};
  response: {};
};

export type WithdrawFakebankOp = {
  op: WalletApiOperation.WithdrawFakebank;
  request: WithdrawFakebankRequest;
  response: {};
};

export type PreparePayForUriOp = {
  op: WalletApiOperation.PreparePayForUri;
  request: PreparePayRequest;
  response: PreparePayResult;
};

export type WithdrawTestkudosOp = {
  op: WalletApiOperation.WithdrawTestkudos;
  request: {};
  response: {};
};

export type ConfirmPayOp = {
  op: WalletApiOperation.ConfirmPay;
  request: ConfirmPayRequest;
  response: ConfirmPayResult;
};

export type AbortPayWithRefundOp = {
  request: AbortPayWithRefundRequest;
  response: {};
};

export type GetBalancesOp = {
  request: {};
  response: BalancesResponse;
};

export type GetTransactionsOp = {
  request: TransactionsRequest;
  response: TransactionsResponse;
};

export type GetPendingOperationsOp = {
  request: {};
  response: PendingOperationsResponse;
};

export type DumpCoinsOp = {
  request: {};
  response: CoinDumpJson;
};

export type SetCoinSuspendedOp = {
  request: SetCoinSuspendedRequest;
  response: {};
};

export type ForceRefreshOp = {
  request: ForceRefreshRequest;
  response: {};
};

export type DeleteTransactionOp = {
  request: DeleteTransactionRequest;
  response: {};
};

export type RetryTransactionOp = {
  request: RetryTransactionRequest;
  response: {};
};

export type PrepareTipOp = {
  request: PrepareTipRequest;
  response: PrepareTipResult;
};

export type AcceptTipOp = {
  request: AcceptTipRequest;
  response: {};
};

export type ApplyRefundOp = {
  request: ApplyRefundRequest;
  response: ApplyRefundResponse;
};

export type ListCurrenciesOp = {
  request: {};
  response: WalletCurrencyInfo;
};

export type GetWithdrawalDetailsForAmountOp = {
  request: GetWithdrawalDetailsForAmountRequest;
  response: ManualWithdrawalDetails;
};

export type GetWithdrawalDetailsForUriOp = {
  request: GetWithdrawalDetailsForUriRequest;
  response: WithdrawUriInfoResponse;
};

export type AcceptBankIntegratedWithdrawalOp = {
  request: AcceptBankIntegratedWithdrawalRequest;
  response: AcceptWithdrawalResponse;
};

export type AcceptManualWithdrawalOp = {
  request: AcceptManualWithdrawalRequest;
  response: AcceptManualWithdrawalResult;
};

export type ListExchangesOp = {
  request: {};
  response: ExchangesListResponse;
};

export type AddExchangeOp = {
  request: AddExchangeRequest;
  response: {};
};

export type SetExchangeTosAcceptedOp = {
  request: AcceptExchangeTosRequest;
  response: {};
};

export type GetExchangeTosOp = {
  request: GetExchangeTosRequest;
  response: GetExchangeTosResult;
};

export type TrackDepositGroupOp = {
  request: TrackDepositGroupRequest;
  response: TrackDepositGroupResponse;
};

export type CreateDepositGroupOp = {
  request: CreateDepositGroupRequest;
  response: CreateDepositGroupResponse;
};

export type SetWalletDeviceIdOp = {
  request: SetWalletDeviceIdRequest;
  response: {};
};

export type ExportBackupPlainOp = {
  request: {};
  response: WalletBackupContentV1;
};

export type ExportBackupRecoveryOp = {
  request: {};
  response: BackupRecovery;
};

export type ImportBackupRecoveryOp = {
  request: RecoveryLoadRequest;
  response: {};
};

export type RunBackupCycleOp = {
  request: {};
  response: {};
};

export type AddBackupProviderOp = {
  request: AddBackupProviderRequest;
  response: {};
};

export type GetBackupInfoOp = {
  request: {};
  response: BackupInfo;
};

export type RunIntegrationTestOp = {
  request: IntegrationTestArgs;
  response: {};
};

export type WithdrawTestBalanceOp = {
  request: WithdrawTestBalanceRequest;
  response: {};
};

export type TestPayOp = {
  request: TestPayArgs;
  response: TestPayResult;
};

export type ExportDbOp = {
  request: {};
  response: any;
};

export type InitiatePeerPushPaymentOp = {
  request: InitiatePeerPushPaymentRequest;
  response: InitiatePeerPushPaymentResponse;
};

export type CheckPeerPushPaymentOp = {
  request: CheckPeerPushPaymentRequest;
  response: CheckPeerPushPaymentResponse;
};

export type AcceptPeerPushPaymentOp = {
  request: AcceptPeerPushPaymentRequest;
  response: {};
};

export type InitiatePeerPullPaymentOp = {
  request: InitiatePeerPullPaymentRequest;
  response: InitiatePeerPullPaymentResponse;
};

export type CheckPeerPullPaymentOp = {
  request: CheckPeerPullPaymentRequest;
  response: CheckPeerPullPaymentResponse;
};

export type AcceptPeerPullPaymentOp = {
  request: AcceptPeerPullPaymentRequest;
  response: {};
};

export type ClearDbOp = {
  request: {};
  response: {};
};

export type RecycleOp = {
  request: {};
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
  [WalletApiOperation.GetPendingOperations]: GetPendingOperationsOp;
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
