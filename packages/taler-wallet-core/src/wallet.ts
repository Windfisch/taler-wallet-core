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
  BackupRecovery,
  codecForAny,
  codecForDeleteTransactionRequest,
  DeleteTransactionRequest,
  durationFromSpec,
  durationMax,
  durationMin,
  getDurationRemaining,
  isTimestampExpired,
  j2s,
  TalerErrorCode,
  Timestamp,
  timestampMin,
  WalletCurrencyInfo,
} from "@gnu-taler/taler-util";
import { CryptoWorkerFactory } from "./crypto/workers/cryptoApi";
import {
  addBackupProvider,
  AddBackupProviderRequest,
  BackupInfo,
  codecForAddBackupProviderRequest,
  exportBackupEncrypted,
  getBackupInfo,
  getBackupRecovery,
  importBackupEncrypted,
  importBackupPlain,
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
  getExchangePaytoUri,
  updateExchangeFromUrl,
} from "./operations/exchanges";
import {
  confirmPay,
  preparePayForUri,
  processDownloadProposal,
  processPurchasePay,
  refuseProposal,
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
  forceQueryReserve,
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
import { deleteTransaction, getTransactions } from "./operations/transactions";
import {
  getExchangeWithdrawalInfo,
  getWithdrawalDetailsForUri,
  processWithdrawGroup,
} from "./operations/withdraw";
import {
  AuditorTrustRecord,
  CoinRecord,
  CoinSourceType,
  ExchangeDetailsRecord,
  ExchangeRecord,
  ReserveRecord,
  ReserveRecordStatus,
  WalletStoresV1,
} from "./db.js";
import { NotificationType, WalletNotification } from "@gnu-taler/taler-util";
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
  BenchmarkResult,
  codecForAbortPayWithRefundRequest,
  codecForAcceptBankIntegratedWithdrawalRequest,
  codecForAcceptExchangeTosRequest,
  codecForAcceptManualWithdrawalRequet,
  codecForAcceptTipRequest,
  codecForAddExchangeRequest,
  codecForApplyRefundRequest,
  codecForConfirmPayRequest,
  codecForCreateDepositGroupRequest,
  codecForForceExchangeUpdateRequest,
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
  IntegrationTestArgs,
  ManualWithdrawalDetails,
  PreparePayResult,
  PrepareTipResult,
  RecoveryLoadRequest,
  RefreshReason,
  ReturnCoinsRequest,
  TestPayArgs,
  TrackDepositGroupRequest,
  TrackDepositGroupResponse,
  WithdrawTestBalanceRequest,
  WithdrawUriInfoResponse,
} from "@gnu-taler/taler-util";
import { AmountJson, Amounts } from "@gnu-taler/taler-util";
import { assertUnreachable } from "./util/assertUnreachable";
import { AsyncOpMemoSingle } from "./util/asyncMemo";
import { HttpRequestLibrary } from "./util/http";
import { Logger } from "@gnu-taler/taler-util";
import { AsyncCondition } from "./util/promiseUtils";
import { TimerGroup } from "./util/timer";
import { getExchangeTrust } from "./operations/currencies.js";
import { DbAccess } from "./util/query.js";
import { setWalletDeviceId } from "./operations/backup/state.js";

const builtinAuditors: AuditorTrustRecord[] = [
  {
    currency: "KUDOS",
    auditorPub: "BW9DC48PHQY4NH011SHHX36DZZ3Q22Y6X7FZ1VD1CMZ2PTFZ6PN0",
    auditorBaseUrl: "https://auditor.demo.taler.net/",
    uids: ["5P25XF8TVQP9AW6VYGY2KV47WT5Y3ZXFSJAA570GJPX5SVJXKBVG"],
  },
];

const logger = new Logger("wallet.ts");

/**
 * The platform-independent wallet implementation.
 */
export class Wallet {
  private ws: InternalWalletState;
  private timerGroup: TimerGroup = new TimerGroup();
  private latch = new AsyncCondition();
  private stopped = false;
  private memoRunRetryLoop = new AsyncOpMemoSingle<void>();

  get db(): DbAccess<typeof WalletStoresV1> {
    return this.ws.db;
  }

  constructor(
    db: DbAccess<typeof WalletStoresV1>,
    http: HttpRequestLibrary,
    cryptoWorkerFactory: CryptoWorkerFactory,
  ) {
    this.ws = new InternalWalletState(db, http, cryptoWorkerFactory);
  }

  getExchangePaytoUri(
    exchangeBaseUrl: string,
    supportedTargetTypes: string[],
  ): Promise<string> {
    return getExchangePaytoUri(this.ws, exchangeBaseUrl, supportedTargetTypes);
  }

  async getWithdrawalDetailsForAmount(
    exchangeBaseUrl: string,
    amount: AmountJson,
  ): Promise<ManualWithdrawalDetails> {
    const wi = await getExchangeWithdrawalInfo(
      this.ws,
      exchangeBaseUrl,
      amount,
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

  addNotificationListener(f: (n: WalletNotification) => void): void {
    this.ws.addNotificationListener(f);
  }

  /**
   * Execute one operation based on the pending operation info record.
   */
  async processOnePendingOperation(
    pending: PendingOperationInfo,
    forceNow = false,
  ): Promise<void> {
    logger.trace(`running pending ${JSON.stringify(pending, undefined, 2)}`);
    switch (pending.type) {
      case PendingOperationType.ExchangeUpdate:
        await updateExchangeFromUrl(this.ws, pending.exchangeBaseUrl, forceNow);
        break;
      case PendingOperationType.Refresh:
        await processRefreshGroup(this.ws, pending.refreshGroupId, forceNow);
        break;
      case PendingOperationType.Reserve:
        await processReserve(this.ws, pending.reservePub, forceNow);
        break;
      case PendingOperationType.Withdraw:
        await processWithdrawGroup(
          this.ws,
          pending.withdrawalGroupId,
          forceNow,
        );
        break;
      case PendingOperationType.ProposalDownload:
        await processDownloadProposal(this.ws, pending.proposalId, forceNow);
        break;
      case PendingOperationType.TipPickup:
        await processTip(this.ws, pending.tipId, forceNow);
        break;
      case PendingOperationType.Pay:
        await processPurchasePay(this.ws, pending.proposalId, forceNow);
        break;
      case PendingOperationType.RefundQuery:
        await processPurchaseQueryRefund(this.ws, pending.proposalId, forceNow);
        break;
      case PendingOperationType.Recoup:
        await processRecoupGroup(this.ws, pending.recoupGroupId, forceNow);
        break;
      case PendingOperationType.ExchangeCheckRefresh:
        await autoRefresh(this.ws, pending.exchangeBaseUrl);
        break;
      case PendingOperationType.Deposit:
        await processDepositGroup(this.ws, pending.depositGroupId);
        break;
      default:
        assertUnreachable(pending);
    }
  }

  /**
   * Process pending operations.
   */
  public async runPending(forceNow = false): Promise<void> {
    const pendingOpsResponse = await this.getPendingOperations();
    for (const p of pendingOpsResponse.pendingOperations) {
      if (!forceNow && !isTimestampExpired(p.timestampDue)) {
        continue;
      }
      try {
        await this.processOnePendingOperation(p, forceNow);
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
  public async runUntilDone(
    req: {
      maxRetries?: number;
    } = {},
  ): Promise<void> {
    let done = false;
    const p = new Promise<void>((resolve, reject) => {
      // Monitor for conditions that means we're done or we
      // should quit with an error (due to exceeded retries).
      this.addNotificationListener((n) => {
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
        this.getPendingOperations()
          .then((pending) => {
            for (const p of pending.pendingOperations) {
              if (p.retryInfo && p.retryInfo.retryCounter > maxRetries) {
                console.warn(
                  `stopping, as ${maxRetries} retries are exceeded in an operation of type ${p.type}`,
                );
                this.stop();
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
      this.runRetryLoop().catch((e) => {
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
  public async runRetryLoop(): Promise<void> {
    // Make sure we only run one main loop at a time.
    return this.memoRunRetryLoop.memo(async () => {
      try {
        await this.runRetryLoopImpl();
      } catch (e) {
        console.error("error during retry loop execution", e);
        throw e;
      }
    });
  }

  private async runRetryLoopImpl(): Promise<void> {
    for (let iteration = 0; !this.stopped; iteration++) {
      const pending = await this.getPendingOperations();
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
        logger.trace(`waiting for at most ${dt.d_ms} ms`)
        const timeout = this.timerGroup.resolveAfter(dt);
        this.ws.notify({
          type: NotificationType.WaitingForRetry,
          numGivingLiveness,
          numPending: pending.pendingOperations.length,
        });
        // Wait until either the timeout, or we are notified (via the latch)
        // that more work might be available.
        await Promise.race([timeout, this.latch.wait()]);
      } else {
        logger.trace(
          `running ${pending.pendingOperations.length} pending operations`,
        );
        for (const p of pending.pendingOperations) {
          if (!isTimestampExpired(p.timestampDue)) {
            continue;
          }
          try {
            await this.processOnePendingOperation(p);
          } catch (e) {
            if (e instanceof OperationFailedAndReportedError) {
              logger.warn("operation processed resulted in reported error");
            } else {
              logger.error("Uncaught exception", e);
              this.ws.notify({
                type: NotificationType.InternalError,
                message: "uncaught exception",
                exception: e,
              });
            }
          }
          this.ws.notify({
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
  async fillDefaults(): Promise<void> {
    await this.db
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
   * Check if a payment for the given taler://pay/ URI is possible.
   *
   * If the payment is possible, the signature are already generated but not
   * yet send to the merchant.
   */
  async preparePayForUri(talerPayUri: string): Promise<PreparePayResult> {
    return preparePayForUri(this.ws, talerPayUri);
  }

  /**
   * Add a contract to the wallet and sign coins, and send them.
   */
  async confirmPay(
    proposalId: string,
    sessionIdOverride: string | undefined,
  ): Promise<ConfirmPayResult> {
    try {
      return await confirmPay(this.ws, proposalId, sessionIdOverride);
    } finally {
      this.latch.trigger();
    }
  }

  /**
   * First fetch information required to withdraw from the reserve,
   * then deplete the reserve, withdrawing coins until it is empty.
   *
   * The returned promise resolves once the reserve is set to the
   * state DORMANT.
   */
  async processReserve(reservePub: string): Promise<void> {
    try {
      return await processReserve(this.ws, reservePub);
    } finally {
      this.latch.trigger();
    }
  }

  /**
   * Create a reserve, but do not flag it as confirmed yet.
   *
   * Adds the corresponding exchange as a trusted exchange if it is neither
   * audited nor trusted already.
   */
  async acceptManualWithdrawal(
    exchangeBaseUrl: string,
    amount: AmountJson,
  ): Promise<AcceptManualWithdrawalResult> {
    try {
      const resp = await createReserve(this.ws, {
        amount,
        exchange: exchangeBaseUrl,
      });
      const exchangePaytoUris = await this.db
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
      this.latch.trigger();
    }
  }

  /**
   * Check if and how an exchange is trusted and/or audited.
   */
  async getExchangeTrust(
    exchangeInfo: ExchangeRecord,
  ): Promise<{ isTrusted: boolean; isAudited: boolean }> {
    return getExchangeTrust(this.ws, exchangeInfo);
  }

  async getWithdrawalDetailsForUri(
    talerWithdrawUri: string,
  ): Promise<WithdrawUriInfoResponse> {
    return getWithdrawalDetailsForUri(this.ws, talerWithdrawUri);
  }

  async deleteTransaction(req: DeleteTransactionRequest): Promise<void> {
    return deleteTransaction(this.ws, req.transactionId);
  }

  async setDeviceId(newDeviceId: string): Promise<void> {
    return setWalletDeviceId(this.ws, newDeviceId);
  }

  /**
   * Update or add exchange DB entry by fetching the /keys and /wire information.
   */
  async updateExchangeFromUrl(
    baseUrl: string,
    force = false,
  ): Promise<{
    exchange: ExchangeRecord;
    exchangeDetails: ExchangeDetailsRecord;
  }> {
    try {
      return updateExchangeFromUrl(this.ws, baseUrl, force);
    } finally {
      this.latch.trigger();
    }
  }

  async getExchangeTos(exchangeBaseUrl: string): Promise<GetExchangeTosResult> {
    const { exchange, exchangeDetails } = await this.updateExchangeFromUrl(
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

  /**
   * Get detailed balance information, sliced by exchange and by currency.
   */
  async getBalances(): Promise<BalancesResponse> {
    return this.ws.memoGetBalance.memo(() => getBalances(this.ws));
  }

  async refresh(oldCoinPub: string): Promise<void> {
    try {
      const refreshGroupId = await this.db
        .mktx((x) => ({
          refreshGroups: x.refreshGroups,
          denominations: x.denominations,
          coins: x.coins,
        }))
        .runReadWrite(async (tx) => {
          return await createRefreshGroup(
            this.ws,
            tx,
            [{ coinPub: oldCoinPub }],
            RefreshReason.Manual,
          );
        });
      await processRefreshGroup(this.ws, refreshGroupId.refreshGroupId);
    } catch (e) {
      this.latch.trigger();
    }
  }

  async getPendingOperations(): Promise<PendingOperationsResponse> {
    return this.ws.memoGetPending.memo(() => getPendingOperations(this.ws));
  }

  async acceptExchangeTermsOfService(
    exchangeBaseUrl: string,
    etag: string | undefined,
  ): Promise<void> {
    return acceptExchangeTermsOfService(this.ws, exchangeBaseUrl, etag);
  }

  async getExchanges(): Promise<ExchangesListRespose> {
    const exchanges: ExchangeListItem[] = [];
    await this.db
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
            paytoUris: exchangeDetails.wireInfo.accounts.map(
              (x) => x.payto_uri,
            ),
          });
        }
      });
    return { exchanges };
  }

  async getCurrencies(): Promise<WalletCurrencyInfo> {
    return await this.ws.db
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

  /**
   * Stop ongoing processing.
   */
  stop(): void {
    this.stopped = true;
    this.timerGroup.stopCurrentAndFutureTimers();
    this.ws.cryptoApi.stop();
  }

  /**
   * Trigger paying coins back into the user's account.
   */
  async returnCoins(req: ReturnCoinsRequest): Promise<void> {
    throw Error("not implemented");
  }

  /**
   * Accept a refund, return the contract hash for the contract
   * that was involved in the refund.
   */
  async applyRefund(talerRefundUri: string): Promise<ApplyRefundResponse> {
    return applyRefund(this.ws, talerRefundUri);
  }

  async acceptTip(talerTipUri: string): Promise<void> {
    try {
      return acceptTip(this.ws, talerTipUri);
    } catch (e) {
      this.latch.trigger();
    }
  }

  async prepareTip(talerTipUri: string): Promise<PrepareTipResult> {
    return prepareTip(this.ws, talerTipUri);
  }

  async abortFailedPayWithRefund(proposalId: string): Promise<void> {
    return abortFailedPayWithRefund(this.ws, proposalId);
  }

  /**
   * Inform the wallet that the status of a reserve has changed (e.g. due to a
   * confirmation from the bank.).
   */
  public async handleNotifyReserve(): Promise<void> {
    const reserves = await this.ws.db
      .mktx((x) => ({
        reserves: x.reserves,
      }))
      .runReadOnly(async (tx) => {
        return tx.reserves.iter().toArray();
      });
    for (const r of reserves) {
      if (r.reserveStatus === ReserveRecordStatus.WAIT_CONFIRM_BANK) {
        try {
          this.processReserve(r.reservePub);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  /**
   * Remove unreferenced / expired data from the wallet's database
   * based on the current system time.
   */
  async collectGarbage(): Promise<void> {
    // FIXME(#5845)
    // We currently do not garbage-collect the wallet database.  This might change
    // after the feature has been properly re-designed, and we have come up with a
    // strategy to test it.
  }

  async acceptWithdrawal(
    talerWithdrawUri: string,
    selectedExchange: string,
  ): Promise<AcceptWithdrawalResponse> {
    try {
      return createTalerWithdrawReserve(
        this.ws,
        talerWithdrawUri,
        selectedExchange,
      );
    } finally {
      this.latch.trigger();
    }
  }

  async refuseProposal(proposalId: string): Promise<void> {
    return refuseProposal(this.ws, proposalId);
  }

  benchmarkCrypto(repetitions: number): Promise<BenchmarkResult> {
    return this.ws.cryptoApi.benchmark(repetitions);
  }

  async setCoinSuspended(coinPub: string, suspended: boolean): Promise<void> {
    await this.db
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
  async dumpCoins(): Promise<CoinDumpJson> {
    const coinsJson: CoinDumpJson = { coins: [] };
    await this.ws.db
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

  async getTransactions(
    request: TransactionsRequest,
  ): Promise<TransactionsResponse> {
    return getTransactions(this.ws, request);
  }

  async withdrawTestBalance(req: WithdrawTestBalanceRequest): Promise<void> {
    await withdrawTestBalance(
      this.ws,
      req.amount,
      req.bankBaseUrl,
      req.exchangeBaseUrl,
    );
  }

  async updateReserve(reservePub: string): Promise<ReserveRecord | undefined> {
    await forceQueryReserve(this.ws, reservePub);
    return await this.ws.db
      .mktx((x) => ({
        reserves: x.reserves,
      }))
      .runReadOnly(async (tx) => {
        return tx.reserves.get(reservePub);
      });
  }

  async getCoins(): Promise<CoinRecord[]> {
    return await this.db
      .mktx((x) => ({
        coins: x.coins,
      }))
      .runReadOnly(async (tx) => {
        return tx.coins.iter().toArray();
      });
  }

  async getReservesForExchange(
    exchangeBaseUrl?: string,
  ): Promise<ReserveRecord[]> {
    return await this.db
      .mktx((x) => ({
        reserves: x.reserves,
      }))
      .runReadOnly(async (tx) => {
        if (exchangeBaseUrl) {
          return await tx.reserves
            .iter()
            .filter((r) => r.exchangeBaseUrl === exchangeBaseUrl);
        } else {
          return await tx.reserves.iter().toArray();
        }
      });
  }

  async getReserve(reservePub: string): Promise<ReserveRecord | undefined> {
    return await this.db
      .mktx((x) => ({
        reserves: x.reserves,
      }))
      .runReadOnly(async (tx) => {
        return tx.reserves.get(reservePub);
      });
  }

  async runIntegrationtest(args: IntegrationTestArgs): Promise<void> {
    return runIntegrationTest(this.ws.http, this, args);
  }

  async testPay(args: TestPayArgs) {
    return testPay(this.ws.http, this, args);
  }

  async exportBackupPlain() {
    return exportBackup(this.ws);
  }

  async importBackupPlain(backup: any) {
    return importBackupPlain(this.ws, backup);
  }

  async exportBackupEncrypted() {
    return exportBackupEncrypted(this.ws);
  }

  async importBackupEncrypted(backup: Uint8Array) {
    return importBackupEncrypted(this.ws, backup);
  }

  async getBackupRecovery(): Promise<BackupRecovery> {
    return getBackupRecovery(this.ws);
  }

  async loadBackupRecovery(req: RecoveryLoadRequest): Promise<void> {
    return loadBackupRecovery(this.ws, req);
  }

  async addBackupProvider(req: AddBackupProviderRequest): Promise<void> {
    return addBackupProvider(this.ws, req);
  }

  async createDepositGroup(
    req: CreateDepositGroupRequest,
  ): Promise<CreateDepositGroupResponse> {
    return createDepositGroup(this.ws, req);
  }

  async runBackupCycle(): Promise<void> {
    return runBackupCycle(this.ws);
  }

  async getBackupStatus(): Promise<BackupInfo> {
    return getBackupInfo(this.ws);
  }

  async trackDepositGroup(
    req: TrackDepositGroupRequest,
  ): Promise<TrackDepositGroupResponse> {
    return trackDepositGroup(this.ws, req);
  }

  /**
   * Implementation of the "wallet-core" API.
   */
  private async dispatchRequestInternal(
    operation: string,
    payload: unknown,
  ): Promise<Record<string, any>> {
    switch (operation) {
      case "withdrawTestkudos": {
        await this.withdrawTestBalance({
          amount: "TESTKUDOS:10",
          bankBaseUrl: "https://bank.test.taler.net/",
          exchangeBaseUrl: "https://exchange.test.taler.net/",
        });
        return {};
      }
      case "withdrawTestBalance": {
        const req = codecForWithdrawTestBalance().decode(payload);
        await this.withdrawTestBalance(req);
        return {};
      }
      case "runIntegrationTest": {
        const req = codecForIntegrationTestArgs().decode(payload);
        await this.runIntegrationtest(req);
        return {};
      }
      case "testPay": {
        const req = codecForTestPayArgs().decode(payload);
        await this.testPay(req);
        return {};
      }
      case "getTransactions": {
        const req = codecForTransactionsRequest().decode(payload);
        return await this.getTransactions(req);
      }
      case "addExchange": {
        const req = codecForAddExchangeRequest().decode(payload);
        await this.updateExchangeFromUrl(req.exchangeBaseUrl);
        return {};
      }
      case "forceUpdateExchange": {
        const req = codecForForceExchangeUpdateRequest().decode(payload);
        await this.updateExchangeFromUrl(req.exchangeBaseUrl, true);
        return {};
      }
      case "listExchanges": {
        return await this.getExchanges();
      }
      case "getWithdrawalDetailsForUri": {
        const req = codecForGetWithdrawalDetailsForUri().decode(payload);
        return await this.getWithdrawalDetailsForUri(req.talerWithdrawUri);
      }
      case "acceptManualWithdrawal": {
        const req = codecForAcceptManualWithdrawalRequet().decode(payload);
        const res = await this.acceptManualWithdrawal(
          req.exchangeBaseUrl,
          Amounts.parseOrThrow(req.amount),
        );
        return res;
      }
      case "getWithdrawalDetailsForAmount": {
        const req = codecForGetWithdrawalDetailsForAmountRequest().decode(
          payload,
        );
        return await this.getWithdrawalDetailsForAmount(
          req.exchangeBaseUrl,
          Amounts.parseOrThrow(req.amount),
        );
      }
      case "getBalances": {
        return await this.getBalances();
      }
      case "getPendingOperations": {
        return await this.getPendingOperations();
      }
      case "setExchangeTosAccepted": {
        const req = codecForAcceptExchangeTosRequest().decode(payload);
        await this.acceptExchangeTermsOfService(req.exchangeBaseUrl, req.etag);
        return {};
      }
      case "applyRefund": {
        const req = codecForApplyRefundRequest().decode(payload);
        return await this.applyRefund(req.talerRefundUri);
      }
      case "acceptBankIntegratedWithdrawal": {
        const req = codecForAcceptBankIntegratedWithdrawalRequest().decode(
          payload,
        );
        return await this.acceptWithdrawal(
          req.talerWithdrawUri,
          req.exchangeBaseUrl,
        );
      }
      case "getExchangeTos": {
        const req = codecForGetExchangeTosRequest().decode(payload);
        return this.getExchangeTos(req.exchangeBaseUrl);
      }
      case "retryPendingNow": {
        await this.runPending(true);
        return {};
      }
      case "preparePay": {
        const req = codecForPreparePayRequest().decode(payload);
        return await this.preparePayForUri(req.talerPayUri);
      }
      case "confirmPay": {
        const req = codecForConfirmPayRequest().decode(payload);
        return await this.confirmPay(req.proposalId, req.sessionId);
      }
      case "abortFailedPayWithRefund": {
        const req = codecForAbortPayWithRefundRequest().decode(payload);
        await this.abortFailedPayWithRefund(req.proposalId);
        return {};
      }
      case "dumpCoins": {
        return await this.dumpCoins();
      }
      case "setCoinSuspended": {
        const req = codecForSetCoinSuspendedRequest().decode(payload);
        await this.setCoinSuspended(req.coinPub, req.suspended);
        return {};
      }
      case "forceRefresh": {
        const req = codecForForceRefreshRequest().decode(payload);
        const coinPubs = req.coinPubList.map((x) => ({ coinPub: x }));
        const refreshGroupId = await this.db
          .mktx((x) => ({
            refreshGroups: x.refreshGroups,
            denominations: x.denominations,
            coins: x.coins,
          }))
          .runReadWrite(async (tx) => {
            return await createRefreshGroup(
              this.ws,
              tx,
              coinPubs,
              RefreshReason.Manual,
            );
          });
        return {
          refreshGroupId,
        };
      }
      case "prepareTip": {
        const req = codecForPrepareTipRequest().decode(payload);
        return await this.prepareTip(req.talerTipUri);
      }
      case "acceptTip": {
        const req = codecForAcceptTipRequest().decode(payload);
        await this.acceptTip(req.walletTipId);
        return {};
      }
      case "exportBackup": {
        return exportBackup(this.ws);
      }
      case "addBackupProvider": {
        const req = codecForAddBackupProviderRequest().decode(payload);
        await addBackupProvider(this.ws, req);
        return {};
      }
      case "runBackupCycle": {
        await runBackupCycle(this.ws);
        return {};
      }
      case "exportBackupRecovery": {
        const resp = await getBackupRecovery(this.ws);
        return resp;
      }
      case "importBackupRecovery": {
        const req = codecForAny().decode(payload);
        await loadBackupRecovery(this.ws, req);
        return {};
      }
      case "getBackupInfo": {
        const resp = await getBackupInfo(this.ws);
        return resp;
      }
      case "createDepositGroup": {
        const req = codecForCreateDepositGroupRequest().decode(payload);
        return await createDepositGroup(this.ws, req);
      }
      case "trackDepositGroup": {
        const req = codecForTrackDepositGroupRequest().decode(payload);
        return trackDepositGroup(this.ws, req);
      }
      case "deleteTransaction": {
        const req = codecForDeleteTransactionRequest().decode(payload);
        await deleteTransaction(this.ws, req.transactionId);
        return {};
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
  async handleCoreApiRequest(
    operation: string,
    id: string,
    payload: unknown,
  ): Promise<CoreApiResponse> {
    try {
      const result = await this.dispatchRequestInternal(operation, payload);
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
}
