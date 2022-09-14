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
  AbsoluteTime,
  AmountJson,
  Amounts,
  BalancesResponse,
  codecForAbortPayWithRefundRequest,
  codecForAcceptBankIntegratedWithdrawalRequest,
  codecForAcceptExchangeTosRequest,
  codecForAcceptManualWithdrawalRequet,
  codecForAcceptPeerPullPaymentRequest,
  codecForAcceptPeerPushPaymentRequest,
  codecForAcceptTipRequest,
  codecForAddExchangeRequest,
  codecForAny,
  codecForApplyRefundFromPurchaseIdRequest,
  codecForApplyRefundRequest,
  codecForCheckPeerPullPaymentRequest,
  codecForCheckPeerPushPaymentRequest,
  codecForConfirmPayRequest,
  codecForCreateDepositGroupRequest,
  codecForDeleteTransactionRequest,
  codecForForceRefreshRequest,
  codecForGetContractTermsDetails,
  codecForGetExchangeTosRequest,
  codecForGetExchangeWithdrawalInfo,
  codecForGetFeeForDeposit,
  codecForGetWithdrawalDetailsForAmountRequest,
  codecForGetWithdrawalDetailsForUri,
  codecForImportDbRequest,
  codecForInitiatePeerPullPaymentRequest,
  codecForInitiatePeerPushPaymentRequest,
  codecForIntegrationTestArgs,
  codecForListKnownBankAccounts,
  codecForPrepareDepositRequest,
  codecForPreparePayRequest,
  codecForPrepareRefundRequest,
  codecForPrepareTipRequest,
  codecForRetryTransactionRequest,
  codecForSetCoinSuspendedRequest,
  codecForSetWalletDeviceIdRequest,
  codecForTestPayArgs,
  codecForTrackDepositGroupRequest,
  codecForTransactionsRequest,
  codecForWithdrawFakebankRequest,
  codecForWithdrawTestBalance,
  CoinDumpJson,
  CoreApiResponse,
  Duration,
  durationFromSpec,
  durationMin,
  ExchangeFullDetails,
  ExchangesListResponse,
  GetExchangeTosResult,
  j2s,
  KnownBankAccounts,
  Logger,
  ManualWithdrawalDetails,
  NotificationType,
  parsePaytoUri,
  PaytoUri,
  RefreshReason,
  TalerErrorCode,
  URL,
  WalletNotification,
  WalletCoreVersion,
  ExchangeListItem,
  OperationMap,
  FeeDescription,
  TalerErrorDetail,
} from "@gnu-taler/taler-util";
import { TalerCryptoInterface } from "./crypto/cryptoImplementation.js";
import {
  CryptoDispatcher,
  CryptoWorkerFactory,
} from "./crypto/workers/cryptoDispatcher.js";
import {
  AuditorTrustRecord,
  CoinRecord,
  CoinSourceType,
  CoinStatus,
  exportDb,
  importDb,
  OperationAttemptResult,
  OperationAttemptResultType,
  WalletStoresV1,
} from "./db.js";
import {
  getErrorDetailFromException,
  makeErrorDetail,
  TalerError,
} from "./errors.js";
import { createDenominationTimeline } from "./index.browser.js";
import {
  DenomInfo,
  ExchangeOperations,
  InternalWalletState,
  MerchantInfo,
  MerchantOperations,
  NotificationListener,
  RecoupOperations,
} from "./internal-wallet-state.js";
import { exportBackup } from "./operations/backup/export.js";
import {
  addBackupProvider,
  codecForAddBackupProviderRequest,
  codecForRemoveBackupProvider,
  codecForRunBackupCycle,
  getBackupInfo,
  getBackupRecovery,
  loadBackupRecovery,
  processBackupForProvider,
  removeBackupProvider,
  runBackupCycle,
} from "./operations/backup/index.js";
import { setWalletDeviceId } from "./operations/backup/state.js";
import { getBalances } from "./operations/balance.js";
import {
  createDepositGroup,
  getFeeForDeposit,
  prepareDepositGroup,
  processDepositGroup,
  trackDepositGroup,
} from "./operations/deposits.js";
import {
  acceptExchangeTermsOfService,
  downloadTosFromAcceptedFormat,
  getExchangeDetails,
  getExchangeRequestTimeout,
  getExchangeTrust,
  updateExchangeFromUrl,
  updateExchangeFromUrlHandler,
  updateExchangeTermsOfService,
} from "./operations/exchanges.js";
import { getMerchantInfo } from "./operations/merchants.js";
import {
  confirmPay,
  getContractTermsDetails,
  preparePayForUri,
  processDownloadProposal,
  processPurchasePay,
} from "./operations/pay.js";
import {
  acceptPeerPullPayment,
  acceptPeerPushPayment,
  checkPeerPullPayment,
  checkPeerPushPayment,
  initiatePeerRequestForPay,
  initiatePeerToPeerPush,
} from "./operations/peer-to-peer.js";
import { getPendingOperations } from "./operations/pending.js";
import {
  createRecoupGroup,
  processRecoupGroup,
  processRecoupGroupHandler,
} from "./operations/recoup.js";
import {
  autoRefresh,
  createRefreshGroup,
  processRefreshGroup,
} from "./operations/refresh.js";
import {
  abortFailedPayWithRefund,
  applyRefund,
  applyRefundFromPurchaseId,
  prepareRefund,
  processPurchaseQueryRefund,
} from "./operations/refund.js";
import {
  runIntegrationTest,
  testPay,
  withdrawTestBalance,
} from "./operations/testing.js";
import { acceptTip, prepareTip, processTip } from "./operations/tip.js";
import {
  deleteTransaction,
  getTransactions,
  retryTransaction,
} from "./operations/transactions.js";
import {
  acceptWithdrawalFromUri,
  createManualWithdrawal,
  getExchangeWithdrawalInfo,
  getWithdrawalDetailsForUri,
  processWithdrawalGroup,
} from "./operations/withdraw.js";
import {
  PendingOperationsResponse,
  PendingTaskInfo,
  PendingTaskType,
} from "./pending-types.js";
import { assertUnreachable } from "./util/assertUnreachable.js";
import { AsyncOpMemoMap, AsyncOpMemoSingle } from "./util/asyncMemo.js";
import {
  HttpRequestLibrary,
  readSuccessResponseJsonOrThrow,
} from "./util/http.js";
import { checkDbInvariant } from "./util/invariants.js";
import {
  AsyncCondition,
  OpenedPromise,
  openPromise,
} from "./util/promiseUtils.js";
import { DbAccess, GetReadWriteAccess } from "./util/query.js";
import { RetryInfo, runOperationHandlerForResult } from "./util/retries.js";
import { TimerAPI, TimerGroup } from "./util/timer.js";
import {
  WALLET_BANK_INTEGRATION_PROTOCOL_VERSION,
  WALLET_EXCHANGE_PROTOCOL_VERSION,
  WALLET_MERCHANT_PROTOCOL_VERSION,
} from "./versions.js";
import { WalletCoreApiClient } from "./wallet-api-types.js";

const builtinAuditors: AuditorTrustRecord[] = [
  {
    currency: "KUDOS",
    auditorPub: "BW9DC48PHQY4NH011SHHX36DZZ3Q22Y6X7FZ1VD1CMZ2PTFZ6PN0",
    auditorBaseUrl: "https://auditor.demo.taler.net/",
    uids: ["5P25XF8TVQP9AW6VYGY2KV47WT5Y3ZXFSJAA570GJPX5SVJXKBVG"],
  },
];

const builtinExchanges: string[] = ["https://exchange.demo.taler.net/"];

const logger = new Logger("wallet.ts");

async function getWithdrawalDetailsForAmount(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  amount: AmountJson,
  restrictAge: number | undefined,
): Promise<ManualWithdrawalDetails> {
  const wi = await getExchangeWithdrawalInfo(
    ws,
    exchangeBaseUrl,
    amount,
    restrictAge,
  );
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
 * Call the right handler for a pending operation without doing
 * any special error handling.
 */
async function callOperationHandler(
  ws: InternalWalletState,
  pending: PendingTaskInfo,
  forceNow = false,
): Promise<OperationAttemptResult<unknown, unknown>> {
  switch (pending.type) {
    case PendingTaskType.ExchangeUpdate:
      return await updateExchangeFromUrlHandler(ws, pending.exchangeBaseUrl, {
        forceNow,
      });
    case PendingTaskType.Refresh:
      return await processRefreshGroup(ws, pending.refreshGroupId, {
        forceNow,
      });
    case PendingTaskType.Withdraw:
      return await processWithdrawalGroup(ws, pending.withdrawalGroupId, {
        forceNow,
      });
    case PendingTaskType.ProposalDownload:
      return await processDownloadProposal(ws, pending.proposalId, {
        forceNow,
      });
    case PendingTaskType.TipPickup:
      return await processTip(ws, pending.tipId, { forceNow });
    case PendingTaskType.Pay:
      return await processPurchasePay(ws, pending.proposalId, { forceNow });
    case PendingTaskType.RefundQuery:
      return await processPurchaseQueryRefund(ws, pending.proposalId, {
        forceNow,
      });
    case PendingTaskType.Recoup:
      return await processRecoupGroupHandler(ws, pending.recoupGroupId, {
        forceNow,
      });
    case PendingTaskType.ExchangeCheckRefresh:
      return await autoRefresh(ws, pending.exchangeBaseUrl);
    case PendingTaskType.Deposit: {
      return await processDepositGroup(ws, pending.depositGroupId, {
        forceNow,
      });
    }
    case PendingTaskType.Backup:
      return await processBackupForProvider(ws, pending.backupProviderBaseUrl);
    default:
      return assertUnreachable(pending);
  }
  throw Error(`not reached ${pending.type}`);
}

export async function storeOperationError(
  ws: InternalWalletState,
  pendingTaskId: string,
  e: TalerErrorDetail,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.operationRetries])
    .runReadWrite(async (tx) => {
      let retryRecord = await tx.operationRetries.get(pendingTaskId);
      if (!retryRecord) {
        retryRecord = {
          id: pendingTaskId,
          lastError: e,
          retryInfo: RetryInfo.reset(),
        };
      } else {
        retryRecord.lastError = e;
        retryRecord.retryInfo = RetryInfo.increment(retryRecord.retryInfo);
      }
      await tx.operationRetries.put(retryRecord);
    });
}

export async function storeOperationFinished(
  ws: InternalWalletState,
  pendingTaskId: string,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.operationRetries])
    .runReadWrite(async (tx) => {
      await tx.operationRetries.delete(pendingTaskId);
    });
}

export async function storeOperationPending(
  ws: InternalWalletState,
  pendingTaskId: string,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.operationRetries])
    .runReadWrite(async (tx) => {
      let retryRecord = await tx.operationRetries.get(pendingTaskId);
      if (!retryRecord) {
        retryRecord = {
          id: pendingTaskId,
          retryInfo: RetryInfo.reset(),
        };
      } else {
        delete retryRecord.lastError;
        retryRecord.retryInfo = RetryInfo.increment(retryRecord.retryInfo);
      }
      await tx.operationRetries.put(retryRecord);
    });
}

/**
 * Execute one operation based on the pending operation info record.
 *
 * Store success/failure result in the database.
 */
async function processOnePendingOperation(
  ws: InternalWalletState,
  pending: PendingTaskInfo,
  forceNow = false,
): Promise<void> {
  logger.trace(`running pending ${JSON.stringify(pending, undefined, 2)}`);
  let maybeError: TalerErrorDetail | undefined;
  try {
    const resp = await callOperationHandler(ws, pending, forceNow);
    switch (resp.type) {
      case OperationAttemptResultType.Error:
        return await storeOperationError(ws, pending.id, resp.errorDetail);
      case OperationAttemptResultType.Finished:
        return await storeOperationFinished(ws, pending.id);
      case OperationAttemptResultType.Pending:
        return await storeOperationPending(ws, pending.id);
      case OperationAttemptResultType.Longpoll:
        break;
    }
  } catch (e) {
    if (e instanceof TalerError) {
      logger.warn("operation processed resulted in error");
      logger.warn(`error was: ${j2s(e.errorDetail)}`);
      maybeError = e.errorDetail;
      return await storeOperationError(ws, pending.id, maybeError!);
    } else if (e instanceof Error) {
      // This is a bug, as we expect pending operations to always
      // do their own error handling and only throw WALLET_PENDING_OPERATION_FAILED
      // or return something.
      logger.error(`Uncaught exception: ${e.message}`);
      logger.error(`Stack: ${e.stack}`);
      maybeError = makeErrorDetail(
        TalerErrorCode.WALLET_UNEXPECTED_EXCEPTION,
        {
          stack: e.stack,
        },
        `unexpected exception (message: ${e.message})`,
      );
      return await storeOperationError(ws, pending.id, maybeError);
    } else {
      logger.error("Uncaught exception, value is not even an error.");
      maybeError = makeErrorDetail(
        TalerErrorCode.WALLET_UNEXPECTED_EXCEPTION,
        {},
        `unexpected exception (not even an error)`,
      );
      return await storeOperationError(ws, pending.id, maybeError);
    }
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
    if (!forceNow && !AbsoluteTime.isExpired(p.timestampDue)) {
      continue;
    }
    await processOnePendingOperation(ws, p, forceNow);
  }
}

export interface RetryLoopOpts {
  /**
   * Stop when the number of retries is exceeded for any pending
   * operation.
   */
  maxRetries?: number;

  /**
   * Stop the retry loop when all lifeness-giving pending operations
   * are done.
   *
   * Defaults to false.
   */
  stopWhenDone?: boolean;
}

/**
 * Main retry loop of the wallet.
 *
 * Looks up pending operations from the wallet, runs them, repeat.
 */
async function runTaskLoop(
  ws: InternalWalletState,
  opts: RetryLoopOpts = {},
): Promise<void> {
  for (let iteration = 0; !ws.stopped; iteration++) {
    const pending = await getPendingOperations(ws);
    logger.trace(`pending operations: ${j2s(pending)}`);
    let numGivingLiveness = 0;
    let numDue = 0;
    let minDue: AbsoluteTime = AbsoluteTime.never();

    for (const p of pending.pendingOperations) {
      const maxRetries = opts.maxRetries;

      if (maxRetries && p.retryInfo && p.retryInfo.retryCounter > maxRetries) {
        logger.warn(
          `skipping, as ${maxRetries} retries are exceeded in an operation of type ${p.type}`,
        );
        continue;
      }

      minDue = AbsoluteTime.min(minDue, p.timestampDue);
      if (AbsoluteTime.isExpired(p.timestampDue)) {
        numDue++;
      }
      if (p.givesLifeness) {
        numGivingLiveness++;
      }
    }

    if (opts.stopWhenDone && numGivingLiveness === 0 && iteration !== 0) {
      logger.warn(`stopping, as no pending operations have lifeness`);
      return;
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
        Duration.getRemaining(minDue),
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
        if (!AbsoluteTime.isExpired(p.timestampDue)) {
          continue;
        }
        await processOnePendingOperation(ws, p);
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
    .mktx((x) => [x.config, x.auditorTrust])
    .runReadWrite(async (tx) => {
      let applied = false;
      await tx.config.iter().forEach((x) => {
        if (x.key == "currencyDefaultsApplied" && x.value == true) {
          applied = true;
        }
      });
      if (!applied) {
        for (const c of builtinAuditors) {
          await tx.auditorTrust.put(c);
        }
      }
      // FIXME: make sure exchanges are added transactionally to
      // DB in first-time default application
    });

  for (const url of builtinExchanges) {
    try {
      await updateExchangeFromUrl(ws, url, { forceNow: true });
    } catch (e) {
      logger.warn(
        `could not update builtin exchange ${url} during wallet initialization`,
      );
    }
  }
}

async function getExchangeTos(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  acceptedFormat?: string[],
): Promise<GetExchangeTosResult> {
  // FIXME: download ToS in acceptable format if passed!
  const { exchangeDetails } = await updateExchangeFromUrl(ws, exchangeBaseUrl);
  const content = exchangeDetails.termsOfServiceText;
  const currentEtag = exchangeDetails.termsOfServiceLastEtag;
  const contentType = exchangeDetails.termsOfServiceContentType;
  if (
    content === undefined ||
    currentEtag === undefined ||
    contentType === undefined
  ) {
    throw Error("exchange is in invalid state");
  }
  if (
    acceptedFormat &&
    acceptedFormat.findIndex((f) => f === contentType) !== -1
  ) {
    return {
      acceptedEtag: exchangeDetails.termsOfServiceAcceptedEtag,
      currentEtag,
      content,
      contentType,
    };
  }

  const tosDownload = await downloadTosFromAcceptedFormat(
    ws,
    exchangeBaseUrl,
    getExchangeRequestTimeout(),
    acceptedFormat,
  );

  if (tosDownload.tosContentType === contentType) {
    return {
      acceptedEtag: exchangeDetails.termsOfServiceAcceptedEtag,
      currentEtag,
      content,
      contentType,
    };
  }
  await updateExchangeTermsOfService(ws, exchangeBaseUrl, tosDownload);

  return {
    acceptedEtag: exchangeDetails.termsOfServiceAcceptedEtag,
    currentEtag: tosDownload.tosEtag,
    content: tosDownload.tosText,
    contentType: tosDownload.tosContentType,
  };
}

/**
 * List bank accounts known to the wallet from
 * previous withdrawals.
 */
async function listKnownBankAccounts(
  ws: InternalWalletState,
  currency?: string,
): Promise<KnownBankAccounts> {
  const accounts: { [account: string]: PaytoUri } = {};
  await ws.db
    .mktx((x) => [x.withdrawalGroups])
    .runReadOnly(async (tx) => {
      const withdrawalGroups = await tx.withdrawalGroups.iter().toArray();
      for (const r of withdrawalGroups) {
        const amount = r.rawWithdrawalAmount;
        if (currency && currency !== amount.currency) {
          continue;
        }
        if (r.senderWire) {
          const payto = parsePaytoUri(r.senderWire);
          if (payto) {
            accounts[r.senderWire] = payto;
          }
        }
      }
    });
  return { accounts };
}

async function getExchanges(
  ws: InternalWalletState,
): Promise<ExchangesListResponse> {
  const exchanges: ExchangeListItem[] = [];
  await ws.db
    .mktx((x) => [x.exchanges, x.exchangeDetails, x.denominations])
    .runReadOnly(async (tx) => {
      const exchangeRecords = await tx.exchanges.iter().toArray();
      for (const r of exchangeRecords) {
        const dp = r.detailsPointer;
        if (!dp) {
          continue;
        }
        const { currency } = dp;
        const exchangeDetails = await getExchangeDetails(tx, r.baseUrl);
        if (!exchangeDetails) {
          continue;
        }

        const denominations = await tx.denominations.indexes.byExchangeBaseUrl
          .iter(r.baseUrl)
          .toArray();

        if (!denominations) {
          continue;
        }

        exchanges.push({
          exchangeBaseUrl: r.baseUrl,
          currency,
          tos: {
            acceptedVersion: exchangeDetails.termsOfServiceAcceptedEtag,
            currentVersion: exchangeDetails.termsOfServiceLastEtag,
            contentType: exchangeDetails.termsOfServiceContentType,
            content: exchangeDetails.termsOfServiceText,
          },
          paytoUris: exchangeDetails.wireInfo.accounts.map((x) => x.payto_uri),
        });
      }
    });
  return { exchanges };
}

async function getExchangeDetailedInfo(
  ws: InternalWalletState,
  exchangeBaseurl: string,
): Promise<ExchangeFullDetails> {
  //TODO: should we use the forceUpdate parameter?
  const exchange = await ws.db
    .mktx((x) => [x.exchanges, x.exchangeDetails, x.denominations])
    .runReadOnly(async (tx) => {
      const ex = await tx.exchanges.get(exchangeBaseurl);
      const dp = ex?.detailsPointer;
      if (!dp) {
        return;
      }
      const { currency } = dp;
      const exchangeDetails = await getExchangeDetails(tx, ex.baseUrl);
      if (!exchangeDetails) {
        return;
      }

      const denominations = await tx.denominations.indexes.byExchangeBaseUrl
        .iter(ex.baseUrl)
        .toArray();

      if (!denominations) {
        return;
      }

      return {
        info: {
          exchangeBaseUrl: ex.baseUrl,
          currency,
          tos: {
            acceptedVersion: exchangeDetails.termsOfServiceAcceptedEtag,
            currentVersion: exchangeDetails.termsOfServiceLastEtag,
            contentType: exchangeDetails.termsOfServiceContentType,
            content: exchangeDetails.termsOfServiceText,
          },
          paytoUris: exchangeDetails.wireInfo.accounts.map((x) => x.payto_uri),
          auditors: exchangeDetails.auditors,
          wireInfo: exchangeDetails.wireInfo,
        },
        denominations: denominations,
      };
    });

  if (!exchange) {
    throw Error(`exchange with base url "${exchangeBaseurl}" not found`);
  }

  const feesDescription: OperationMap<FeeDescription[]> = {
    deposit: createDenominationTimeline(
      exchange.denominations,
      "stampExpireDeposit",
      "feeDeposit",
    ),
    refresh: createDenominationTimeline(
      exchange.denominations,
      "stampExpireWithdraw",
      "feeRefresh",
    ),
    refund: createDenominationTimeline(
      exchange.denominations,
      "stampExpireWithdraw",
      "feeRefund",
    ),
    withdraw: createDenominationTimeline(
      exchange.denominations,
      "stampExpireWithdraw",
      "feeWithdraw",
    ),
  };

  return {
    ...exchange.info,
    feesDescription,
  };
}

export async function makeCoinAvailable(
  ws: InternalWalletState,
  tx: GetReadWriteAccess<{
    coins: typeof WalletStoresV1.coins;
    denominations: typeof WalletStoresV1.denominations;
  }>,
  coinRecord: CoinRecord,
): Promise<void> {
  const denom = await tx.denominations.get([
    coinRecord.exchangeBaseUrl,
    coinRecord.denomPubHash,
  ]);
  checkDbInvariant(!!denom);
  if (!denom.freshCoinCount) {
    denom.freshCoinCount = 0;
  }
  denom.freshCoinCount++;
  await tx.coins.put(coinRecord);
  await tx.denominations.put(denom);
}

export interface CoinsSpendInfo {
  coinPubs: string[];
  contributions: AmountJson[];
  refreshReason: RefreshReason;
  /**
   * Identifier for what the coin has been spent for.
   */
  allocationId: string;
}

export async function spendCoins(
  ws: InternalWalletState,
  tx: GetReadWriteAccess<{
    coins: typeof WalletStoresV1.coins;
    refreshGroups: typeof WalletStoresV1.refreshGroups;
    denominations: typeof WalletStoresV1.denominations;
  }>,
  csi: CoinsSpendInfo,
): Promise<void> {
  for (let i = 0; i < csi.coinPubs.length; i++) {
    const coin = await tx.coins.get(csi.coinPubs[i]);
    if (!coin) {
      throw Error("coin allocated for payment doesn't exist anymore");
    }
    const denom = await tx.denominations.get([
      coin.exchangeBaseUrl,
      coin.denomPubHash,
    ]);
    checkDbInvariant(!!denom);
    const contrib = csi.contributions[i];
    if (coin.status !== CoinStatus.Fresh) {
      const alloc = coin.allocation;
      if (!alloc) {
        continue;
      }
      if (alloc.id !== csi.allocationId) {
        // FIXME: assign error code
        throw Error("conflicting coin allocation (id)");
      }
      if (0 !== Amounts.cmp(alloc.amount, contrib)) {
        // FIXME: assign error code
        throw Error("conflicting coin allocation (contrib)");
      }
      continue;
    }
    coin.status = CoinStatus.Dormant;
    coin.allocation = {
      id: csi.allocationId,
      amount: Amounts.stringify(contrib),
    };
    const remaining = Amounts.sub(coin.currentAmount, contrib);
    if (remaining.saturated) {
      throw Error("not enough remaining balance on coin for payment");
    }
    coin.currentAmount = remaining.amount;
    checkDbInvariant(!!denom);
    if (denom.freshCoinCount == null || denom.freshCoinCount === 0) {
      throw Error(`invalid coin count ${denom.freshCoinCount} in DB`);
    }
    denom.freshCoinCount--;
    await tx.coins.put(coin);
    await tx.denominations.put(denom);
  }
  const refreshCoinPubs = csi.coinPubs.map((x) => ({
    coinPub: x,
  }));
  await createRefreshGroup(ws, tx, refreshCoinPubs, RefreshReason.PayMerchant);
}

async function setCoinSuspended(
  ws: InternalWalletState,
  coinPub: string,
  suspended: boolean,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.coins, x.denominations])
    .runReadWrite(async (tx) => {
      const c = await tx.coins.get(coinPub);
      if (!c) {
        logger.warn(`coin ${coinPub} not found, won't suspend`);
        return;
      }
      const denom = await tx.denominations.get([
        c.exchangeBaseUrl,
        c.denomPubHash,
      ]);
      checkDbInvariant(!!denom);
      if (suspended) {
        if (c.status !== CoinStatus.Fresh) {
          return;
        }
        if (denom.freshCoinCount == null || denom.freshCoinCount === 0) {
          throw Error(`invalid coin count ${denom.freshCoinCount} in DB`);
        }
        denom.freshCoinCount--;
        c.status = CoinStatus.FreshSuspended;
      } else {
        if (c.status == CoinStatus.Dormant) {
          return;
        }
        if (denom.freshCoinCount == null) {
          denom.freshCoinCount = 0;
        }
        denom.freshCoinCount++;
        c.status = CoinStatus.Fresh;
      }
      await tx.coins.put(c);
      await tx.denominations.put(denom);
    });
}

/**
 * Dump the public information of coins we have in an easy-to-process format.
 */
async function dumpCoins(ws: InternalWalletState): Promise<CoinDumpJson> {
  const coinsJson: CoinDumpJson = { coins: [] };
  logger.info("dumping coins");
  await ws.db
    .mktx((x) => [x.coins, x.denominations, x.withdrawalGroups])
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
        const denomInfo = await ws.getDenomInfo(
          ws,
          tx,
          c.exchangeBaseUrl,
          c.denomPubHash,
        );
        if (!denomInfo) {
          console.error("no denomination found for coin");
          continue;
        }
        coinsJson.coins.push({
          coin_pub: c.coinPub,
          denom_pub: denomInfo.denomPub,
          denom_pub_hash: c.denomPubHash,
          denom_value: Amounts.stringify(denom.value),
          exchange_base_url: c.exchangeBaseUrl,
          refresh_parent_coin_pub: refreshParentCoinPub,
          remaining_value: Amounts.stringify(c.currentAmount),
          withdrawal_reserve_pub: withdrawalReservePub,
          coin_suspended: c.status === CoinStatus.FreshSuspended,
          ageCommitmentProof: c.ageCommitmentProof,
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
          throw TalerError.fromUncheckedDetail(res.error);
        case "response":
          return res.result;
      }
    },
  };
  return client;
}

declare const __VERSION__: string;
declare const __GIT_HASH__: string;

const VERSION = typeof __VERSION__ !== "undefined" ? __VERSION__ : "dev";
const GIT_HASH = typeof __GIT_HASH__ !== "undefined" ? __GIT_HASH__ : undefined;

/**
 * Implementation of the "wallet-core" API.
 */
async function dispatchRequestInternal(
  ws: InternalWalletState,
  operation: string,
  payload: unknown,
): Promise<Record<string, any>> {
  if (!ws.initCalled && operation !== "initWallet") {
    throw Error(
      `wallet must be initialized before running operation ${operation}`,
    );
  }
  switch (operation) {
    case "initWallet": {
      ws.initCalled = true;
      if (typeof payload === "object" && (payload as any).skipDefaults) {
        logger.info("skipping defaults");
      } else {
        logger.info("filling defaults");
        await fillDefaults(ws);
      }
      return {};
    }
    case "withdrawTestkudos": {
      await withdrawTestBalance(ws, {
        amount: "TESTKUDOS:10",
        bankBaseUrl: "https://bank.test.taler.net/",
        bankAccessApiBaseUrl: "https://bank.test.taler.net/",
        exchangeBaseUrl: "https://exchange.test.taler.net/",
      });
      return {};
    }
    case "withdrawTestBalance": {
      const req = codecForWithdrawTestBalance().decode(payload);
      await withdrawTestBalance(ws, req);
      return {};
    }
    case "runIntegrationTest": {
      const req = codecForIntegrationTestArgs().decode(payload);
      await runIntegrationTest(ws, req);
      return {};
    }
    case "testPay": {
      const req = codecForTestPayArgs().decode(payload);
      return await testPay(ws, req);
    }
    case "getTransactions": {
      const req = codecForTransactionsRequest().decode(payload);
      return await getTransactions(ws, req);
    }
    case "addExchange": {
      const req = codecForAddExchangeRequest().decode(payload);
      await updateExchangeFromUrl(ws, req.exchangeBaseUrl, {
        forceNow: req.forceUpdate,
      });
      return {};
    }
    case "listExchanges": {
      return await getExchanges(ws);
    }
    case "getExchangeDetailedInfo": {
      const req = codecForAddExchangeRequest().decode(payload);
      return await getExchangeDetailedInfo(ws, req.exchangeBaseUrl);
    }
    case "listKnownBankAccounts": {
      const req = codecForListKnownBankAccounts().decode(payload);
      return await listKnownBankAccounts(ws, req.currency);
    }
    case "getWithdrawalDetailsForUri": {
      const req = codecForGetWithdrawalDetailsForUri().decode(payload);
      return await getWithdrawalDetailsForUri(ws, req.talerWithdrawUri);
    }

    case "getExchangeWithdrawalInfo": {
      const req = codecForGetExchangeWithdrawalInfo().decode(payload);
      return await getExchangeWithdrawalInfo(
        ws,
        req.exchangeBaseUrl,
        req.amount,
        req.ageRestricted,
      );
    }
    case "acceptManualWithdrawal": {
      const req = codecForAcceptManualWithdrawalRequet().decode(payload);
      const res = await createManualWithdrawal(ws, {
        amount: Amounts.parseOrThrow(req.amount),
        exchangeBaseUrl: req.exchangeBaseUrl,
        restrictAge: req.restrictAge,
      });
      return res;
    }
    case "getWithdrawalDetailsForAmount": {
      const req =
        codecForGetWithdrawalDetailsForAmountRequest().decode(payload);
      return await getWithdrawalDetailsForAmount(
        ws,
        req.exchangeBaseUrl,
        Amounts.parseOrThrow(req.amount),
        req.restrictAge,
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
    case "applyRefundFromPurchaseId": {
      const req = codecForApplyRefundFromPurchaseIdRequest().decode(payload);
      return await applyRefundFromPurchaseId(ws, req.purchaseId);
    }
    case "acceptBankIntegratedWithdrawal": {
      const req =
        codecForAcceptBankIntegratedWithdrawalRequest().decode(payload);
      return await acceptWithdrawalFromUri(ws, {
        selectedExchange: req.exchangeBaseUrl,
        talerWithdrawUri: req.talerWithdrawUri,
        forcedDenomSel: req.forcedDenomSel,
        restrictAge: req.restrictAge,
      });
    }
    case "getExchangeTos": {
      const req = codecForGetExchangeTosRequest().decode(payload);
      return getExchangeTos(ws, req.exchangeBaseUrl, req.acceptedFormat);
    }
    case "getContractTermsDetails": {
      const req = codecForGetContractTermsDetails().decode(payload);
      return getContractTermsDetails(ws, req.proposalId);
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
        .mktx((x) => [x.refreshGroups, x.denominations, x.coins])
        .runReadWrite(async (tx) => {
          return await createRefreshGroup(
            ws,
            tx,
            coinPubs,
            RefreshReason.Manual,
          );
        });
      processRefreshGroup(ws, refreshGroupId.refreshGroupId, {
        forceNow: true,
      }).catch((x) => {
        logger.error(x);
      });
      return {
        refreshGroupId,
      };
    }
    case "prepareTip": {
      const req = codecForPrepareTipRequest().decode(payload);
      return await prepareTip(ws, req.talerTipUri);
    }
    case "prepareRefund": {
      const req = codecForPrepareRefundRequest().decode(payload);
      return await prepareRefund(ws, req.talerRefundUri);
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
      const req = codecForRunBackupCycle().decode(payload);
      await runBackupCycle(ws, req);
      return {};
    }
    case "removeBackupProvider": {
      const req = codecForRemoveBackupProvider().decode(payload);
      await removeBackupProvider(ws, req);
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
    case "getFeeForDeposit": {
      const req = codecForGetFeeForDeposit().decode(payload);
      return await getFeeForDeposit(ws, req);
    }
    case "prepareDeposit": {
      const req = codecForPrepareDepositRequest().decode(payload);
      return await prepareDepositGroup(ws, req);
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
        .mktx((x) => [x.auditorTrust, x.exchangeTrust])
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
    case "withdrawFakebank": {
      const req = codecForWithdrawFakebankRequest().decode(payload);
      const amount = Amounts.parseOrThrow(req.amount);
      const details = await getWithdrawalDetailsForAmount(
        ws,
        req.exchange,
        amount,
        undefined,
      );
      const wres = await createManualWithdrawal(ws, {
        amount: amount,
        exchangeBaseUrl: req.exchange,
      });
      const paytoUri = details.paytoUris[0];
      const pt = parsePaytoUri(paytoUri);
      if (!pt) {
        throw Error("failed to parse payto URI");
      }
      const components = pt.targetPath.split("/");
      const creditorAcct = components[components.length - 1];
      logger.info(`making testbank transfer to '${creditorAcct}'`);
      const fbReq = await ws.http.postJson(
        new URL(`${creditorAcct}/admin/add-incoming`, req.bank).href,
        {
          amount: Amounts.stringify(amount),
          reserve_pub: wres.reservePub,
          debit_account: "payto://x-taler-bank/localhost/testdebtor",
        },
      );
      const fbResp = await readSuccessResponseJsonOrThrow(fbReq, codecForAny());
      logger.info(`started fakebank withdrawal: ${j2s(fbResp)}`);
      return {};
    }
    case "exportDb": {
      const dbDump = await exportDb(ws.db.idbHandle());
      return dbDump;
    }
    case "importDb": {
      const req = codecForImportDbRequest().decode(payload);
      await importDb(ws.db.idbHandle(), req.dump);
      return [];
    }
    case "initiatePeerPushPayment": {
      const req = codecForInitiatePeerPushPaymentRequest().decode(payload);
      return await initiatePeerToPeerPush(ws, req);
    }
    case "checkPeerPushPayment": {
      const req = codecForCheckPeerPushPaymentRequest().decode(payload);
      return await checkPeerPushPayment(ws, req);
    }
    case "acceptPeerPushPayment": {
      const req = codecForAcceptPeerPushPaymentRequest().decode(payload);
      await acceptPeerPushPayment(ws, req);
      return {};
    }
    case "initiatePeerPullPayment": {
      const req = codecForInitiatePeerPullPaymentRequest().decode(payload);
      return await initiatePeerRequestForPay(ws, req);
    }
    case "checkPeerPullPayment": {
      const req = codecForCheckPeerPullPaymentRequest().decode(payload);
      return await checkPeerPullPayment(ws, req);
    }
    case "acceptPeerPullPayment": {
      const req = codecForAcceptPeerPullPaymentRequest().decode(payload);
      await acceptPeerPullPayment(ws, req);
      return {};
    }
    case "getVersion": {
      const version: WalletCoreVersion = {
        hash: GIT_HASH,
        version: VERSION,
        exchange: WALLET_EXCHANGE_PROTOCOL_VERSION,
        merchant: WALLET_MERCHANT_PROTOCOL_VERSION,
        bank: WALLET_BANK_INTEGRATION_PROTOCOL_VERSION,
      };
      return version;
    }
  }
  throw TalerError.fromDetail(
    TalerErrorCode.WALLET_CORE_API_OPERATION_UNKNOWN,
    {
      operation,
    },
    "unknown operation",
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
  } catch (e: any) {
    const err = getErrorDetailFromException(e);
    logger.info(`finished wallet core request with error: ${j2s(err)}`);
    return {
      type: "error",
      operation,
      id,
      error: err,
    };
  }
}

/**
 * Public handle to a running wallet.
 */
export class Wallet {
  private ws: InternalWalletState;
  private _client: WalletCoreApiClient;

  private constructor(
    db: DbAccess<typeof WalletStoresV1>,
    http: HttpRequestLibrary,
    timer: TimerAPI,
    cryptoWorkerFactory: CryptoWorkerFactory,
  ) {
    this.ws = new InternalWalletStateImpl(db, http, timer, cryptoWorkerFactory);
  }

  get client(): WalletCoreApiClient {
    return this._client;
  }

  /**
   * Trust the exchange, do not validate signatures.
   * Only used to benchmark the exchange.
   */
  setInsecureTrustExchange(): void {
    this.ws.insecureTrustExchange = true;
  }

  setBatchWithdrawal(enable: boolean): void {
    this.ws.batchWithdrawal = enable;
  }

  static async create(
    db: DbAccess<typeof WalletStoresV1>,
    http: HttpRequestLibrary,
    timer: TimerAPI,
    cryptoWorkerFactory: CryptoWorkerFactory,
  ): Promise<Wallet> {
    const w = new Wallet(db, http, timer, cryptoWorkerFactory);
    w._client = await getClientFromWalletState(w.ws);
    return w;
  }

  addNotificationListener(f: (n: WalletNotification) => void): void {
    return this.ws.addNotificationListener(f);
  }

  stop(): void {
    this.ws.stop();
  }

  runPending(forceNow = false): Promise<void> {
    return runPending(this.ws, forceNow);
  }

  runTaskLoop(opts?: RetryLoopOpts): Promise<void> {
    return runTaskLoop(this.ws, opts);
  }

  handleCoreApiRequest(
    operation: string,
    id: string,
    payload: unknown,
  ): Promise<CoreApiResponse> {
    return handleCoreApiRequest(this.ws, operation, id, payload);
  }
}

/**
 * Internal state of the wallet.
 *
 * This ties together all the operation implementations.
 */
class InternalWalletStateImpl implements InternalWalletState {
  memoProcessReserve: AsyncOpMemoMap<void> = new AsyncOpMemoMap();
  memoMakePlanchet: AsyncOpMemoMap<void> = new AsyncOpMemoMap();
  memoGetPending: AsyncOpMemoSingle<PendingOperationsResponse> =
    new AsyncOpMemoSingle();
  memoGetBalance: AsyncOpMemoSingle<BalancesResponse> = new AsyncOpMemoSingle();
  memoProcessRefresh: AsyncOpMemoMap<void> = new AsyncOpMemoMap();
  memoProcessRecoup: AsyncOpMemoMap<void> = new AsyncOpMemoMap();

  cryptoApi: TalerCryptoInterface;
  cryptoDispatcher: CryptoDispatcher;

  merchantInfoCache: Record<string, MerchantInfo> = {};

  insecureTrustExchange = false;

  batchWithdrawal = false;

  readonly timerGroup: TimerGroup;
  latch = new AsyncCondition();
  stopped = false;

  listeners: NotificationListener[] = [];

  initCalled = false;

  exchangeOps: ExchangeOperations = {
    getExchangeDetails,
    getExchangeTrust,
    updateExchangeFromUrl,
  };

  recoupOps: RecoupOperations = {
    createRecoupGroup,
    processRecoupGroup,
  };

  merchantOps: MerchantOperations = {
    getMerchantInfo,
  };

  // FIXME: Use an LRU cache here.
  private denomCache: Record<string, DenomInfo> = {};

  /**
   * Promises that are waiting for a particular resource.
   */
  private resourceWaiters: Record<string, OpenedPromise<void>[]> = {};

  /**
   * Resources that are currently locked.
   */
  private resourceLocks: Set<string> = new Set();

  constructor(
    // FIXME: Make this a getter and make
    // the actual value nullable.
    // Check if we are in a DB migration / garbage collection
    // and throw an error in that case.
    public db: DbAccess<typeof WalletStoresV1>,
    public http: HttpRequestLibrary,
    public timer: TimerAPI,
    cryptoWorkerFactory: CryptoWorkerFactory,
  ) {
    this.cryptoDispatcher = new CryptoDispatcher(cryptoWorkerFactory);
    this.cryptoApi = this.cryptoDispatcher.cryptoApi;
    this.timerGroup = new TimerGroup(timer);
  }

  async getDenomInfo(
    ws: InternalWalletState,
    tx: GetReadWriteAccess<{
      denominations: typeof WalletStoresV1.denominations;
    }>,
    exchangeBaseUrl: string,
    denomPubHash: string,
  ): Promise<DenomInfo | undefined> {
    const key = `${exchangeBaseUrl}:${denomPubHash}`;
    const cached = this.denomCache[key];
    if (cached) {
      return cached;
    }
    const d = await tx.denominations.get([exchangeBaseUrl, denomPubHash]);
    if (d) {
      this.denomCache[key] = d;
    }
    return d;
  }

  notify(n: WalletNotification): void {
    logger.trace("Notification", n);
    for (const l of this.listeners) {
      const nc = JSON.parse(JSON.stringify(n));
      setTimeout(() => {
        l(nc);
      }, 0);
    }
  }

  addNotificationListener(f: (n: WalletNotification) => void): void {
    this.listeners.push(f);
  }

  /**
   * Stop ongoing processing.
   */
  stop(): void {
    this.stopped = true;
    this.timerGroup.stopCurrentAndFutureTimers();
    this.cryptoDispatcher.stop();
  }

  async runUntilDone(
    req: {
      maxRetries?: number;
    } = {},
  ): Promise<void> {
    await runTaskLoop(this, { ...req, stopWhenDone: true });
  }

  /**
   * Run an async function after acquiring a list of locks, identified
   * by string tokens.
   */
  async runSequentialized<T>(
    tokens: string[],
    f: () => Promise<T>,
  ): Promise<T> {
    // Make sure locks are always acquired in the same order
    tokens = [...tokens].sort();

    for (const token of tokens) {
      if (this.resourceLocks.has(token)) {
        const p = openPromise<void>();
        let waitList = this.resourceWaiters[token];
        if (!waitList) {
          waitList = this.resourceWaiters[token] = [];
        }
        waitList.push(p);
        await p.promise;
      }
      this.resourceLocks.add(token);
    }

    try {
      logger.trace(`begin exclusive execution on ${JSON.stringify(tokens)}`);
      const result = await f();
      logger.trace(`end exclusive execution on ${JSON.stringify(tokens)}`);
      return result;
    } finally {
      for (const token of tokens) {
        this.resourceLocks.delete(token);
        let waiter = (this.resourceWaiters[token] ?? []).shift();
        if (waiter) {
          waiter.resolve();
        }
      }
    }
  }
}
