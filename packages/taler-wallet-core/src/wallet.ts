/*
 This file is part of GNU Taler
 (C) 2015-2019 GNUnet e.V.

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
 * High-level wallet operations that should be indepentent from the underlying
 * browser extension interface.
 */

/**
 * Imports.
 */
import {
  AcceptBankIntegratedWithdrawalRequest,
  AcceptExchangeTosRequest,
  AcceptManualWithdrawalRequest,
  AcceptTipRequest,
  AddExchangeRequest,
  ApplyRefundRequest,
  BackupRecovery,
  codecForAny,
  codecForDeleteTransactionRequest,
  codecForRetryTransactionRequest,
  codecForSetWalletDeviceIdRequest,
  ConfirmPayRequest,
  DeleteTransactionRequest,
  durationFromSpec,
  durationMin,
  ForceRefreshRequest,
  getDurationRemaining,
  GetExchangeTosRequest,
  GetWithdrawalDetailsForAmountRequest,
  GetWithdrawalDetailsForUriRequest,
  isTimestampExpired,
  j2s,
  PreparePayRequest,
  PrepareTipRequest,
  RetryTransactionRequest,
  SetCoinSuspendedRequest,
  SetWalletDeviceIdRequest,
  TalerErrorCode,
  Timestamp,
  timestampMin,
  WalletBackupContentV1,
  WalletCurrencyInfo,
} from "@gnu-taler/taler-util";
import {
  addBackupProvider,
  AddBackupProviderRequest,
  BackupInfo,
  codecForAddBackupProviderRequest,
  getBackupInfo,
  getBackupRecovery,
  loadBackupRecovery,
  runBackupCycle,
} from "./operations/backup";
import { exportBackup } from "./operations/backup/export";
import { getBalances } from "./operations/balance";
import {
  createDepositGroup,
  processDepositGroup,
  trackDepositGroup,
} from "./operations/deposits";
import {
  makeErrorDetails,
  OperationFailedAndReportedError,
  OperationFailedError,
} from "./operations/errors";
import {
  acceptExchangeTermsOfService,
  getExchangeDetails,
  updateExchangeFromUrl,
} from "./operations/exchanges";
import {
  confirmPay,
  preparePayForUri,
  processDownloadProposal,
  processPurchasePay,
} from "./operations/pay";
import { getPendingOperations } from "./operations/pending";
import { processRecoupGroup } from "./operations/recoup";
import {
  autoRefresh,
  createRefreshGroup,
  processRefreshGroup,
} from "./operations/refresh";
import {
  abortFailedPayWithRefund,
  applyRefund,
  processPurchaseQueryRefund,
} from "./operations/refund";
import {
  createReserve,
  createTalerWithdrawReserve,
  getFundingPaytoUris,
  processReserve,
} from "./operations/reserves";
import { InternalWalletState } from "./operations/state";
import {
  runIntegrationTest,
  testPay,
  withdrawTestBalance,
} from "./operations/testing";
import { acceptTip, prepareTip, processTip } from "./operations/tip";
import {
  deleteTransaction,
  getTransactions,
  retryTransaction,
} from "./operations/transactions";
import {
  getExchangeWithdrawalInfo,
  getWithdrawalDetailsForUri,
  processWithdrawGroup,
} from "./operations/withdraw";
import {
  AuditorTrustRecord,
  CoinSourceType,
  ReserveRecordStatus,
} from "./db.js";
import { NotificationType } from "@gnu-taler/taler-util";
import {
  PendingOperationInfo,
  PendingOperationsResponse,
  PendingOperationType,
} from "./pending-types.js";
import { CoinDumpJson } from "@gnu-taler/taler-util";
import {
  codecForTransactionsRequest,
  TransactionsRequest,
  TransactionsResponse,
} from "@gnu-taler/taler-util";
import {
  AcceptManualWithdrawalResult,
  AcceptWithdrawalResponse,
  ApplyRefundResponse,
  BalancesResponse,
  codecForAbortPayWithRefundRequest,
  codecForAcceptBankIntegratedWithdrawalRequest,
  codecForAcceptExchangeTosRequest,
  codecForAcceptManualWithdrawalRequet,
  codecForAcceptTipRequest,
  codecForAddExchangeRequest,
  codecForApplyRefundRequest,
  codecForConfirmPayRequest,
  codecForCreateDepositGroupRequest,
  codecForForceRefreshRequest,
  codecForGetExchangeTosRequest,
  codecForGetWithdrawalDetailsForAmountRequest,
  codecForGetWithdrawalDetailsForUri,
  codecForIntegrationTestArgs,
  codecForPreparePayRequest,
  codecForPrepareTipRequest,
  codecForSetCoinSuspendedRequest,
  codecForTestPayArgs,
  codecForTrackDepositGroupRequest,
  codecForWithdrawTestBalance,
  ConfirmPayResult,
  CoreApiResponse,
  CreateDepositGroupRequest,
  CreateDepositGroupResponse,
  ExchangeListItem,
  ExchangesListRespose,
  GetExchangeTosResult,
  ManualWithdrawalDetails,
  PreparePayResult,
  PrepareTipResult,
  RecoveryLoadRequest,
  RefreshReason,
  TrackDepositGroupRequest,
  TrackDepositGroupResponse,
  WithdrawUriInfoResponse,
} from "@gnu-taler/taler-util";
import { AmountJson, Amounts } from "@gnu-taler/taler-util";
import { assertUnreachable } from "./util/assertUnreachable";
import { Logger } from "@gnu-taler/taler-util";
import { setWalletDeviceId } from "./operations/backup/state.js";
import { WalletCoreApiClient } from "./wallet-api-types.js";

const builtinAuditors: AuditorTrustRecord[] = [
  {
    currency: "KUDOS",
    auditorPub: "BW9DC48PHQY4NH011SHHX36DZZ3Q22Y6X7FZ1VD1CMZ2PTFZ6PN0",
    auditorBaseUrl: "https://auditor.demo.taler.net/",
    uids: ["5P25XF8TVQP9AW6VYGY2KV47WT5Y3ZXFSJAA570GJPX5SVJXKBVG"],
  },
];

const logger = new Logger("wallet.ts");

async function getWithdrawalDetailsForAmount(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  amount: AmountJson,
): Promise<ManualWithdrawalDetails> {
  const wi = await getExchangeWithdrawalInfo(ws, exchangeBaseUrl, amount);
  const paytoUris = wi.exchangeDetails.wireInfo.accounts.map(
    (x) => x.payto_uri,
  );
  if (!paytoUris) {
    throw Error("exchange is in invalid state");
  }
  return {
    amountRaw: Amounts.stringify(amount),
    amountEffective: Amounts.stringify(wi.selectedDenoms.totalCoinValue),
    paytoUris,
    tosAccepted: wi.termsOfServiceAccepted,
  };
}

/**
 * Execute one operation based on the pending operation info record.
 */
async function processOnePendingOperation(
  ws: InternalWalletState,
  pending: PendingOperationInfo,
  forceNow = false,
): Promise<void> {
  logger.trace(`running pending ${JSON.stringify(pending, undefined, 2)}`);
  switch (pending.type) {
    case PendingOperationType.ExchangeUpdate:
      await updateExchangeFromUrl(ws, pending.exchangeBaseUrl, forceNow);
      break;
    case PendingOperationType.Refresh:
      await processRefreshGroup(ws, pending.refreshGroupId, forceNow);
      break;
    case PendingOperationType.Reserve:
      await processReserve(ws, pending.reservePub, forceNow);
      break;
    case PendingOperationType.Withdraw:
      await processWithdrawGroup(ws, pending.withdrawalGroupId, forceNow);
      break;
    case PendingOperationType.ProposalDownload:
      await processDownloadProposal(ws, pending.proposalId, forceNow);
      break;
    case PendingOperationType.TipPickup:
      await processTip(ws, pending.tipId, forceNow);
      break;
    case PendingOperationType.Pay:
      await processPurchasePay(ws, pending.proposalId, forceNow);
      break;
    case PendingOperationType.RefundQuery:
      await processPurchaseQueryRefund(ws, pending.proposalId, forceNow);
      break;
    case PendingOperationType.Recoup:
      await processRecoupGroup(ws, pending.recoupGroupId, forceNow);
      break;
    case PendingOperationType.ExchangeCheckRefresh:
      await autoRefresh(ws, pending.exchangeBaseUrl);
      break;
    case PendingOperationType.Deposit:
      await processDepositGroup(ws, pending.depositGroupId);
      break;
    default:
      assertUnreachable(pending);
  }
}

/**
 * Process pending operations.
 */
export async function runPending(
  ws: InternalWalletState,
  forceNow = false,
): Promise<void> {
  const pendingOpsResponse = await getPendingOperations(ws);
  for (const p of pendingOpsResponse.pendingOperations) {
    if (!forceNow && !isTimestampExpired(p.timestampDue)) {
      continue;
    }
    try {
      await processOnePendingOperation(ws, p, forceNow);
    } catch (e) {
      if (e instanceof OperationFailedAndReportedError) {
        console.error(
          "Operation failed:",
          JSON.stringify(e.operationError, undefined, 2),
        );
      } else {
        console.error(e);
      }
    }
  }
}

/**
 * Run the wallet until there are no more pending operations that give
 * liveness left.  The wallet will be in a stopped state when this function
 * returns without resolving to an exception.
 */
export async function runUntilDone(
  ws: InternalWalletState,
  req: {
    maxRetries?: number;
  } = {},
): Promise<void> {
  let done = false;
  const p = new Promise<void>((resolve, reject) => {
    // Monitor for conditions that means we're done or we
    // should quit with an error (due to exceeded retries).
    ws.addNotificationListener((n) => {
      if (done) {
        return;
      }
      if (
        n.type === NotificationType.WaitingForRetry &&
        n.numGivingLiveness == 0
      ) {
        done = true;
        logger.trace("no liveness-giving operations left");
        resolve();
      }
      const maxRetries = req.maxRetries;
      if (!maxRetries) {
        return;
      }
      getPendingOperations(ws)
        .then((pending) => {
          for (const p of pending.pendingOperations) {
            if (p.retryInfo && p.retryInfo.retryCounter > maxRetries) {
              console.warn(
                `stopping, as ${maxRetries} retries are exceeded in an operation of type ${p.type}`,
              );
              ws.stop();
              done = true;
              resolve();
            }
          }
        })
        .catch((e) => {
          logger.error(e);
          reject(e);
        });
    });
    // Run this asynchronously
    runRetryLoop(ws).catch((e) => {
      logger.error("exception in wallet retry loop");
      reject(e);
    });
  });
  await p;
}

/**
 * Process pending operations and wait for scheduled operations in
 * a loop until the wallet is stopped explicitly.
 */
export async function runRetryLoop(ws: InternalWalletState): Promise<void> {
  // Make sure we only run one main loop at a time.
  return ws.memoRunRetryLoop.memo(async () => {
    try {
      await runRetryLoopImpl(ws);
    } catch (e) {
      console.error("error during retry loop execution", e);
      throw e;
    }
  });
}

async function runRetryLoopImpl(ws: InternalWalletState): Promise<void> {
  for (let iteration = 0; !ws.stopped; iteration++) {
    const pending = await getPendingOperations(ws);
    logger.trace(`pending operations: ${j2s(pending)}`);
    let numGivingLiveness = 0;
    let numDue = 0;
    let minDue: Timestamp = { t_ms: "never" };
    for (const p of pending.pendingOperations) {
      minDue = timestampMin(minDue, p.timestampDue);
      if (isTimestampExpired(p.timestampDue)) {
        numDue++;
      }
      if (p.givesLifeness) {
        numGivingLiveness++;
      }
    }
    // Make sure that we run tasks that don't give lifeness at least
    // one time.
    if (iteration !== 0 && numDue === 0) {
      // We've executed pending, due operations at least one.
      // Now we don't have any more operations available,
      // and need to wait.

      // Wait for at most 5 seconds to the next check.
      const dt = durationMin(
        durationFromSpec({
          seconds: 5,
        }),
        getDurationRemaining(minDue),
      );
      logger.trace(`waiting for at most ${dt.d_ms} ms`);
      const timeout = ws.timerGroup.resolveAfter(dt);
      ws.notify({
        type: NotificationType.WaitingForRetry,
        numGivingLiveness,
        numPending: pending.pendingOperations.length,
      });
      // Wait until either the timeout, or we are notified (via the latch)
      // that more work might be available.
      await Promise.race([timeout, ws.latch.wait()]);
    } else {
      logger.trace(
        `running ${pending.pendingOperations.length} pending operations`,
      );
      for (const p of pending.pendingOperations) {
        if (!isTimestampExpired(p.timestampDue)) {
          continue;
        }
        try {
          await processOnePendingOperation(ws, p);
        } catch (e) {
          if (e instanceof OperationFailedAndReportedError) {
            logger.warn("operation processed resulted in reported error");
          } else {
            logger.error("Uncaught exception", e);
            ws.notify({
              type: NotificationType.InternalError,
              message: "uncaught exception",
              exception: e,
            });
          }
        }
        ws.notify({
          type: NotificationType.PendingOperationProcessed,
        });
      }
    }
  }
  logger.trace("exiting wallet retry loop");
}

/**
 * Insert the hard-coded defaults for exchanges, coins and
 * auditors into the database, unless these defaults have
 * already been applied.
 */
async function fillDefaults(ws: InternalWalletState): Promise<void> {
  await ws.db
    .mktx((x) => ({ config: x.config, auditorTrustStore: x.auditorTrust }))
    .runReadWrite(async (tx) => {
      let applied = false;
      await tx.config.iter().forEach((x) => {
        if (x.key == "currencyDefaultsApplied" && x.value == true) {
          applied = true;
        }
      });
      if (!applied) {
        for (const c of builtinAuditors) {
          await tx.auditorTrustStore.put(c);
        }
      }
    });
}

/**
 * Create a reserve, but do not flag it as confirmed yet.
 *
 * Adds the corresponding exchange as a trusted exchange if it is neither
 * audited nor trusted already.
 */
async function acceptManualWithdrawal(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  amount: AmountJson,
): Promise<AcceptManualWithdrawalResult> {
  try {
    const resp = await createReserve(ws, {
      amount,
      exchange: exchangeBaseUrl,
    });
    const exchangePaytoUris = await ws.db
      .mktx((x) => ({
        exchanges: x.exchanges,
        exchangeDetails: x.exchangeDetails,
        reserves: x.reserves,
      }))
      .runReadWrite((tx) => getFundingPaytoUris(tx, resp.reservePub));
    return {
      reservePub: resp.reservePub,
      exchangePaytoUris,
    };
  } finally {
    ws.latch.trigger();
  }
}

async function getExchangeTos(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
): Promise<GetExchangeTosResult> {
  const { exchange, exchangeDetails } = await updateExchangeFromUrl(
    ws,
    exchangeBaseUrl,
  );
  const tos = exchangeDetails.termsOfServiceText;
  const currentEtag = exchangeDetails.termsOfServiceLastEtag;
  if (!tos || !currentEtag) {
    throw Error("exchange is in invalid state");
  }
  return {
    acceptedEtag: exchangeDetails.termsOfServiceAcceptedEtag,
    currentEtag,
    tos,
  };
}

async function getExchanges(
  ws: InternalWalletState,
): Promise<ExchangesListRespose> {
  const exchanges: ExchangeListItem[] = [];
  await ws.db
    .mktx((x) => ({
      exchanges: x.exchanges,
      exchangeDetails: x.exchangeDetails,
    }))
    .runReadOnly(async (tx) => {
      const exchangeRecords = await tx.exchanges.iter().toArray();
      for (const r of exchangeRecords) {
        const dp = r.detailsPointer;
        if (!dp) {
          continue;
        }
        const { currency, masterPublicKey } = dp;
        const exchangeDetails = await getExchangeDetails(tx, r.baseUrl);
        if (!exchangeDetails) {
          continue;
        }
        exchanges.push({
          exchangeBaseUrl: r.baseUrl,
          currency,
          paytoUris: exchangeDetails.wireInfo.accounts.map((x) => x.payto_uri),
        });
      }
    });
  return { exchanges };
}

async function acceptWithdrawal(
  ws: InternalWalletState,
  talerWithdrawUri: string,
  selectedExchange: string,
): Promise<AcceptWithdrawalResponse> {
  try {
    return createTalerWithdrawReserve(ws, talerWithdrawUri, selectedExchange);
  } finally {
    ws.latch.trigger();
  }
}

/**
 * Inform the wallet that the status of a reserve has changed (e.g. due to a
 * confirmation from the bank.).
 */
export async function handleNotifyReserve(
  ws: InternalWalletState,
): Promise<void> {
  const reserves = await ws.db
    .mktx((x) => ({
      reserves: x.reserves,
    }))
    .runReadOnly(async (tx) => {
      return tx.reserves.iter().toArray();
    });
  for (const r of reserves) {
    if (r.reserveStatus === ReserveRecordStatus.WAIT_CONFIRM_BANK) {
      try {
        processReserve(ws, r.reservePub);
      } catch (e) {
        console.error(e);
      }
    }
  }
}

async function setCoinSuspended(
  ws: InternalWalletState,
  coinPub: string,
  suspended: boolean,
): Promise<void> {
  await ws.db
    .mktx((x) => ({
      coins: x.coins,
    }))
    .runReadWrite(async (tx) => {
      const c = await tx.coins.get(coinPub);
      if (!c) {
        logger.warn(`coin ${coinPub} not found, won't suspend`);
        return;
      }
      c.suspended = suspended;
      await tx.coins.put(c);
    });
}

/**
 * Dump the public information of coins we have in an easy-to-process format.
 */
async function dumpCoins(ws: InternalWalletState): Promise<CoinDumpJson> {
  const coinsJson: CoinDumpJson = { coins: [] };
  await ws.db
    .mktx((x) => ({
      coins: x.coins,
      denominations: x.denominations,
      withdrawalGroups: x.withdrawalGroups,
    }))
    .runReadOnly(async (tx) => {
      const coins = await tx.coins.iter().toArray();
      for (const c of coins) {
        const denom = await tx.denominations.get([
          c.exchangeBaseUrl,
          c.denomPubHash,
        ]);
        if (!denom) {
          console.error("no denom session found for coin");
          continue;
        }
        const cs = c.coinSource;
        let refreshParentCoinPub: string | undefined;
        if (cs.type == CoinSourceType.Refresh) {
          refreshParentCoinPub = cs.oldCoinPub;
        }
        let withdrawalReservePub: string | undefined;
        if (cs.type == CoinSourceType.Withdraw) {
          const ws = await tx.withdrawalGroups.get(cs.withdrawalGroupId);
          if (!ws) {
            console.error("no withdrawal session found for coin");
            continue;
          }
          withdrawalReservePub = ws.reservePub;
        }
        coinsJson.coins.push({
          coin_pub: c.coinPub,
          denom_pub: c.denomPub,
          denom_pub_hash: c.denomPubHash,
          denom_value: Amounts.stringify(denom.value),
          exchange_base_url: c.exchangeBaseUrl,
          refresh_parent_coin_pub: refreshParentCoinPub,
          remaining_value: Amounts.stringify(c.currentAmount),
          withdrawal_reserve_pub: withdrawalReservePub,
          coin_suspended: c.suspended,
        });
      }
    });
  return coinsJson;
}


/**
 * Get an API client from an internal wallet state object.
 */
export async function getClientFromWalletState(
  ws: InternalWalletState,
): Promise<WalletCoreApiClient> {
  let id = 0;
  const client: WalletCoreApiClient = {
    async call(op, payload): Promise<any> {
      const res = await handleCoreApiRequest(ws, op, `${id++}`, payload);
      switch (res.type) {
        case "error":
          throw new OperationFailedError(res.error);
        case "response":
          return res.result;
      }
    },
  };
  return client;
}

/**
 * Implementation of the "wallet-core" API.
 */
async function dispatchRequestInternal(
  ws: InternalWalletState,
  operation: string,
  payload: unknown,
): Promise<Record<string, any>> {
  if (ws.initCalled && operation !== "initWallet") {
    throw Error(
      `wallet must be initialized before running operation ${operation}`,
    );
  }
  switch (operation) {
    case "initWallet": {
      ws.initCalled = true;
      return {};
    }
    case "withdrawTestkudos": {
      await withdrawTestBalance(
        ws,
        "TESTKUDOS:10",
        "https://bank.test.taler.net/",
        "https://exchange.test.taler.net/",
      );
      return {};
    }
    case "withdrawTestBalance": {
      const req = codecForWithdrawTestBalance().decode(payload);
      await withdrawTestBalance(
        ws,
        req.amount,
        req.bankBaseUrl,
        req.exchangeBaseUrl,
      );
      return {};
    }
    case "runIntegrationTest": {
      const req = codecForIntegrationTestArgs().decode(payload);
      await runIntegrationTest(ws, req);
      return {};
    }
    case "testPay": {
      const req = codecForTestPayArgs().decode(payload);
      await testPay(ws, req);
      return {};
    }
    case "getTransactions": {
      const req = codecForTransactionsRequest().decode(payload);
      return await getTransactions(ws, req);
    }
    case "addExchange": {
      const req = codecForAddExchangeRequest().decode(payload);
      await updateExchangeFromUrl(ws, req.exchangeBaseUrl, req.forceUpdate);
      return {};
    }
    case "listExchanges": {
      return await getExchanges(ws);
    }
    case "getWithdrawalDetailsForUri": {
      const req = codecForGetWithdrawalDetailsForUri().decode(payload);
      return await getWithdrawalDetailsForUri(ws, req.talerWithdrawUri);
    }
    case "acceptManualWithdrawal": {
      const req = codecForAcceptManualWithdrawalRequet().decode(payload);
      const res = await acceptManualWithdrawal(
        ws,
        req.exchangeBaseUrl,
        Amounts.parseOrThrow(req.amount),
      );
      return res;
    }
    case "getWithdrawalDetailsForAmount": {
      const req = codecForGetWithdrawalDetailsForAmountRequest().decode(
        payload,
      );
      return await getWithdrawalDetailsForAmount(
        ws,
        req.exchangeBaseUrl,
        Amounts.parseOrThrow(req.amount),
      );
    }
    case "getBalances": {
      return await getBalances(ws);
    }
    case "getPendingOperations": {
      return await getPendingOperations(ws);
    }
    case "setExchangeTosAccepted": {
      const req = codecForAcceptExchangeTosRequest().decode(payload);
      await acceptExchangeTermsOfService(ws, req.exchangeBaseUrl, req.etag);
      return {};
    }
    case "applyRefund": {
      const req = codecForApplyRefundRequest().decode(payload);
      return await applyRefund(ws, req.talerRefundUri);
    }
    case "acceptBankIntegratedWithdrawal": {
      const req = codecForAcceptBankIntegratedWithdrawalRequest().decode(
        payload,
      );
      return await acceptWithdrawal(
        ws,
        req.talerWithdrawUri,
        req.exchangeBaseUrl,
      );
    }
    case "getExchangeTos": {
      const req = codecForGetExchangeTosRequest().decode(payload);
      return getExchangeTos(ws, req.exchangeBaseUrl);
    }
    case "retryPendingNow": {
      await runPending(ws, true);
      return {};
    }
    // FIXME: Deprecate one of the aliases!
    case "preparePayForUri":
    case "preparePay": {
      const req = codecForPreparePayRequest().decode(payload);
      return await preparePayForUri(ws, req.talerPayUri);
    }
    case "confirmPay": {
      const req = codecForConfirmPayRequest().decode(payload);
      return await confirmPay(ws, req.proposalId, req.sessionId);
    }
    case "abortFailedPayWithRefund": {
      const req = codecForAbortPayWithRefundRequest().decode(payload);
      await abortFailedPayWithRefund(ws, req.proposalId);
      return {};
    }
    case "dumpCoins": {
      return await dumpCoins(ws);
    }
    case "setCoinSuspended": {
      const req = codecForSetCoinSuspendedRequest().decode(payload);
      await setCoinSuspended(ws, req.coinPub, req.suspended);
      return {};
    }
    case "forceRefresh": {
      const req = codecForForceRefreshRequest().decode(payload);
      const coinPubs = req.coinPubList.map((x) => ({ coinPub: x }));
      const refreshGroupId = await ws.db
        .mktx((x) => ({
          refreshGroups: x.refreshGroups,
          denominations: x.denominations,
          coins: x.coins,
        }))
        .runReadWrite(async (tx) => {
          return await createRefreshGroup(
            ws,
            tx,
            coinPubs,
            RefreshReason.Manual,
          );
        });
      processRefreshGroup(ws, refreshGroupId.refreshGroupId, true).catch(
        (x) => {
          logger.error(x);
        },
      );
      return {
        refreshGroupId,
      };
    }
    case "prepareTip": {
      const req = codecForPrepareTipRequest().decode(payload);
      return await prepareTip(ws, req.talerTipUri);
    }
    case "acceptTip": {
      const req = codecForAcceptTipRequest().decode(payload);
      await acceptTip(ws, req.walletTipId);
      return {};
    }
    case "exportBackupPlain": {
      return exportBackup(ws);
    }
    case "addBackupProvider": {
      const req = codecForAddBackupProviderRequest().decode(payload);
      await addBackupProvider(ws, req);
      return {};
    }
    case "runBackupCycle": {
      await runBackupCycle(ws);
      return {};
    }
    case "exportBackupRecovery": {
      const resp = await getBackupRecovery(ws);
      return resp;
    }
    case "importBackupRecovery": {
      const req = codecForAny().decode(payload);
      await loadBackupRecovery(ws, req);
      return {};
    }
    case "getBackupInfo": {
      const resp = await getBackupInfo(ws);
      return resp;
    }
    case "createDepositGroup": {
      const req = codecForCreateDepositGroupRequest().decode(payload);
      return await createDepositGroup(ws, req);
    }
    case "trackDepositGroup": {
      const req = codecForTrackDepositGroupRequest().decode(payload);
      return trackDepositGroup(ws, req);
    }
    case "deleteTransaction": {
      const req = codecForDeleteTransactionRequest().decode(payload);
      await deleteTransaction(ws, req.transactionId);
      return {};
    }
    case "retryTransaction": {
      const req = codecForRetryTransactionRequest().decode(payload);
      await retryTransaction(ws, req.transactionId);
      return {};
    }
    case "setWalletDeviceId": {
      const req = codecForSetWalletDeviceIdRequest().decode(payload);
      await setWalletDeviceId(ws, req.walletDeviceId);
      return {};
    }
    case "listCurrencies": {
      return await ws.db
        .mktx((x) => ({
          auditorTrust: x.auditorTrust,
          exchangeTrust: x.exchangeTrust,
        }))
        .runReadOnly(async (tx) => {
          const trustedAuditors = await tx.auditorTrust.iter().toArray();
          const trustedExchanges = await tx.exchangeTrust.iter().toArray();
          return {
            trustedAuditors: trustedAuditors.map((x) => ({
              currency: x.currency,
              auditorBaseUrl: x.auditorBaseUrl,
              auditorPub: x.auditorPub,
            })),
            trustedExchanges: trustedExchanges.map((x) => ({
              currency: x.currency,
              exchangeBaseUrl: x.exchangeBaseUrl,
              exchangeMasterPub: x.exchangeMasterPub,
            })),
          };
        });
    }
  }
  throw OperationFailedError.fromCode(
    TalerErrorCode.WALLET_CORE_API_OPERATION_UNKNOWN,
    "unknown operation",
    {
      operation,
    },
  );
}

/**
 * Handle a request to the wallet-core API.
 */
export async function handleCoreApiRequest(
  ws: InternalWalletState,
  operation: string,
  id: string,
  payload: unknown,
): Promise<CoreApiResponse> {
  try {
    const result = await dispatchRequestInternal(ws, operation, payload);
    return {
      type: "response",
      operation,
      id,
      result,
    };
  } catch (e) {
    if (
      e instanceof OperationFailedError ||
      e instanceof OperationFailedAndReportedError
    ) {
      return {
        type: "error",
        operation,
        id,
        error: e.operationError,
      };
    } else {
      return {
        type: "error",
        operation,
        id,
        error: makeErrorDetails(
          TalerErrorCode.WALLET_UNEXPECTED_EXCEPTION,
          `unexpected exception: ${e}`,
          {},
        ),
      };
    }
  }
}
