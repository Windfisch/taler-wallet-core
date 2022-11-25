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
  Amounts,
  codecForAbortPayWithRefundRequest,
  codecForAcceptBankIntegratedWithdrawalRequest,
  codecForAcceptExchangeTosRequest,
  codecForAcceptManualWithdrawalRequet,
  codecForAcceptPeerPullPaymentRequest,
  codecForAcceptPeerPushPaymentRequest,
  codecForAcceptTipRequest,
  codecForAddExchangeRequest,
  codecForAddKnownBankAccounts,
  codecForAny,
  codecForApplyDevExperiment,
  codecForApplyRefundFromPurchaseIdRequest,
  codecForApplyRefundRequest,
  codecForCheckPeerPullPaymentRequest,
  codecForCheckPeerPushPaymentRequest,
  codecForConfirmPayRequest,
  codecForCreateDepositGroupRequest,
  codecForDeleteTransactionRequest,
  codecForForceRefreshRequest,
  codecForForgetKnownBankAccounts,
  codecForGetContractTermsDetails,
  codecForGetExchangeTosRequest,
  codecForGetFeeForDeposit,
  codecForGetWithdrawalDetailsForAmountRequest,
  codecForGetWithdrawalDetailsForUri,
  codecForImportDbRequest,
  codecForInitiatePeerPullPaymentRequest,
  codecForInitiatePeerPushPaymentRequest,
  codecForIntegrationTestArgs,
  codecForListKnownBankAccounts,
  codecForUserAttentionsRequest,
  codecForPrepareDepositRequest,
  codecForPreparePayRequest,
  codecForPreparePeerPullPaymentRequest,
  codecForPreparePeerPushPaymentRequest,
  codecForPrepareRefundRequest,
  codecForPrepareTipRequest,
  codecForRetryTransactionRequest,
  codecForSetCoinSuspendedRequest,
  codecForSetDevModeRequest,
  codecForSetWalletDeviceIdRequest,
  codecForTestPayArgs,
  codecForTrackDepositGroupRequest,
  codecForTransactionByIdRequest,
  codecForTransactionsRequest,
  codecForWithdrawFakebankRequest,
  codecForWithdrawTestBalance,
  CoinDumpJson,
  CoinRefreshRequest,
  CoinStatus,
  CoreApiResponse,
  DenominationInfo,
  DenomOperationMap,
  Duration,
  durationFromSpec,
  durationMin,
  ExchangeDetailedResponse,
  ExchangeListItem,
  ExchangesListResponse,
  ExchangeTosStatusDetails,
  FeeDescription,
  GetExchangeTosResult,
  InitResponse,
  j2s,
  KnownBankAccounts,
  KnownBankAccountsInfo,
  Logger,
  NotificationType,
  parsePaytoUri,
  RefreshReason,
  TalerErrorCode,
  URL,
  WalletCoreVersion,
  WalletNotification,
  codecForUserAttentionByIdRequest,
} from "@gnu-taler/taler-util";
import { TalerCryptoInterface } from "./crypto/cryptoImplementation.js";
import {
  CryptoDispatcher,
  CryptoWorkerFactory,
} from "./crypto/workers/cryptoDispatcher.js";
import { clearDatabase } from "./db-utils.js";
import {
  AuditorTrustRecord,
  CoinSourceType,
  ConfigRecordKey,
  DenominationRecord,
  ExchangeDetailsRecord,
  exportDb,
  importDb,
  WalletStoresV1,
} from "./db.js";
import {
  applyDevExperiment,
  maybeInitDevMode,
  setDevMode,
} from "./dev-experiments.js";
import { getErrorDetailFromException, TalerError } from "./errors.js";
import {
  ActiveLongpollInfo,
  ExchangeOperations,
  InternalWalletState,
  MerchantInfo,
  MerchantOperations,
  NotificationListener,
  RecoupOperations,
  RefreshOperations,
} from "./internal-wallet-state.js";
import { exportBackup } from "./operations/backup/export.js";
import {
  addBackupProvider,
  codecForAddBackupProviderRequest,
  codecForRemoveBackupProvider,
  codecForRunBackupCycle,
  getBackupInfo,
  getBackupRecovery,
  importBackupPlain,
  loadBackupRecovery,
  processBackupForProvider,
  removeBackupProvider,
  runBackupCycle,
} from "./operations/backup/index.js";
import { setWalletDeviceId } from "./operations/backup/state.js";
import { getBalances } from "./operations/balance.js";
import {
  getUserAttentions,
  getUserAttentionsUnreadCount,
  markAttentionRequestAsRead,
} from "./operations/attention.js";
import {
  getExchangeTosStatus,
  makeExchangeListItem,
  runOperationWithErrorReporting,
} from "./operations/common.js";
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
  provideExchangeRecordInTx,
  updateExchangeFromUrl,
  updateExchangeFromUrlHandler,
  updateExchangeTermsOfService,
} from "./operations/exchanges.js";
import { getMerchantInfo } from "./operations/merchants.js";
import {
  abortFailedPayWithRefund,
  applyRefund,
  applyRefundFromPurchaseId,
  confirmPay,
  getContractTermsDetails,
  preparePayForUri,
  prepareRefund,
  processPurchase,
} from "./operations/pay-merchant.js";
import {
  acceptPeerPullPayment,
  acceptPeerPushPayment,
  checkPeerPullPayment,
  checkPeerPushPayment,
  initiatePeerPullPayment,
  initiatePeerToPeerPush,
  preparePeerPullPayment,
  preparePeerPushPayment,
} from "./operations/pay-peer.js";
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
  runIntegrationTest,
  testPay,
  withdrawTestBalance,
} from "./operations/testing.js";
import { acceptTip, prepareTip, processTip } from "./operations/tip.js";
import {
  deleteTransaction,
  getTransactionById,
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
import { PendingTaskInfo, PendingTaskType } from "./pending-types.js";
import { assertUnreachable } from "./util/assertUnreachable.js";
import {
  createTimeline,
  selectBestForOverlappingDenominations,
  selectMinimumFee,
} from "./util/denominations.js";
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
import {
  DbAccess,
  GetReadOnlyAccess,
  GetReadWriteAccess,
} from "./util/query.js";
import { OperationAttemptResult, RetryTags } from "./util/retries.js";
import { TimerAPI, TimerGroup } from "./util/timer.js";
import {
  WALLET_BANK_INTEGRATION_PROTOCOL_VERSION,
  WALLET_EXCHANGE_PROTOCOL_VERSION,
  WALLET_MERCHANT_PROTOCOL_VERSION,
} from "./versions.js";
import {
  WalletApiOperation,
  WalletCoreApiClient,
  WalletCoreResponseType,
} from "./wallet-api-types.js";

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

/**
 * Call the right handler for a pending operation without doing
 * any special error handling.
 */
async function callOperationHandler(
  ws: InternalWalletState,
  pending: PendingTaskInfo,
  forceNow = false,
): Promise<OperationAttemptResult> {
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
    case PendingTaskType.TipPickup:
      return await processTip(ws, pending.tipId, { forceNow });
    case PendingTaskType.Purchase:
      return await processPurchase(ws, pending.proposalId, { forceNow });
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
    await runOperationWithErrorReporting(ws, p.id, async () => {
      logger.trace(`running pending ${JSON.stringify(p, undefined, 2)}`);
      return await callOperationHandler(ws, p, forceNow);
    });
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

export interface TaskLoopResult {
  /**
   * Was the maximum number of retries exceeded in a task?
   */
  retriesExceeded: boolean;
}

/**
 * Main retry loop of the wallet.
 *
 * Looks up pending operations from the wallet, runs them, repeat.
 */
async function runTaskLoop(
  ws: InternalWalletState,
  opts: RetryLoopOpts = {},
): Promise<TaskLoopResult> {
  logger.info(`running task loop opts=${j2s(opts)}`);
  let retriesExceeded = false;
  for (let iteration = 0; !ws.stopped; iteration++) {
    const pending = await getPendingOperations(ws);
    logger.trace(`pending operations: ${j2s(pending)}`);
    let numGivingLiveness = 0;
    let numDue = 0;
    let minDue: AbsoluteTime = AbsoluteTime.never();

    for (const p of pending.pendingOperations) {
      const maxRetries = opts.maxRetries;

      if (maxRetries && p.retryInfo && p.retryInfo.retryCounter > maxRetries) {
        retriesExceeded = true;
        logger.warn(
          `skipping, as ${maxRetries} retries are exceeded in an operation of type ${p.type}`,
        );
        continue;
      }
      if (p.givesLifeness) {
        numGivingLiveness++;
      }
      if (!p.isDue) {
        continue;
      }
      minDue = AbsoluteTime.min(minDue, p.timestampDue);
      numDue++;
    }

    if (opts.stopWhenDone && numGivingLiveness === 0 && iteration !== 0) {
      logger.warn(`stopping, as no pending operations have lifeness`);
      return {
        retriesExceeded,
      };
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
        numDue,
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
        await runOperationWithErrorReporting(ws, p.id, async () => {
          logger.trace(`running pending ${JSON.stringify(p, undefined, 2)}`);
          return await callOperationHandler(ws, p);
        });
        ws.notify({
          type: NotificationType.PendingOperationProcessed,
          id: p.id,
        });
      }
    }
  }
  logger.trace("exiting wallet retry loop");
  return {
    retriesExceeded,
  };
}

/**
 * Insert the hard-coded defaults for exchanges, coins and
 * auditors into the database, unless these defaults have
 * already been applied.
 */
async function fillDefaults(ws: InternalWalletState): Promise<void> {
  await ws.db
    .mktx((x) => [x.config, x.auditorTrust, x.exchanges, x.exchangeDetails])
    .runReadWrite(async (tx) => {
      const appliedRec = await tx.config.get("currencyDefaultsApplied");
      let alreadyApplied = appliedRec ? !!appliedRec.value : false;
      if (alreadyApplied) {
        logger.trace("defaults already applied");
        return;
      }
      logger.info("importing default exchanges and auditors");
      for (const c of builtinAuditors) {
        await tx.auditorTrust.put(c);
      }
      for (const baseUrl of builtinExchanges) {
        const now = AbsoluteTime.now();
        provideExchangeRecordInTx(ws, tx, baseUrl, now);
      }
      await tx.config.put({
        key: ConfigRecordKey.CurrencyDefaultsApplied,
        value: true,
      });
    });
}

/**
 * Get the exchange ToS in the requested format.
 * Try to download in the accepted format not cached.
 */
async function getExchangeTos(
  ws: InternalWalletState,
  exchangeBaseUrl: string,
  acceptedFormat?: string[],
): Promise<GetExchangeTosResult> {
  // FIXME: download ToS in acceptable format if passed!
  const { exchangeDetails } = await updateExchangeFromUrl(ws, exchangeBaseUrl);
  const tosDetails = await ws.db
    .mktx((x) => [x.exchangeTos])
    .runReadOnly(async (tx) => {
      return await getExchangeTosStatusDetails(tx, exchangeDetails);
    });
  const content = tosDetails.content;
  const currentEtag = tosDetails.currentVersion;
  const contentType = tosDetails.contentType;
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
      acceptedEtag: exchangeDetails.tosAccepted?.etag,
      currentEtag,
      content,
      contentType,
      tosStatus: getExchangeTosStatus(exchangeDetails),
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
      acceptedEtag: exchangeDetails.tosAccepted?.etag,
      currentEtag,
      content,
      contentType,
      tosStatus: getExchangeTosStatus(exchangeDetails),
    };
  }

  await updateExchangeTermsOfService(ws, exchangeBaseUrl, tosDownload);

  return {
    acceptedEtag: exchangeDetails.tosAccepted?.etag,
    currentEtag: tosDownload.tosEtag,
    content: tosDownload.tosText,
    contentType: tosDownload.tosContentType,
    tosStatus: getExchangeTosStatus(exchangeDetails),
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
  const accounts: KnownBankAccountsInfo[] = [];
  await ws.db
    .mktx((x) => [x.bankAccounts])
    .runReadOnly(async (tx) => {
      const knownAccounts = await tx.bankAccounts.iter().toArray();
      for (const r of knownAccounts) {
        if (currency && currency !== r.currency) {
          continue;
        }
        const payto = parsePaytoUri(r.uri);
        if (payto) {
          accounts.push({
            uri: payto,
            alias: r.alias,
            kyc_completed: r.kycCompleted,
            currency: r.currency,
          });
        }
      }
    });
  return { accounts };
}

/**
 */
async function addKnownBankAccounts(
  ws: InternalWalletState,
  payto: string,
  alias: string,
  currency: string,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.bankAccounts])
    .runReadWrite(async (tx) => {
      tx.bankAccounts.put({
        uri: payto,
        alias: alias,
        currency: currency,
        kycCompleted: false,
      });
    });
  return;
}

/**
 */
async function forgetKnownBankAccounts(
  ws: InternalWalletState,
  payto: string,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.bankAccounts])
    .runReadWrite(async (tx) => {
      const account = await tx.bankAccounts.get(payto);
      if (!account) {
        throw Error(`account not found: ${payto}`);
      }
      tx.bankAccounts.delete(account.uri);
    });
  return;
}

async function getExchangeTosStatusDetails(
  tx: GetReadOnlyAccess<{ exchangeTos: typeof WalletStoresV1.exchangeTos }>,
  exchangeDetails: ExchangeDetailsRecord,
): Promise<ExchangeTosStatusDetails> {
  let exchangeTos = await tx.exchangeTos.get([
    exchangeDetails.exchangeBaseUrl,
    exchangeDetails.tosCurrentEtag,
  ]);

  if (!exchangeTos) {
    exchangeTos = {
      etag: "not-available",
      termsOfServiceContentType: "text/plain",
      termsOfServiceText: "terms of service unavailable",
      exchangeBaseUrl: exchangeDetails.exchangeBaseUrl,
    };
  }

  return {
    acceptedVersion: exchangeDetails.tosAccepted?.etag,
    content: exchangeTos.termsOfServiceText,
    contentType: exchangeTos.termsOfServiceContentType,
    currentVersion: exchangeTos.etag,
  };
}

async function getExchanges(
  ws: InternalWalletState,
): Promise<ExchangesListResponse> {
  const exchanges: ExchangeListItem[] = [];
  await ws.db
    .mktx((x) => [
      x.exchanges,
      x.exchangeDetails,
      x.exchangeTos,
      x.denominations,
      x.operationRetries,
    ])
    .runReadOnly(async (tx) => {
      const exchangeRecords = await tx.exchanges.iter().toArray();
      for (const r of exchangeRecords) {
        const exchangeDetails = await getExchangeDetails(tx, r.baseUrl);
        const opRetryRecord = await tx.operationRetries.get(
          RetryTags.forExchangeUpdate(r),
        );
        exchanges.push(
          makeExchangeListItem(r, exchangeDetails, opRetryRecord?.lastError),
        );
      }
    });
  return { exchanges };
}

async function getExchangeDetailedInfo(
  ws: InternalWalletState,
  exchangeBaseurl: string,
): Promise<ExchangeDetailedResponse> {
  //TODO: should we use the forceUpdate parameter?
  const exchange = await ws.db
    .mktx((x) => [
      x.exchanges,
      x.exchangeTos,
      x.exchangeDetails,
      x.denominations,
    ])
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

      const denominationRecords =
        await tx.denominations.indexes.byExchangeBaseUrl
          .iter(ex.baseUrl)
          .toArray();

      if (!denominationRecords) {
        return;
      }

      const tos = await getExchangeTosStatusDetails(tx, exchangeDetails);

      const denominations: DenominationInfo[] = denominationRecords.map((x) =>
        DenominationRecord.toDenomInfo(x),
      );

      return {
        info: {
          exchangeBaseUrl: ex.baseUrl,
          currency,
          tos,
          paytoUris: exchangeDetails.wireInfo.accounts.map((x) => x.payto_uri),
          auditors: exchangeDetails.auditors,
          wireInfo: exchangeDetails.wireInfo,
          globalFees: exchangeDetails.globalFees,
        },
        denominations,
      };
    });

  if (!exchange) {
    throw Error(`exchange with base url "${exchangeBaseurl}" not found`);
  }

  const denoms = exchange.denominations.map((d) => ({
    ...d,
    group: Amounts.stringifyValue(d.value),
  }));
  const denomFees: DenomOperationMap<FeeDescription[]> = {
    deposit: createTimeline(
      denoms,
      "denomPubHash",
      "stampStart",
      "stampExpireDeposit",
      "feeDeposit",
      "group",
      selectBestForOverlappingDenominations,
    ),
    refresh: createTimeline(
      denoms,
      "denomPubHash",
      "stampStart",
      "stampExpireWithdraw",
      "feeRefresh",
      "group",
      selectBestForOverlappingDenominations,
    ),
    refund: createTimeline(
      denoms,
      "denomPubHash",
      "stampStart",
      "stampExpireWithdraw",
      "feeRefund",
      "group",
      selectBestForOverlappingDenominations,
    ),
    withdraw: createTimeline(
      denoms,
      "denomPubHash",
      "stampStart",
      "stampExpireWithdraw",
      "feeWithdraw",
      "group",
      selectBestForOverlappingDenominations,
    ),
  };

  const transferFees = Object.entries(
    exchange.info.wireInfo.feesForType,
  ).reduce((prev, [wireType, infoForType]) => {
    const feesByGroup = [
      ...infoForType.map((w) => ({
        ...w,
        fee: Amounts.stringify(w.closingFee),
        group: "closing",
      })),
      ...infoForType.map((w) => ({ ...w, fee: w.wireFee, group: "wire" })),
    ];
    prev[wireType] = createTimeline(
      feesByGroup,
      "sig",
      "startStamp",
      "endStamp",
      "fee",
      "group",
      selectMinimumFee,
    );
    return prev;
  }, {} as Record<string, FeeDescription[]>);

  const globalFeesByGroup = [
    ...exchange.info.globalFees.map((w) => ({
      ...w,
      fee: w.accountFee,
      group: "account",
    })),
    ...exchange.info.globalFees.map((w) => ({
      ...w,
      fee: w.historyFee,
      group: "history",
    })),
    ...exchange.info.globalFees.map((w) => ({
      ...w,
      fee: w.purseFee,
      group: "purse",
    })),
  ];

  const globalFees = createTimeline(
    globalFeesByGroup,
    "signature",
    "startDate",
    "endDate",
    "fee",
    "group",
    selectMinimumFee,
  );

  return {
    exchange: {
      ...exchange.info,
      denomFees,
      transferFees,
      globalFees,
    },
  };
}

async function setCoinSuspended(
  ws: InternalWalletState,
  coinPub: string,
  suspended: boolean,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.coins, x.coinAvailability])
    .runReadWrite(async (tx) => {
      const c = await tx.coins.get(coinPub);
      if (!c) {
        logger.warn(`coin ${coinPub} not found, won't suspend`);
        return;
      }
      const coinAvailability = await tx.coinAvailability.get([
        c.exchangeBaseUrl,
        c.denomPubHash,
        c.maxAge,
      ]);
      checkDbInvariant(!!coinAvailability);
      if (suspended) {
        if (c.status !== CoinStatus.Fresh) {
          return;
        }
        if (coinAvailability.freshCoinCount === 0) {
          throw Error(
            `invalid coin count ${coinAvailability.freshCoinCount} in DB`,
          );
        }
        coinAvailability.freshCoinCount--;
        c.status = CoinStatus.FreshSuspended;
      } else {
        if (c.status == CoinStatus.Dormant) {
          return;
        }
        coinAvailability.freshCoinCount++;
        c.status = CoinStatus.Fresh;
      }
      await tx.coins.put(c);
      await tx.coinAvailability.put(coinAvailability);
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
          denom_value: Amounts.stringify({
            value: denom.amountVal,
            currency: denom.currency,
            fraction: denom.amountFrac,
          }),
          exchange_base_url: c.exchangeBaseUrl,
          refresh_parent_coin_pub: refreshParentCoinPub,
          withdrawal_reserve_pub: withdrawalReservePub,
          coin_status: c.status,
          ageCommitmentProof: c.ageCommitmentProof,
          spend_allocation: c.spendAllocation
            ? {
                amount: c.spendAllocation.amount,
                id: c.spendAllocation.id,
              }
            : undefined,
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
async function dispatchRequestInternal<Op extends WalletApiOperation>(
  ws: InternalWalletState,
  operation: WalletApiOperation,
  payload: unknown,
): Promise<WalletCoreResponseType<typeof operation>> {
  if (!ws.initCalled && operation !== WalletApiOperation.InitWallet) {
    throw Error(
      `wallet must be initialized before running operation ${operation}`,
    );
  }
  // FIXME: Can we make this more type-safe by using the request/response type
  // definitions we already have?
  switch (operation) {
    case WalletApiOperation.InitWallet: {
      logger.trace("initializing wallet");
      ws.initCalled = true;
      if (typeof payload === "object" && (payload as any).skipDefaults) {
        logger.trace("skipping defaults");
      } else {
        logger.trace("filling defaults");
        await fillDefaults(ws);
      }
      await maybeInitDevMode(ws);
      const resp: InitResponse = {
        versionInfo: getVersion(ws),
      };
      return resp;
    }
    case WalletApiOperation.WithdrawTestkudos: {
      await withdrawTestBalance(ws, {
        amount: "TESTKUDOS:10",
        bankBaseUrl: "https://bank.test.taler.net/",
        bankAccessApiBaseUrl: "https://bank.test.taler.net/",
        exchangeBaseUrl: "https://exchange.test.taler.net/",
      });
      return {
        versionInfo: getVersion(ws),
      };
    }
    case WalletApiOperation.WithdrawTestBalance: {
      const req = codecForWithdrawTestBalance().decode(payload);
      await withdrawTestBalance(ws, req);
      return {};
    }
    case WalletApiOperation.RunIntegrationTest: {
      const req = codecForIntegrationTestArgs().decode(payload);
      await runIntegrationTest(ws, req);
      return {};
    }
    case WalletApiOperation.TestPay: {
      const req = codecForTestPayArgs().decode(payload);
      return await testPay(ws, req);
    }
    case WalletApiOperation.GetTransactions: {
      const req = codecForTransactionsRequest().decode(payload);
      return await getTransactions(ws, req);
    }
    case WalletApiOperation.GetTransactionById: {
      const req = codecForTransactionByIdRequest().decode(payload);
      return await getTransactionById(ws, req);
    }
    case WalletApiOperation.AddExchange: {
      const req = codecForAddExchangeRequest().decode(payload);
      await updateExchangeFromUrl(ws, req.exchangeBaseUrl, {
        forceNow: req.forceUpdate,
      });
      return {};
    }
    case WalletApiOperation.ListExchanges: {
      return await getExchanges(ws);
    }
    case WalletApiOperation.GetExchangeDetailedInfo: {
      const req = codecForAddExchangeRequest().decode(payload);
      return await getExchangeDetailedInfo(ws, req.exchangeBaseUrl);
    }
    case WalletApiOperation.ListKnownBankAccounts: {
      const req = codecForListKnownBankAccounts().decode(payload);
      return await listKnownBankAccounts(ws, req.currency);
    }
    case WalletApiOperation.AddKnownBankAccounts: {
      const req = codecForAddKnownBankAccounts().decode(payload);
      await addKnownBankAccounts(ws, req.payto, req.alias, req.currency);
      return {};
    }
    case WalletApiOperation.ForgetKnownBankAccounts: {
      const req = codecForForgetKnownBankAccounts().decode(payload);
      await forgetKnownBankAccounts(ws, req.payto);
      return {};
    }
    case WalletApiOperation.GetWithdrawalDetailsForUri: {
      const req = codecForGetWithdrawalDetailsForUri().decode(payload);
      return await getWithdrawalDetailsForUri(ws, req.talerWithdrawUri);
    }
    case WalletApiOperation.AcceptManualWithdrawal: {
      const req = codecForAcceptManualWithdrawalRequet().decode(payload);
      const res = await createManualWithdrawal(ws, {
        amount: Amounts.parseOrThrow(req.amount),
        exchangeBaseUrl: req.exchangeBaseUrl,
        restrictAge: req.restrictAge,
      });
      return res;
    }
    case WalletApiOperation.GetWithdrawalDetailsForAmount: {
      const req =
        codecForGetWithdrawalDetailsForAmountRequest().decode(payload);
      const wi = await getExchangeWithdrawalInfo(
        ws,
        req.exchangeBaseUrl,
        Amounts.parseOrThrow(req.amount),
        req.restrictAge,
      );
      return {
        amountRaw: req.amount,
        amountEffective: Amounts.stringify(wi.selectedDenoms.totalCoinValue),
        paytoUris: wi.exchangePaytoUris,
        tosAccepted: wi.termsOfServiceAccepted,
      };
    }
    case WalletApiOperation.GetBalances: {
      return await getBalances(ws);
    }
    case WalletApiOperation.GetUserAttentionRequests: {
      const req = codecForUserAttentionsRequest().decode(payload);
      return await getUserAttentions(ws, req);
    }
    case WalletApiOperation.MarkAttentionRequestAsRead: {
      const req = codecForUserAttentionByIdRequest().decode(payload);
      return await markAttentionRequestAsRead(ws, req);
    }
    case WalletApiOperation.GetUserAttentionUnreadCount: {
      const req = codecForUserAttentionsRequest().decode(payload);
      return await getUserAttentionsUnreadCount(ws, req);
    }
    case WalletApiOperation.GetPendingOperations: {
      return await getPendingOperations(ws);
    }
    case WalletApiOperation.SetExchangeTosAccepted: {
      const req = codecForAcceptExchangeTosRequest().decode(payload);
      await acceptExchangeTermsOfService(ws, req.exchangeBaseUrl, req.etag);
      return {};
    }
    case WalletApiOperation.ApplyRefund: {
      const req = codecForApplyRefundRequest().decode(payload);
      return await applyRefund(ws, req.talerRefundUri);
    }
    case WalletApiOperation.ApplyRefundFromPurchaseId: {
      const req = codecForApplyRefundFromPurchaseIdRequest().decode(payload);
      return await applyRefundFromPurchaseId(ws, req.purchaseId);
    }
    case WalletApiOperation.AcceptBankIntegratedWithdrawal: {
      const req =
        codecForAcceptBankIntegratedWithdrawalRequest().decode(payload);
      return await acceptWithdrawalFromUri(ws, {
        selectedExchange: req.exchangeBaseUrl,
        talerWithdrawUri: req.talerWithdrawUri,
        forcedDenomSel: req.forcedDenomSel,
        restrictAge: req.restrictAge,
      });
    }
    case WalletApiOperation.GetExchangeTos: {
      const req = codecForGetExchangeTosRequest().decode(payload);
      return getExchangeTos(ws, req.exchangeBaseUrl, req.acceptedFormat);
    }
    case WalletApiOperation.GetContractTermsDetails: {
      const req = codecForGetContractTermsDetails().decode(payload);
      return getContractTermsDetails(ws, req.proposalId);
    }
    case WalletApiOperation.RetryPendingNow: {
      await runPending(ws, true);
      return {};
    }
    // FIXME: Deprecate one of the aliases!
    case WalletApiOperation.PreparePayForUri: {
      const req = codecForPreparePayRequest().decode(payload);
      return await preparePayForUri(ws, req.talerPayUri);
    }
    case WalletApiOperation.ConfirmPay: {
      const req = codecForConfirmPayRequest().decode(payload);
      return await confirmPay(ws, req.proposalId, req.sessionId);
    }
    case WalletApiOperation.AbortFailedPayWithRefund: {
      const req = codecForAbortPayWithRefundRequest().decode(payload);
      await abortFailedPayWithRefund(ws, req.proposalId);
      return {};
    }
    case WalletApiOperation.DumpCoins: {
      return await dumpCoins(ws);
    }
    case WalletApiOperation.SetCoinSuspended: {
      const req = codecForSetCoinSuspendedRequest().decode(payload);
      await setCoinSuspended(ws, req.coinPub, req.suspended);
      return {};
    }
    case WalletApiOperation.ForceRefresh: {
      const req = codecForForceRefreshRequest().decode(payload);
      const refreshGroupId = await ws.db
        .mktx((x) => [
          x.refreshGroups,
          x.coinAvailability,
          x.denominations,
          x.coins,
        ])
        .runReadWrite(async (tx) => {
          let coinPubs: CoinRefreshRequest[] = [];
          for (const c of req.coinPubList) {
            const coin = await tx.coins.get(c);
            if (!coin) {
              throw Error(`coin (pubkey ${c}) not found`);
            }
            const denom = await ws.getDenomInfo(
              ws,
              tx,
              coin.exchangeBaseUrl,
              coin.denomPubHash,
            );
            checkDbInvariant(!!denom);
            coinPubs.push({
              coinPub: c,
              amount: denom?.value,
            });
          }
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
    case WalletApiOperation.PrepareTip: {
      const req = codecForPrepareTipRequest().decode(payload);
      return await prepareTip(ws, req.talerTipUri);
    }
    case WalletApiOperation.PrepareRefund: {
      const req = codecForPrepareRefundRequest().decode(payload);
      return await prepareRefund(ws, req.talerRefundUri);
    }
    case WalletApiOperation.AcceptTip: {
      const req = codecForAcceptTipRequest().decode(payload);
      return await acceptTip(ws, req.walletTipId);
    }
    case WalletApiOperation.ExportBackupPlain: {
      return exportBackup(ws);
    }
    case WalletApiOperation.AddBackupProvider: {
      const req = codecForAddBackupProviderRequest().decode(payload);
      return await addBackupProvider(ws, req);
    }
    case WalletApiOperation.RunBackupCycle: {
      const req = codecForRunBackupCycle().decode(payload);
      await runBackupCycle(ws, req);
      return {};
    }
    case WalletApiOperation.RemoveBackupProvider: {
      const req = codecForRemoveBackupProvider().decode(payload);
      await removeBackupProvider(ws, req);
      return {};
    }
    case WalletApiOperation.ExportBackupRecovery: {
      const resp = await getBackupRecovery(ws);
      return resp;
    }
    case WalletApiOperation.ImportBackupRecovery: {
      const req = codecForAny().decode(payload);
      await loadBackupRecovery(ws, req);
      return {};
    }
    case WalletApiOperation.GetBackupInfo: {
      const resp = await getBackupInfo(ws);
      return resp;
    }
    case WalletApiOperation.GetFeeForDeposit: {
      const req = codecForGetFeeForDeposit().decode(payload);
      return await getFeeForDeposit(ws, req);
    }
    case WalletApiOperation.PrepareDeposit: {
      const req = codecForPrepareDepositRequest().decode(payload);
      return await prepareDepositGroup(ws, req);
    }
    case WalletApiOperation.CreateDepositGroup: {
      const req = codecForCreateDepositGroupRequest().decode(payload);
      return await createDepositGroup(ws, req);
    }
    case WalletApiOperation.TrackDepositGroup: {
      const req = codecForTrackDepositGroupRequest().decode(payload);
      return trackDepositGroup(ws, req);
    }
    case WalletApiOperation.DeleteTransaction: {
      const req = codecForDeleteTransactionRequest().decode(payload);
      await deleteTransaction(ws, req.transactionId);
      return {};
    }
    case WalletApiOperation.RetryTransaction: {
      const req = codecForRetryTransactionRequest().decode(payload);
      await retryTransaction(ws, req.transactionId);
      return {};
    }
    case WalletApiOperation.SetWalletDeviceId: {
      const req = codecForSetWalletDeviceIdRequest().decode(payload);
      await setWalletDeviceId(ws, req.walletDeviceId);
      return {};
    }
    case WalletApiOperation.ListCurrencies: {
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
    case WalletApiOperation.WithdrawFakebank: {
      const req = codecForWithdrawFakebankRequest().decode(payload);
      const amount = Amounts.parseOrThrow(req.amount);
      const details = await getExchangeWithdrawalInfo(
        ws,
        req.exchange,
        amount,
        undefined,
      );
      const wres = await createManualWithdrawal(ws, {
        amount: amount,
        exchangeBaseUrl: req.exchange,
      });
      const paytoUri = details.exchangePaytoUris[0];
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
    case WalletApiOperation.TestCrypto: {
      return await ws.cryptoApi.hashString({ str: "hello world" });
    }
    case WalletApiOperation.ClearDb:
      await clearDatabase(ws.db.idbHandle());
      return {};
    case WalletApiOperation.Recycle: {
      const backup = await exportBackup(ws);
      await clearDatabase(ws.db.idbHandle());
      await importBackupPlain(ws, backup);
      return {};
    }
    case WalletApiOperation.ExportDb: {
      const dbDump = await exportDb(ws.db.idbHandle());
      return dbDump;
    }
    case WalletApiOperation.ImportDb: {
      const req = codecForImportDbRequest().decode(payload);
      await importDb(ws.db.idbHandle(), req.dump);
      return [];
    }
    case WalletApiOperation.PreparePeerPushPayment: {
      const req = codecForPreparePeerPushPaymentRequest().decode(payload);
      return await preparePeerPushPayment(ws, req);
    }
    case WalletApiOperation.InitiatePeerPushPayment: {
      const req = codecForInitiatePeerPushPaymentRequest().decode(payload);
      return await initiatePeerToPeerPush(ws, req);
    }
    case WalletApiOperation.CheckPeerPushPayment: {
      const req = codecForCheckPeerPushPaymentRequest().decode(payload);
      return await checkPeerPushPayment(ws, req);
    }
    case WalletApiOperation.AcceptPeerPushPayment: {
      const req = codecForAcceptPeerPushPaymentRequest().decode(payload);
      return await acceptPeerPushPayment(ws, req);
    }
    case WalletApiOperation.PreparePeerPullPayment: {
      const req = codecForPreparePeerPullPaymentRequest().decode(payload);
      return await preparePeerPullPayment(ws, req);
    }
    case WalletApiOperation.InitiatePeerPullPayment: {
      const req = codecForInitiatePeerPullPaymentRequest().decode(payload);
      return await initiatePeerPullPayment(ws, req);
    }
    case WalletApiOperation.CheckPeerPullPayment: {
      const req = codecForCheckPeerPullPaymentRequest().decode(payload);
      return await checkPeerPullPayment(ws, req);
    }
    case WalletApiOperation.AcceptPeerPullPayment: {
      const req = codecForAcceptPeerPullPaymentRequest().decode(payload);
      return await acceptPeerPullPayment(ws, req);
    }
    case WalletApiOperation.ApplyDevExperiment: {
      const req = codecForApplyDevExperiment().decode(payload);
      await applyDevExperiment(ws, req.devExperimentUri);
      return {};
    }
    case WalletApiOperation.SetDevMode: {
      const req = codecForSetDevModeRequest().decode(payload);
      await setDevMode(ws, req.devModeEnabled);
      return {};
    }
    case WalletApiOperation.GetVersion: {
      return getVersion(ws);
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

export function getVersion(ws: InternalWalletState): WalletCoreVersion {
  const version: WalletCoreVersion = {
    hash: GIT_HASH,
    version: VERSION,
    exchange: WALLET_EXCHANGE_PROTOCOL_VERSION,
    merchant: WALLET_MERCHANT_PROTOCOL_VERSION,
    bank: WALLET_BANK_INTEGRATION_PROTOCOL_VERSION,
    devMode: ws.devModeActive,
  };
  return version;
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
    const result = await dispatchRequestInternal(ws, operation as any, payload);
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
  private _client: WalletCoreApiClient | undefined;

  private constructor(
    db: DbAccess<typeof WalletStoresV1>,
    http: HttpRequestLibrary,
    timer: TimerAPI,
    cryptoWorkerFactory: CryptoWorkerFactory,
  ) {
    this.ws = new InternalWalletStateImpl(db, http, timer, cryptoWorkerFactory);
  }

  get client(): WalletCoreApiClient {
    if (!this._client) {
      throw Error();
    }
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

  runTaskLoop(opts?: RetryLoopOpts): Promise<TaskLoopResult> {
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
  /**
   * @see {@link InternalWalletState.activeLongpoll}
   */
  activeLongpoll: ActiveLongpollInfo = {};

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

  devModeActive = false;

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

  refreshOps: RefreshOperations = {
    createRefreshGroup,
  };

  // FIXME: Use an LRU cache here.
  private denomCache: Record<string, DenominationInfo> = {};

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
  ): Promise<DenominationInfo | undefined> {
    const key = `${exchangeBaseUrl}:${denomPubHash}`;
    const cached = this.denomCache[key];
    if (cached) {
      return cached;
    }
    const d = await tx.denominations.get([exchangeBaseUrl, denomPubHash]);
    if (d) {
      return DenominationRecord.toDenomInfo(d);
    }
    return undefined;
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
    logger.trace("stopping (at internal wallet state)");
    this.stopped = true;
    this.timerGroup.stopCurrentAndFutureTimers();
    this.cryptoDispatcher.stop();
    for (const key of Object.keys(this.activeLongpoll)) {
      logger.trace(`cancelling active longpoll ${key}`);
      this.activeLongpoll[key].cancel();
    }
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
