/*
 This file is part of TALER
 (C) 2015-2019 GNUnet e.V.

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
 * High-level wallet operations that should be indepentent from the underlying
 * browser extension interface.
 */

/**
 * Imports.
 */
import { CryptoApi, CryptoWorkerFactory } from "./crypto/cryptoApi";
import {
  amountToPretty,
  canonicalJson,
  canonicalizeBaseUrl,
  getTalerStampSec,
  strcmp,
  extractTalerStamp,
  extractTalerStampOrThrow,
} from "./helpers";
import { HttpRequestLibrary } from "./http";
import * as LibtoolVersion from "./libtoolVersion";
import {
  TransactionAbort,
  oneShotPut,
  oneShotGet,
  runWithWriteTransaction,
  oneShotIter,
  oneShotIterIndex,
  oneShotGetIndexed,
  oneShotMutate,
} from "./query";

import { AmountJson } from "./amounts";
import * as Amounts from "./amounts";

import URI = require("urijs");

import {
  CoinRecord,
  CoinStatus,
  CoinsReturnRecord,
  CurrencyRecord,
  DenominationRecord,
  DenominationStatus,
  ExchangeRecord,
  PlanchetRecord,
  ProposalRecord,
  PurchaseRecord,
  RefreshPlanchetRecord,
  RefreshSessionRecord,
  ReserveRecord,
  Stores,
  TipRecord,
  WireFee,
  WithdrawalSessionRecord,
  ExchangeUpdateStatus,
  ReserveRecordStatus,
  ProposalStatus,
} from "./dbTypes";
import {
  Auditor,
  ContractTerms,
  Denomination,
  ExchangeHandle,
  ExchangeWireJson,
  KeysJson,
  MerchantRefundPermission,
  MerchantRefundResponse,
  PayReq,
  PaybackConfirmation,
  Proposal,
  RefundRequest,
  ReserveStatus,
  TipPlanchetDetail,
  TipResponse,
  WithdrawOperationStatusResponse,
  TipPickupGetResponse,
} from "./talerTypes";
import {
  Badge,
  BenchmarkResult,
  CoinSelectionResult,
  CoinWithDenom,
  ConfirmPayResult,
  ConfirmReserveRequest,
  CreateReserveRequest,
  CreateReserveResponse,
  HistoryEvent,
  NextUrlResult,
  Notifier,
  PayCoinInfo,
  ReserveCreationInfo,
  ReturnCoinsRequest,
  SenderWireInfos,
  TipStatus,
  WalletBalance,
  WalletBalanceEntry,
  PreparePayResult,
  DownloadedWithdrawInfo,
  WithdrawDetails,
  AcceptWithdrawalResponse,
  PurchaseDetails,
  PendingOperationInfo,
  PendingOperationsResponse,
  HistoryQuery,
  getTimestampNow,
  OperationError,
  Timestamp,
} from "./walletTypes";
import {
  parsePayUri,
  parseWithdrawUri,
  parseTipUri,
  parseRefundUri,
} from "./taleruri";
import { Logger } from "./logging";
import { randomBytes } from "./crypto/primitives/nacl-fast";
import { encodeCrock, getRandomBytes } from "./crypto/talerCrypto";

interface SpeculativePayData {
  payCoinInfo: PayCoinInfo;
  exchangeUrl: string;
  orderDownloadId: string;
  proposal: ProposalRecord;
}

/**
 * Wallet protocol version spoken with the exchange
 * and merchant.
 *
 * Uses libtool's current:revision:age versioning.
 */
export const WALLET_PROTOCOL_VERSION = "3:0:0";

const WALLET_CACHE_BREAKER_CLIENT_VERSION = "2";

const builtinCurrencies: CurrencyRecord[] = [
  {
    auditors: [
      {
        auditorPub: "BW9DC48PHQY4NH011SHHX36DZZ3Q22Y6X7FZ1VD1CMZ2PTFZ6PN0",
        baseUrl: "https://auditor.demo.taler.net/",
        expirationStamp: new Date(2027, 1).getTime(),
      },
    ],
    exchanges: [],
    fractionalDigits: 2,
    name: "KUDOS",
  },
];

function isWithdrawableDenom(d: DenominationRecord) {
  const now = getTimestampNow();
  const started = now.t_ms >= d.stampStart.t_ms;
  const stillOkay = d.stampExpireWithdraw.t_ms + 60 * 1000 > now.t_ms;
  return started && stillOkay;
}

interface SelectPayCoinsResult {
  cds: CoinWithDenom[];
  totalFees: AmountJson;
}

function assertUnreachable(x: never): never {
  throw new Error("Didn't expect to get here");
}

/**
 * Get the amount that we lose when refreshing a coin of the given denomination
 * with a certain amount left.
 *
 * If the amount left is zero, then the refresh cost
 * is also considered to be zero.  If a refresh isn't possible (e.g. due to lack of
 * the right denominations), then the cost is the full amount left.
 *
 * Considers refresh fees, withdrawal fees after refresh and amounts too small
 * to refresh.
 */
export function getTotalRefreshCost(
  denoms: DenominationRecord[],
  refreshedDenom: DenominationRecord,
  amountLeft: AmountJson,
): AmountJson {
  const withdrawAmount = Amounts.sub(amountLeft, refreshedDenom.feeRefresh)
    .amount;
  const withdrawDenoms = getWithdrawDenomList(withdrawAmount, denoms);
  const resultingAmount = Amounts.add(
    Amounts.getZero(withdrawAmount.currency),
    ...withdrawDenoms.map(d => d.value),
  ).amount;
  const totalCost = Amounts.sub(amountLeft, resultingAmount).amount;
  Wallet.enableTracing &&
    console.log(
      "total refresh cost for",
      amountToPretty(amountLeft),
      "is",
      amountToPretty(totalCost),
    );
  return totalCost;
}

/**
 * Select coins for a payment under the merchant's constraints.
 *
 * @param denoms all available denoms, used to compute refresh fees
 */
export function selectPayCoins(
  denoms: DenominationRecord[],
  cds: CoinWithDenom[],
  paymentAmount: AmountJson,
  depositFeeLimit: AmountJson,
): SelectPayCoinsResult | undefined {
  if (cds.length === 0) {
    return undefined;
  }
  // Sort by ascending deposit fee and denomPub if deposit fee is the same
  // (to guarantee deterministic results)
  cds.sort(
    (o1, o2) =>
      Amounts.cmp(o1.denom.feeDeposit, o2.denom.feeDeposit) ||
      strcmp(o1.denom.denomPub, o2.denom.denomPub),
  );
  const currency = cds[0].denom.value.currency;
  const cdsResult: CoinWithDenom[] = [];
  let accDepositFee: AmountJson = Amounts.getZero(currency);
  let accAmount: AmountJson = Amounts.getZero(currency);
  for (const { coin, denom } of cds) {
    if (coin.suspended) {
      continue;
    }
    if (coin.status !== CoinStatus.Fresh) {
      continue;
    }
    if (Amounts.cmp(denom.feeDeposit, coin.currentAmount) >= 0) {
      continue;
    }
    cdsResult.push({ coin, denom });
    accDepositFee = Amounts.add(denom.feeDeposit, accDepositFee).amount;
    let leftAmount = Amounts.sub(
      coin.currentAmount,
      Amounts.sub(paymentAmount, accAmount).amount,
    ).amount;
    accAmount = Amounts.add(coin.currentAmount, accAmount).amount;
    const coversAmount = Amounts.cmp(accAmount, paymentAmount) >= 0;
    const coversAmountWithFee =
      Amounts.cmp(
        accAmount,
        Amounts.add(paymentAmount, denom.feeDeposit).amount,
      ) >= 0;
    const isBelowFee = Amounts.cmp(accDepositFee, depositFeeLimit) <= 0;

    Wallet.enableTracing &&
      console.log("candidate coin selection", {
        coversAmount,
        isBelowFee,
        accDepositFee,
        accAmount,
        paymentAmount,
      });

    if ((coversAmount && isBelowFee) || coversAmountWithFee) {
      const depositFeeToCover = Amounts.sub(accDepositFee, depositFeeLimit)
        .amount;
      leftAmount = Amounts.sub(leftAmount, depositFeeToCover).amount;
      Wallet.enableTracing &&
        console.log("deposit fee to cover", amountToPretty(depositFeeToCover));

      let totalFees: AmountJson = Amounts.getZero(currency);
      if (coversAmountWithFee && !isBelowFee) {
        // these are the fees the customer has to pay
        // because the merchant doesn't cover them
        totalFees = Amounts.sub(depositFeeLimit, accDepositFee).amount;
      }
      totalFees = Amounts.add(
        totalFees,
        getTotalRefreshCost(denoms, denom, leftAmount),
      ).amount;
      return { cds: cdsResult, totalFees };
    }
  }
  return undefined;
}

/**
 * Get a list of denominations (with repetitions possible)
 * whose total value is as close as possible to the available
 * amount, but never larger.
 */
function getWithdrawDenomList(
  amountAvailable: AmountJson,
  denoms: DenominationRecord[],
): DenominationRecord[] {
  let remaining = Amounts.copy(amountAvailable);
  const ds: DenominationRecord[] = [];

  denoms = denoms.filter(isWithdrawableDenom);
  denoms.sort((d1, d2) => Amounts.cmp(d2.value, d1.value));

  // This is an arbitrary number of coins
  // we can withdraw in one go.  It's not clear if this limit
  // is useful ...
  for (let i = 0; i < 1000; i++) {
    let found = false;
    for (const d of denoms) {
      const cost = Amounts.add(d.value, d.feeWithdraw).amount;
      if (Amounts.cmp(remaining, cost) < 0) {
        continue;
      }
      found = true;
      remaining = Amounts.sub(remaining, cost).amount;
      ds.push(d);
      break;
    }
    if (!found) {
      break;
    }
  }
  return ds;
}

interface CoinsForPaymentArgs {
  allowedAuditors: Auditor[];
  allowedExchanges: ExchangeHandle[];
  depositFeeLimit: AmountJson;
  paymentAmount: AmountJson;
  wireFeeAmortization: number;
  wireFeeLimit: AmountJson;
  wireFeeTime: Timestamp;
  wireMethod: string;
}

/**
 * This error is thrown when an
 */
export class OperationFailedAndReportedError extends Error {
  constructor(message: string) {
    super(message);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, OperationFailedAndReportedError.prototype);
  }
}

const logger = new Logger("wallet.ts");

interface MemoEntry<T> {
  p: Promise<T>;
  t: number;
  n: number;
}

class AsyncOpMemo<T> {
  n = 0;
  memo: { [k: string]: MemoEntry<T> } = {};
  put(key: string, p: Promise<T>): Promise<T> {
    const n = this.n++;
    this.memo[key] = {
      p,
      n,
      t: new Date().getTime(),
    };
    p.finally(() => {
      const r = this.memo[key];
      if (r && r.n === n) {
        delete this.memo[key];
      }
    });
    return p;
  }
  find(key: string): Promise<T> | undefined {
    const res = this.memo[key];
    const tNow = new Date().getTime();
    if (res && res.t < tNow - 10 * 1000) {
      delete this.memo[key];
      return;
    } else if (res) {
      return res.p;
    }
    return;
  }
}

/**
 * The platform-independent wallet implementation.
 */
export class Wallet {
  /**
   * IndexedDB database used by the wallet.
   */
  db: IDBDatabase;
  static enableTracing = false;
  private http: HttpRequestLibrary;
  private badge: Badge;
  private notifier: Notifier;
  private cryptoApi: CryptoApi;
  private speculativePayData: SpeculativePayData | undefined;
  private cachedNextUrl: { [fulfillmentUrl: string]: NextUrlResult } = {};

  private memoProcessReserve = new AsyncOpMemo<void>();

  constructor(
    db: IDBDatabase,
    http: HttpRequestLibrary,
    badge: Badge,
    notifier: Notifier,
    cryptoWorkerFactory: CryptoWorkerFactory,
  ) {
    this.db = db;
    this.http = http;
    this.badge = badge;
    this.notifier = notifier;
    this.cryptoApi = new CryptoApi(cryptoWorkerFactory);
  }

  /**
   * Execute one operation based on the pending operation info record.
   */
  async processOnePendingOperation(
    pending: PendingOperationInfo,
  ): Promise<void> {
    switch (pending.type) {
      case "bug":
        return;
      case "dirty-coin":
        await this.refresh(pending.coinPub);
        break;
      case "exchange-update":
        await this.updateExchangeFromUrl(pending.exchangeBaseUrl);
        break;
      case "planchet":
        await this.processPlanchet(pending.coinPub);
        break;
      case "refresh":
        await this.processRefreshSession(pending.refreshSessionId);
        break;
      case "reserve":
        await this.processReserve(pending.reservePub);
        break;
      case "withdraw":
        await this.processWithdrawSession(pending.withdrawSessionId);
        break;
      case "proposal":
        // Nothing to do, user needs to accept/reject
        break;
      default:
        assertUnreachable(pending);
    }
  }

  /**
   * Process pending operations.
   */
  public async runPending(): Promise<void> {
    const pendingOpsResponse = await this.getPendingOperations();
    for (const p of pendingOpsResponse.pendingOperations) {
      try {
        await this.processOnePendingOperation(p);
      } catch (e) {
        console.error(e);
      }
    }
  }

  /**
   * Process pending operations and wait for scheduled operations in
   * a loop until the wallet is stopped explicitly.
   */
  public async runUntilStopped(): Promise<void> {
    throw Error("not implemented");
  }

  /**
   * Run until all coins have been withdrawn from the given reserve,
   * or an error has occured.
   */
  public async runUntilReserveDepleted(reservePub: string) {
    while (true) {
      const r = await this.getPendingOperations();
      const allPending = r.pendingOperations;
      const relevantPending = allPending.filter(x => {
        switch (x.type) {
          case "planchet":
          case "reserve":
            return x.reservePub === reservePub;
          default:
            return false;
        }
      });
      if (relevantPending.length === 0) {
        return;
      }
      for (const p of relevantPending) {
        await this.processOnePendingOperation(p);
      }
    }
  }

  /**
   * Insert the hard-coded defaults for exchanges, coins and
   * auditors into the database, unless these defaults have
   * already been applied.
   */
  async fillDefaults() {
    await runWithWriteTransaction(
      this.db,
      [Stores.config, Stores.currencies],
      async tx => {
        let applied = false;
        await tx.iter(Stores.config).forEach(x => {
          if (x.key == "currencyDefaultsApplied" && x.value == true) {
            applied = true;
          }
        });
        if (!applied) {
          for (let c of builtinCurrencies) {
            await tx.put(Stores.currencies, c);
          }
        }
      },
    );
  }

  private async getCoinsForReturn(
    exchangeBaseUrl: string,
    amount: AmountJson,
  ): Promise<CoinWithDenom[] | undefined> {
    const exchange = await oneShotGet(
      this.db,
      Stores.exchanges,
      exchangeBaseUrl,
    );
    if (!exchange) {
      throw Error(`Exchange ${exchangeBaseUrl} not known to the wallet`);
    }

    const coins: CoinRecord[] = await oneShotIterIndex(
      this.db,
      Stores.coins.exchangeBaseUrlIndex,
      exchange.baseUrl,
    ).toArray();

    if (!coins || !coins.length) {
      return [];
    }

    const denoms = await oneShotIterIndex(
      this.db,
      Stores.denominations.exchangeBaseUrlIndex,
      exchange.baseUrl,
    ).toArray();

    // Denomination of the first coin, we assume that all other
    // coins have the same currency
    const firstDenom = await oneShotGet(this.db, Stores.denominations, [
      exchange.baseUrl,
      coins[0].denomPub,
    ]);
    if (!firstDenom) {
      throw Error("db inconsistent");
    }
    const currency = firstDenom.value.currency;

    const cds: CoinWithDenom[] = [];
    for (const coin of coins) {
      const denom = await oneShotGet(this.db, Stores.denominations, [
        exchange.baseUrl,
        coin.denomPub,
      ]);
      if (!denom) {
        throw Error("db inconsistent");
      }
      if (denom.value.currency !== currency) {
        console.warn(
          `same pubkey for different currencies at exchange ${exchange.baseUrl}`,
        );
        continue;
      }
      if (coin.suspended) {
        continue;
      }
      if (coin.status !== CoinStatus.Fresh) {
        continue;
      }
      cds.push({ coin, denom });
    }

    const res = selectPayCoins(denoms, cds, amount, amount);
    if (res) {
      return res.cds;
    }
    return undefined;
  }

  /**
   * Get exchanges and associated coins that are still spendable, but only
   * if the sum the coins' remaining value covers the payment amount and fees.
   */
  private async getCoinsForPayment(
    args: CoinsForPaymentArgs,
  ): Promise<CoinSelectionResult | undefined> {
    const {
      allowedAuditors,
      allowedExchanges,
      depositFeeLimit,
      paymentAmount,
      wireFeeAmortization,
      wireFeeLimit,
      wireFeeTime,
      wireMethod,
    } = args;

    let remainingAmount = paymentAmount;

    const exchanges = await oneShotIter(this.db, Stores.exchanges).toArray();

    for (const exchange of exchanges) {
      let isOkay: boolean = false;
      const exchangeDetails = exchange.details;
      if (!exchangeDetails) {
        continue;
      }
      const exchangeFees = exchange.wireInfo;
      if (!exchangeFees) {
        continue;
      }

      // is the exchange explicitly allowed?
      for (const allowedExchange of allowedExchanges) {
        if (allowedExchange.master_pub === exchangeDetails.masterPublicKey) {
          isOkay = true;
          break;
        }
      }

      // is the exchange allowed because of one of its auditors?
      if (!isOkay) {
        for (const allowedAuditor of allowedAuditors) {
          for (const auditor of exchangeDetails.auditors) {
            if (auditor.auditor_pub === allowedAuditor.auditor_pub) {
              isOkay = true;
              break;
            }
          }
          if (isOkay) {
            break;
          }
        }
      }

      if (!isOkay) {
        continue;
      }

      const coins = await oneShotIterIndex(
        this.db,
        Stores.coins.exchangeBaseUrlIndex,
        exchange.baseUrl,
      ).toArray();

      const denoms = await oneShotIterIndex(
        this.db,
        Stores.denominations.exchangeBaseUrlIndex,
        exchange.baseUrl,
      ).toArray();

      if (!coins || coins.length === 0) {
        continue;
      }

      // Denomination of the first coin, we assume that all other
      // coins have the same currency
      const firstDenom = await oneShotGet(this.db, Stores.denominations, [
        exchange.baseUrl,
        coins[0].denomPub,
      ]);
      if (!firstDenom) {
        throw Error("db inconsistent");
      }
      const currency = firstDenom.value.currency;
      const cds: CoinWithDenom[] = [];
      for (const coin of coins) {
        const denom = await oneShotGet(this.db, Stores.denominations, [
          exchange.baseUrl,
          coin.denomPub,
        ]);
        if (!denom) {
          throw Error("db inconsistent");
        }
        if (denom.value.currency !== currency) {
          console.warn(
            `same pubkey for different currencies at exchange ${exchange.baseUrl}`,
          );
          continue;
        }
        if (coin.suspended) {
          continue;
        }
        if (coin.status !== CoinStatus.Fresh) {
          continue;
        }
        cds.push({ coin, denom });
      }

      let totalFees = Amounts.getZero(currency);
      let wireFee: AmountJson | undefined;
      for (const fee of exchangeFees.feesForType[wireMethod] || []) {
        if (fee.startStamp <= wireFeeTime && fee.endStamp >= wireFeeTime) {
          wireFee = fee.wireFee;
          break;
        }
      }

      if (wireFee) {
        const amortizedWireFee = Amounts.divide(wireFee, wireFeeAmortization);
        if (Amounts.cmp(wireFeeLimit, amortizedWireFee) < 0) {
          totalFees = Amounts.add(amortizedWireFee, totalFees).amount;
          remainingAmount = Amounts.add(amortizedWireFee, remainingAmount)
            .amount;
        }
      }

      const res = selectPayCoins(denoms, cds, remainingAmount, depositFeeLimit);

      if (res) {
        totalFees = Amounts.add(totalFees, res.totalFees).amount;
        return {
          cds: res.cds,
          exchangeUrl: exchange.baseUrl,
          totalAmount: remainingAmount,
          totalFees,
        };
      }
    }
    return undefined;
  }

  /**
   * Record all information that is necessary to
   * pay for a proposal in the wallet's database.
   */
  private async recordConfirmPay(
    proposal: ProposalRecord,
    payCoinInfo: PayCoinInfo,
    chosenExchange: string,
  ): Promise<PurchaseRecord> {
    const payReq: PayReq = {
      coins: payCoinInfo.sigs,
      merchant_pub: proposal.contractTerms.merchant_pub,
      mode: "pay",
      order_id: proposal.contractTerms.order_id,
    };
    const t: PurchaseRecord = {
      abortDone: false,
      abortRequested: false,
      contractTerms: proposal.contractTerms,
      contractTermsHash: proposal.contractTermsHash,
      finished: false,
      lastSessionId: undefined,
      merchantSig: proposal.merchantSig,
      payReq,
      refundsDone: {},
      refundsPending: {},
      timestamp: getTimestampNow(),
      timestamp_refund: undefined,
    };

    await runWithWriteTransaction(
      this.db,
      [Stores.coins, Stores.purchases],
      async tx => {
        await tx.put(Stores.purchases, t);
        for (let c of payCoinInfo.updatedCoins) {
          await tx.put(Stores.coins, c);
        }
      },
    );

    this.badge.showNotification();
    this.notifier.notify();
    return t;
  }

  getNextUrl(contractTerms: ContractTerms): string {
    const fu = new URI(contractTerms.fulfillment_url);
    fu.addSearch("order_id", contractTerms.order_id);
    return fu.href();
  }

  /**
   * Check if a payment for the given taler://pay/ URI is possible.
   *
   * If the payment is possible, the signature are already generated but not
   * yet send to the merchant.
   */
  async preparePay(talerPayUri: string): Promise<PreparePayResult> {
    const uriResult = parsePayUri(talerPayUri);

    if (!uriResult) {
      return {
        status: "error",
        error: "URI not supported",
      };
    }

    let proposalId: string;
    try {
      proposalId = await this.downloadProposal(
        uriResult.downloadUrl,
        uriResult.sessionId,
      );
    } catch (e) {
      return {
        status: "error",
        error: e.toString(),
      };
    }
    const proposal = await this.getProposal(proposalId);
    if (!proposal) {
      throw Error(`could not get proposal ${proposalId}`);
    }

    console.log("proposal", proposal);

    const differentPurchase = await oneShotGetIndexed(
      this.db,
      Stores.purchases.fulfillmentUrlIndex,
      proposal.contractTerms.fulfillment_url,
    );

    let fulfillmentUrl = proposal.contractTerms.fulfillment_url;
    let doublePurchaseDetection = false;
    if (fulfillmentUrl.startsWith("http")) {
      doublePurchaseDetection = true;
    }

    if (differentPurchase && doublePurchaseDetection) {
      // We do this check to prevent merchant B to find out if we bought a
      // digital product with merchant A by abusing the existing payment
      // redirect feature.
      if (
        differentPurchase.contractTerms.merchant_pub !=
        proposal.contractTerms.merchant_pub
      ) {
        console.warn(
          "merchant with different public key offered contract with same fulfillment URL as an existing purchase",
        );
      } else {
        if (uriResult.sessionId) {
          await this.submitPay(
            differentPurchase.contractTermsHash,
            uriResult.sessionId,
          );
        }
        return {
          status: "paid",
          contractTerms: differentPurchase.contractTerms,
          nextUrl: this.getNextUrl(differentPurchase.contractTerms),
        };
      }
    }

    // First check if we already payed for it.
    const purchase = await oneShotGet(
      this.db,
      Stores.purchases,
      proposal.contractTermsHash,
    );

    if (!purchase) {
      const paymentAmount = Amounts.parseOrThrow(proposal.contractTerms.amount);
      let wireFeeLimit;
      if (proposal.contractTerms.max_wire_fee) {
        wireFeeLimit = Amounts.parseOrThrow(
          proposal.contractTerms.max_wire_fee,
        );
      } else {
        wireFeeLimit = Amounts.getZero(paymentAmount.currency);
      }
      // If not already payed, check if we could pay for it.
      const res = await this.getCoinsForPayment({
        allowedAuditors: proposal.contractTerms.auditors,
        allowedExchanges: proposal.contractTerms.exchanges,
        depositFeeLimit: Amounts.parseOrThrow(proposal.contractTerms.max_fee),
        paymentAmount,
        wireFeeAmortization: proposal.contractTerms.wire_fee_amortization || 1,
        wireFeeLimit,
        // FIXME: parse this properly
        wireFeeTime: extractTalerStamp(proposal.contractTerms.timestamp) || {
          t_ms: 0,
        },
        wireMethod: proposal.contractTerms.wire_method,
      });

      if (!res) {
        console.log("not confirming payment, insufficient coins");
        return {
          status: "insufficient-balance",
          contractTerms: proposal.contractTerms,
          proposalId: proposal.proposalId,
        };
      }

      // Only create speculative signature if we don't already have one for this proposal
      if (
        !this.speculativePayData ||
        (this.speculativePayData &&
          this.speculativePayData.orderDownloadId !== proposalId)
      ) {
        const { exchangeUrl, cds, totalAmount } = res;
        const payCoinInfo = await this.cryptoApi.signDeposit(
          proposal.contractTerms,
          cds,
          totalAmount,
        );
        this.speculativePayData = {
          exchangeUrl,
          payCoinInfo,
          proposal,
          orderDownloadId: proposalId,
        };
        Wallet.enableTracing &&
          console.log("created speculative pay data for payment");
      }

      return {
        status: "payment-possible",
        contractTerms: proposal.contractTerms,
        proposalId: proposal.proposalId,
        totalFees: res.totalFees,
      };
    }

    if (uriResult.sessionId) {
      await this.submitPay(purchase.contractTermsHash, uriResult.sessionId);
    }

    return {
      status: "paid",
      contractTerms: proposal.contractTerms,
      nextUrl: this.getNextUrl(purchase.contractTerms),
    };
  }

  /**
   * Download a proposal and store it in the database.
   * Returns an id for it to retrieve it later.
   *
   * @param sessionId Current session ID, if the proposal is being
   *  downloaded in the context of a session ID.
   */
  async downloadProposal(url: string, sessionId?: string): Promise<string> {
    const oldProposal = await oneShotGetIndexed(
      this.db,
      Stores.proposals.urlIndex,
      url,
    );
    if (oldProposal) {
      return oldProposal.proposalId;
    }

    const { priv, pub } = await this.cryptoApi.createEddsaKeypair();
    const parsed_url = new URI(url);
    const urlWithNonce = parsed_url.setQuery({ nonce: pub }).href();
    console.log("downloading contract from '" + urlWithNonce + "'");
    let resp;
    try {
      resp = await this.http.get(urlWithNonce);
    } catch (e) {
      console.log("contract download failed", e);
      throw e;
    }

    const proposal = Proposal.checked(resp.responseJson);

    const contractTermsHash = await this.hashContract(proposal.contract_terms);

    const proposalId = encodeCrock(getRandomBytes(32));

    const proposalRecord: ProposalRecord = {
      contractTerms: proposal.contract_terms,
      contractTermsHash,
      merchantSig: proposal.sig,
      noncePriv: priv,
      timestamp: getTimestampNow(),
      url,
      downloadSessionId: sessionId,
      proposalId: proposalId,
      proposalStatus: ProposalStatus.PROPOSED,
    };
    await oneShotPut(this.db, Stores.proposals, proposalRecord);
    this.notifier.notify();

    return proposalId;
  }

  async refundFailedPay(proposalId: number) {
    console.log(`refunding failed payment with proposal id ${proposalId}`);
    const proposal = await oneShotGet(this.db, Stores.proposals, proposalId);
    if (!proposal) {
      throw Error(`proposal with id ${proposalId} not found`);
    }

    const purchase = await oneShotGet(
      this.db,
      Stores.purchases,
      proposal.contractTermsHash,
    );

    if (!purchase) {
      throw Error("purchase not found for proposal");
    }

    if (purchase.finished) {
      throw Error("can't auto-refund finished purchase");
    }
  }

  async submitPay(
    contractTermsHash: string,
    sessionId: string | undefined,
  ): Promise<ConfirmPayResult> {
    const purchase = await oneShotGet(
      this.db,
      Stores.purchases,
      contractTermsHash,
    );
    if (!purchase) {
      throw Error("Purchase not found: " + contractTermsHash);
    }
    if (purchase.abortRequested) {
      throw Error("not submitting payment for aborted purchase");
    }
    let resp;
    const payReq = { ...purchase.payReq, session_id: sessionId };

    const payUrl = new URI("pay")
      .absoluteTo(purchase.contractTerms.merchant_base_url)
      .href();

    try {
      resp = await this.http.postJson(payUrl, payReq);
    } catch (e) {
      // Gives the user the option to retry / abort and refresh
      console.log("payment failed", e);
      throw e;
    }
    const merchantResp = resp.responseJson;
    console.log("got success from pay URL");

    const merchantPub = purchase.contractTerms.merchant_pub;
    const valid: boolean = await this.cryptoApi.isValidPaymentSignature(
      merchantResp.sig,
      contractTermsHash,
      merchantPub,
    );
    if (!valid) {
      console.error("merchant payment signature invalid");
      // FIXME: properly display error
      throw Error("merchant payment signature invalid");
    }
    purchase.finished = true;
    const modifiedCoins: CoinRecord[] = [];
    for (const pc of purchase.payReq.coins) {
      const c = await oneShotGet(this.db, Stores.coins, pc.coin_pub);
      if (!c) {
        console.error("coin not found");
        throw Error("coin used in payment not found");
      }
      c.status = CoinStatus.Dirty;
      modifiedCoins.push(c);
    }

    await runWithWriteTransaction(
      this.db,
      [Stores.coins, Stores.purchases],
      async tx => {
        for (let c of modifiedCoins) {
          tx.put(Stores.coins, c);
        }
        tx.put(Stores.purchases, purchase);
      },
    );

    for (const c of purchase.payReq.coins) {
      this.refresh(c.coin_pub);
    }

    const nextUrl = this.getNextUrl(purchase.contractTerms);
    this.cachedNextUrl[purchase.contractTerms.fulfillment_url] = {
      nextUrl,
      lastSessionId: sessionId,
    };

    return { nextUrl };
  }

  /**
   * Refresh all dirty coins.
   * The returned promise resolves only after all refresh
   * operations have completed.
   */
  async refreshDirtyCoins(): Promise<{ numRefreshed: number }> {
    let n = 0;
    const coins = await oneShotIter(this.db, Stores.coins).toArray();
    for (let coin of coins) {
      if (coin.status == CoinStatus.Dirty) {
        try {
          await this.refresh(coin.coinPub);
        } catch (e) {
          console.log("error during refresh");
        }

        n += 1;
      }
    }
    return { numRefreshed: n };
  }

  /**
   * Add a contract to the wallet and sign coins, and send them.
   */
  async confirmPay(
    proposalId: string,
    sessionIdOverride: string | undefined,
  ): Promise<ConfirmPayResult> {
    Wallet.enableTracing &&
      console.log(
        `executing confirmPay with proposalId ${proposalId} and sessionIdOverride ${sessionIdOverride}`,
      );
    const proposal = await oneShotGet(this.db, Stores.proposals, proposalId);

    if (!proposal) {
      throw Error(`proposal with id ${proposalId} not found`);
    }

    const sessionId = sessionIdOverride || proposal.downloadSessionId;

    let purchase = await oneShotGet(
      this.db,
      Stores.purchases,
      proposal.contractTermsHash,
    );

    if (purchase) {
      return this.submitPay(purchase.contractTermsHash, sessionId);
    }

    const contractAmount = Amounts.parseOrThrow(proposal.contractTerms.amount);

    let wireFeeLimit;
    if (!proposal.contractTerms.max_wire_fee) {
      wireFeeLimit = Amounts.getZero(contractAmount.currency);
    } else {
      wireFeeLimit = Amounts.parseOrThrow(proposal.contractTerms.max_wire_fee);
    }

    const res = await this.getCoinsForPayment({
      allowedAuditors: proposal.contractTerms.auditors,
      allowedExchanges: proposal.contractTerms.exchanges,
      depositFeeLimit: Amounts.parseOrThrow(proposal.contractTerms.max_fee),
      paymentAmount: Amounts.parseOrThrow(proposal.contractTerms.amount),
      wireFeeAmortization: proposal.contractTerms.wire_fee_amortization || 1,
      wireFeeLimit,
      // FIXME: parse this properly
      wireFeeTime: extractTalerStamp(proposal.contractTerms.timestamp) || {
        t_ms: 0,
      },
      wireMethod: proposal.contractTerms.wire_method,
    });

    Wallet.enableTracing && console.log("coin selection result", res);

    if (!res) {
      // Should not happen, since checkPay should be called first
      console.log("not confirming payment, insufficient coins");
      throw Error("insufficient balance");
    }

    const sd = await this.getSpeculativePayData(proposalId);
    if (!sd) {
      const { exchangeUrl, cds, totalAmount } = res;
      const payCoinInfo = await this.cryptoApi.signDeposit(
        proposal.contractTerms,
        cds,
        totalAmount,
      );
      purchase = await this.recordConfirmPay(
        proposal,
        payCoinInfo,
        exchangeUrl,
      );
    } else {
      purchase = await this.recordConfirmPay(
        sd.proposal,
        sd.payCoinInfo,
        sd.exchangeUrl,
      );
    }

    return this.submitPay(purchase.contractTermsHash, sessionId);
  }

  /**
   * Get the speculative pay data, but only if coins have not changed in between.
   */
  async getSpeculativePayData(
    proposalId: string,
  ): Promise<SpeculativePayData | undefined> {
    const sp = this.speculativePayData;
    if (!sp) {
      return;
    }
    if (sp.orderDownloadId !== proposalId) {
      return;
    }
    const coinKeys = sp.payCoinInfo.updatedCoins.map(x => x.coinPub);
    const coins: CoinRecord[] = [];
    for (let coinKey of coinKeys) {
      const cc = await oneShotGet(this.db, Stores.coins, coinKey);
      if (cc) {
        coins.push(cc);
      }
    }
    for (let i = 0; i < coins.length; i++) {
      const specCoin = sp.payCoinInfo.originalCoins[i];
      const currentCoin = coins[i];

      // Coin does not exist anymore!
      if (!currentCoin) {
        return;
      }
      if (
        Amounts.cmp(specCoin.currentAmount, currentCoin.currentAmount) !== 0
      ) {
        return;
      }
    }
    return sp;
  }

  private async processReserveBankStatus(reservePub: string): Promise<void> {
    let reserve = await oneShotGet(this.db, Stores.reserves, reservePub);
    switch (reserve?.reserveStatus) {
      case ReserveRecordStatus.WAIT_CONFIRM_BANK:
      case ReserveRecordStatus.REGISTERING_BANK:
        break;
      default:
        return;
    }
    const bankStatusUrl = reserve.bankWithdrawStatusUrl;
    if (!bankStatusUrl) {
      return;
    }

    let status: WithdrawOperationStatusResponse;
    try {
      const statusResp = await this.http.get(bankStatusUrl);
      status = WithdrawOperationStatusResponse.checked(statusResp.responseJson);
    } catch (e) {
      throw e;
    }

    if (status.selection_done) {
      if (reserve.reserveStatus === ReserveRecordStatus.REGISTERING_BANK) {
        await this.registerReserveWithBank(reservePub);
        return await this.processReserveBankStatus(reservePub);
      }
    } else {
      await this.registerReserveWithBank(reservePub);
      return await this.processReserveBankStatus(reservePub);
    }

    if (status.transfer_done) {
      await oneShotMutate(this.db, Stores.reserves, reservePub, r => {
        switch (r.reserveStatus) {
          case ReserveRecordStatus.REGISTERING_BANK:
          case ReserveRecordStatus.WAIT_CONFIRM_BANK:
            break;
          default:
            return;
        }
        const now = getTimestampNow();
        r.timestampConfirmed = now;
        r.reserveStatus = ReserveRecordStatus.QUERYING_STATUS;
        return r;
      });
      await this.processReserveImpl(reservePub);
    } else {
      await oneShotMutate(this.db, Stores.reserves, reservePub, r => {
        switch (r.reserveStatus) {
          case ReserveRecordStatus.WAIT_CONFIRM_BANK:
            break;
          default:
            return;
        }
        r.bankWithdrawConfirmUrl = status.confirm_transfer_url;
        return r;
      });
    }
  }

  async registerReserveWithBank(reservePub: string) {
    let reserve = await oneShotGet(this.db, Stores.reserves, reservePub);
    switch (reserve?.reserveStatus) {
      case ReserveRecordStatus.WAIT_CONFIRM_BANK:
      case ReserveRecordStatus.REGISTERING_BANK:
        break;
      default:
        return;
    }
    const bankStatusUrl = reserve.bankWithdrawStatusUrl;
    if (!bankStatusUrl) {
      return;
    }
    console.log("making selection");
    if (reserve.timestampReserveInfoPosted) {
      throw Error("bank claims that reserve info selection is not done");
    }
    const bankResp = await this.http.postJson(bankStatusUrl, {
      reserve_pub: reservePub,
      selected_exchange: reserve.exchangeWire,
    });
    console.log("got response", bankResp);
    await oneShotMutate(this.db, Stores.reserves, reservePub, r => {
      switch (r.reserveStatus) {
        case ReserveRecordStatus.REGISTERING_BANK:
        case ReserveRecordStatus.WAIT_CONFIRM_BANK:
          break;
        default:
          return;
      }
      r.timestampReserveInfoPosted = getTimestampNow();
      r.reserveStatus = ReserveRecordStatus.WAIT_CONFIRM_BANK;
      return r;
    });
    return this.processReserveBankStatus(reservePub);
  }

  /**
   * First fetch information requred to withdraw from the reserve,
   * then deplete the reserve, withdrawing coins until it is empty.
   *
   * The returned promise resolves once the reserve is set to the
   * state DORMANT.
   */
  async processReserve(reservePub: string): Promise<void> {
    const p = this.memoProcessReserve.find(reservePub);
    if (p) {
      return p;
    } else {
      return this.memoProcessReserve.put(
        reservePub,
        this.processReserveImpl(reservePub),
      );
    }
  }

  private async processReserveImpl(reservePub: string): Promise<void> {
    const reserve = await oneShotGet(this.db, Stores.reserves, reservePub);
    if (!reserve) {
      console.log("not processing reserve: reserve does not exist");
      return;
    }
    logger.trace(
      `Processing reserve ${reservePub} with status ${reserve.reserveStatus}`,
    );
    switch (reserve.reserveStatus) {
      case ReserveRecordStatus.UNCONFIRMED:
        // nothing to do
        break;
      case ReserveRecordStatus.REGISTERING_BANK:
        await this.processReserveBankStatus(reservePub);
        return this.processReserveImpl(reservePub);
      case ReserveRecordStatus.QUERYING_STATUS:
        await this.updateReserve(reservePub);
        return this.processReserveImpl(reservePub);
      case ReserveRecordStatus.WITHDRAWING:
        await this.depleteReserve(reservePub);
        break;
      case ReserveRecordStatus.DORMANT:
        // nothing to do
        break;
      case ReserveRecordStatus.WAIT_CONFIRM_BANK:
        await this.processReserveBankStatus(reservePub);
        break;
      default:
        console.warn("unknown reserve record status:", reserve.reserveStatus);
        assertUnreachable(reserve.reserveStatus);
        break;
    }
  }

  /**
   * Given a planchet, withdraw a coin from the exchange.
   */
  private async processPlanchet(coinPub: string): Promise<void> {
    logger.trace("process planchet", coinPub);
    const planchet = await oneShotGet(this.db, Stores.planchets, coinPub);
    if (!planchet) {
      console.log("processPlanchet: planchet not found");
      return;
    }
    const exchange = await oneShotGet(
      this.db,
      Stores.exchanges,
      planchet.exchangeBaseUrl,
    );
    if (!exchange) {
      console.error("db inconsistent: exchange for planchet not found");
      return;
    }

    const denom = await oneShotGet(this.db, Stores.denominations, [
      planchet.exchangeBaseUrl,
      planchet.denomPub,
    ]);

    if (!denom) {
      console.error("db inconsistent: denom for planchet not found");
      return;
    }

    const wd: any = {};
    wd.denom_pub_hash = planchet.denomPubHash;
    wd.reserve_pub = planchet.reservePub;
    wd.reserve_sig = planchet.withdrawSig;
    wd.coin_ev = planchet.coinEv;
    const reqUrl = new URI("reserve/withdraw").absoluteTo(exchange.baseUrl);
    const resp = await this.http.postJson(reqUrl.href(), wd);

    const r = resp.responseJson;

    const denomSig = await this.cryptoApi.rsaUnblind(
      r.ev_sig,
      planchet.blindingKey,
      planchet.denomPub,
    );

    const coin: CoinRecord = {
      blindingKey: planchet.blindingKey,
      coinPriv: planchet.coinPriv,
      coinPub: planchet.coinPub,
      currentAmount: planchet.coinValue,
      denomPub: planchet.denomPub,
      denomPubHash: planchet.denomPubHash,
      denomSig,
      exchangeBaseUrl: planchet.exchangeBaseUrl,
      reservePub: planchet.reservePub,
      status: CoinStatus.Fresh,
      coinIndex: planchet.coinIndex,
      withdrawSessionId: planchet.withdrawSessionId,
    };

    await runWithWriteTransaction(
      this.db,
      [Stores.planchets, Stores.coins, Stores.withdrawalSession, Stores.reserves],
      async tx => {
        const currentPc = await tx.get(Stores.planchets, coin.coinPub);
        if (!currentPc) {
          return;
        }
        const ws = await tx.get(
          Stores.withdrawalSession,
          planchet.withdrawSessionId,
        );
        if (!ws) {
          return;
        }
        if (ws.withdrawn[planchet.coinIndex]) {
          // Already withdrawn
          return;
        }
        ws.withdrawn[planchet.coinIndex] = true;
        await tx.put(Stores.withdrawalSession, ws);
        const r = await tx.get(Stores.reserves, planchet.reservePub);
        if (!r) {
          return;
        }
        r.withdrawCompletedAmount = Amounts.add(
          r.withdrawCompletedAmount,
          Amounts.add(denom.value, denom.feeWithdraw).amount,
        ).amount;
        tx.put(Stores.reserves, r);
        await tx.delete(Stores.planchets, coin.coinPub);
        await tx.add(Stores.coins, coin);
      },
    );
    this.notifier.notify();
    logger.trace(`withdraw of one coin ${coin.coinPub} finished`);
  }

  /**
   * Create a reserve, but do not flag it as confirmed yet.
   *
   * Adds the corresponding exchange as a trusted exchange if it is neither
   * audited nor trusted already.
   */
  async createReserve(
    req: CreateReserveRequest,
  ): Promise<CreateReserveResponse> {
    const keypair = await this.cryptoApi.createEddsaKeypair();
    const now = getTimestampNow();
    const canonExchange = canonicalizeBaseUrl(req.exchange);

    let reserveStatus;
    if (req.bankWithdrawStatusUrl) {
      reserveStatus = ReserveRecordStatus.REGISTERING_BANK;
    } else {
      reserveStatus = ReserveRecordStatus.UNCONFIRMED;
    }

    const currency = req.amount.currency;

    const reserveRecord: ReserveRecord = {
      created: now,
      withdrawAllocatedAmount: Amounts.getZero(currency),
      withdrawCompletedAmount: Amounts.getZero(currency),
      withdrawRemainingAmount: Amounts.getZero(currency),
      exchangeBaseUrl: canonExchange,
      hasPayback: false,
      initiallyRequestedAmount: req.amount,
      reservePriv: keypair.priv,
      reservePub: keypair.pub,
      senderWire: req.senderWire,
      timestampConfirmed: undefined,
      timestampReserveInfoPosted: undefined,
      bankWithdrawStatusUrl: req.bankWithdrawStatusUrl,
      exchangeWire: req.exchangeWire,
      reserveStatus,
      lastStatusQuery: undefined,
    };

    const senderWire = req.senderWire;
    if (senderWire) {
      const rec = {
        paytoUri: senderWire,
      };
      await oneShotPut(this.db, Stores.senderWires, rec);
    }

    const exchangeInfo = await this.updateExchangeFromUrl(req.exchange);
    const exchangeDetails = exchangeInfo.details;
    if (!exchangeDetails) {
      throw Error("exchange not updated");
    }
    const { isAudited, isTrusted } = await this.getExchangeTrust(exchangeInfo);
    let currencyRecord = await oneShotGet(
      this.db,
      Stores.currencies,
      exchangeDetails.currency,
    );
    if (!currencyRecord) {
      currencyRecord = {
        auditors: [],
        exchanges: [],
        fractionalDigits: 2,
        name: exchangeDetails.currency,
      };
    }

    if (!isAudited && !isTrusted) {
      currencyRecord.exchanges.push({
        baseUrl: req.exchange,
        exchangePub: exchangeDetails.masterPublicKey,
      });
    }

    const cr: CurrencyRecord = currencyRecord;

    const resp = await runWithWriteTransaction(
      this.db,
      [Stores.currencies, Stores.reserves, Stores.bankWithdrawUris],
      async tx => {
        // Check if we have already created a reserve for that bankWithdrawStatusUrl
        if (reserveRecord.bankWithdrawStatusUrl) {
          const bwi = await tx.get(
            Stores.bankWithdrawUris,
            reserveRecord.bankWithdrawStatusUrl,
          );
          if (bwi) {
            const otherReserve = await tx.get(Stores.reserves, bwi.reservePub);
            if (otherReserve) {
              logger.trace(
                "returning existing reserve for bankWithdrawStatusUri",
              );
              return {
                exchange: otherReserve.exchangeBaseUrl,
                reservePub: otherReserve.reservePub,
              };
            }
          }
          await tx.put(Stores.bankWithdrawUris, {
            reservePub: reserveRecord.reservePub,
            talerWithdrawUri: reserveRecord.bankWithdrawStatusUrl,
          });
        }
        await tx.put(Stores.currencies, cr);
        await tx.put(Stores.reserves, reserveRecord);
        const r: CreateReserveResponse = {
          exchange: canonExchange,
          reservePub: keypair.pub,
        };
        return r;
      },
    );

    // Asynchronously process the reserve, but return
    // to the caller already.
    this.processReserve(resp.reservePub).catch(e => {
      console.error("Processing reserve failed:", e);
    });

    return resp;
  }

  /**
   * Mark an existing reserve as confirmed.  The wallet will start trying
   * to withdraw from that reserve.  This may not immediately succeed,
   * since the exchange might not know about the reserve yet, even though the
   * bank confirmed its creation.
   *
   * A confirmed reserve should be shown to the user in the UI, while
   * an unconfirmed reserve should be hidden.
   */
  async confirmReserve(req: ConfirmReserveRequest): Promise<void> {
    const now = getTimestampNow();
    await oneShotMutate(this.db, Stores.reserves, req.reservePub, reserve => {
      if (reserve.reserveStatus !== ReserveRecordStatus.UNCONFIRMED) {
        return;
      }
      reserve.timestampConfirmed = now;
      reserve.reserveStatus = ReserveRecordStatus.QUERYING_STATUS;
      return reserve;
    });

    this.notifier.notify();

    this.processReserve(req.reservePub).catch(e => {
      console.log("processing reserve failed:", e);
    });
  }

  /**
   * Withdraw coins from a reserve until it is empty.
   *
   * When finished, marks the reserve as depleted by setting
   * the depleted timestamp.
   */
  private async depleteReserve(reservePub: string): Promise<void> {
    const reserve = await oneShotGet(this.db, Stores.reserves, reservePub);
    if (!reserve) {
      return;
    }
    if (reserve.reserveStatus !== ReserveRecordStatus.WITHDRAWING) {
      return;
    }
    logger.trace(`depleting reserve ${reservePub}`);

    const withdrawAmount = reserve.withdrawRemainingAmount;

    logger.trace(`getting denom list`);

    const denomsForWithdraw = await this.getVerifiedWithdrawDenomList(
      reserve.exchangeBaseUrl,
      withdrawAmount,
    );
    logger.trace(`got denom list`);
    if (denomsForWithdraw.length === 0) {
      const m = `Unable to withdraw from reserve, no denominations are available to withdraw.`;
      await this.setReserveError(reserve.reservePub, {
        type: "internal",
        message: m,
        details: {},
      });
      console.log(m);
      throw new OperationFailedAndReportedError(m);
    }

    logger.trace("selected denominations");

    const withdrawalSessionId = encodeCrock(randomBytes(32));

    const withdrawalRecord: WithdrawalSessionRecord = {
      withdrawSessionId: withdrawalSessionId,
      reservePub: reserve.reservePub,
      withdrawalAmount: Amounts.toString(withdrawAmount),
      startTimestamp: getTimestampNow(),
      denoms: denomsForWithdraw.map(x => x.denomPub),
      withdrawn: denomsForWithdraw.map(x => false),
      planchetCreated: denomsForWithdraw.map(x => false),
    };

    const totalCoinValue = Amounts.sum(denomsForWithdraw.map(x => x.value))
      .amount;
    const totalCoinWithdrawFee = Amounts.sum(
      denomsForWithdraw.map(x => x.feeWithdraw),
    ).amount;
    const totalWithdrawAmount = Amounts.add(
      totalCoinValue,
      totalCoinWithdrawFee,
    ).amount;

    function mutateReserve(r: ReserveRecord): ReserveRecord {
      const remaining = Amounts.sub(
        r.withdrawRemainingAmount,
        totalWithdrawAmount,
      );
      if (remaining.saturated) {
        console.error("can't create planchets, saturated");
        throw TransactionAbort;
      }
      const allocated = Amounts.add(
        r.withdrawAllocatedAmount,
        totalWithdrawAmount,
      );
      if (allocated.saturated) {
        console.error("can't create planchets, saturated");
        throw TransactionAbort;
      }
      r.withdrawRemainingAmount = remaining.amount;
      r.withdrawAllocatedAmount = allocated.amount;
      r.reserveStatus = ReserveRecordStatus.DORMANT;

      return r;
    }

    const success = await runWithWriteTransaction(
      this.db,
      [Stores.planchets, Stores.withdrawalSession, Stores.reserves],
      async tx => {
        const myReserve = await tx.get(Stores.reserves, reservePub);
        if (!myReserve) {
          return false;
        }
        if (myReserve.reserveStatus !== ReserveRecordStatus.WITHDRAWING) {
          return false;
        }
        await tx.mutate(Stores.reserves, reserve.reservePub, mutateReserve);
        await tx.put(Stores.withdrawalSession, withdrawalRecord);
        return true;
      },
    );

    if (success) {
      console.log("processing new withdraw session");
      await this.processWithdrawSession(withdrawalSessionId);
    } else {
      console.trace("withdraw session already existed");
    }
  }

  private async processWithdrawSession(withdrawalSessionId: string): Promise<void> {
    logger.trace("processing withdraw session", withdrawalSessionId);
    const ws = await oneShotGet(
      this.db,
      Stores.withdrawalSession,
      withdrawalSessionId,
    );
    if (!ws) {
      logger.trace("withdraw session doesn't exist");
      return;
    }

    const ps = ws.denoms.map((d, i) =>
      this.processWithdrawCoin(withdrawalSessionId, i),
    );
    await Promise.all(ps);
    this.badge.showNotification();
    return;
  }

  private async processWithdrawCoin(
    withdrawalSessionId: string,
    coinIndex: number,
  ) {
    logger.info("starting withdraw for coin");
    const ws = await oneShotGet(
      this.db,
      Stores.withdrawalSession,
      withdrawalSessionId,
    );
    if (!ws) {
      console.log("ws doesn't exist");
      return;
    }

    const coin = await oneShotGetIndexed(
      this.db,
      Stores.coins.byWithdrawalWithIdx,
      [withdrawalSessionId, coinIndex],
    );

    if (coin) {
      console.log("coin already exists");
      return;
    }

    const pc = await oneShotGetIndexed(
      this.db,
      Stores.planchets.byWithdrawalWithIdx,
      [withdrawalSessionId, coinIndex],
    );

    if (pc) {
      return this.processPlanchet(pc.coinPub);
    } else {
      const reserve = await oneShotGet(this.db, Stores.reserves, ws.reservePub);
      if (!reserve) {
        return;
      }
      const denom = await oneShotGet(this.db, Stores.denominations, [
        reserve.exchangeBaseUrl,
        ws.denoms[coinIndex],
      ]);
      if (!denom) {
        return;
      }
      const r = await this.cryptoApi.createPlanchet(denom, reserve);
      const newPlanchet: PlanchetRecord = {
        blindingKey: r.blindingKey,
        coinEv: r.coinEv,
        coinIndex,
        coinPriv: r.coinPriv,
        coinPub: r.coinPub,
        coinValue: r.coinValue,
        denomPub: r.denomPub,
        denomPubHash: r.denomPubHash,
        exchangeBaseUrl: r.exchangeBaseUrl,
        isFromTip: false,
        reservePub: r.reservePub,
        withdrawSessionId: withdrawalSessionId,
        withdrawSig: r.withdrawSig,
      };
      await runWithWriteTransaction(this.db, [Stores.planchets, Stores.withdrawalSession], async (tx) => {
        const myWs = await tx.get(Stores.withdrawalSession, withdrawalSessionId);
        if (!myWs) {
          return;
        }
        if (myWs.planchetCreated[coinIndex]) {
          return;
        }
        await tx.put(Stores.planchets, newPlanchet);
      });
      await this.processPlanchet(newPlanchet.coinPub);
    }
  }

  /**
   * Update the information about a reserve that is stored in the wallet
   * by quering the reserve's exchange.
   */
  private async updateReserve(reservePub: string): Promise<void> {
    const reserve = await oneShotGet(this.db, Stores.reserves, reservePub);
    if (!reserve) {
      throw Error("reserve not in db");
    }

    if (reserve.timestampConfirmed === undefined) {
      throw Error("reserve not confirmed yet");
    }

    if (reserve.reserveStatus !== ReserveRecordStatus.QUERYING_STATUS) {
      return;
    }

    const reqUrl = new URI("reserve/status").absoluteTo(
      reserve.exchangeBaseUrl,
    );
    reqUrl.query({ reserve_pub: reservePub });
    let resp;
    try {
      resp = await this.http.get(reqUrl.href());
    } catch (e) {
      if (e.response?.status === 404) {
        return;
      } else {
        const m = e.message;
        this.setReserveError(reservePub, {
          type: "network",
          details: {},
          message: m,
        });
        throw new OperationFailedAndReportedError(m);
      }
    }
    const reserveInfo = ReserveStatus.checked(resp.responseJson);
    const balance = Amounts.parseOrThrow(reserveInfo.balance);
    await oneShotMutate(this.db, Stores.reserves, reserve.reservePub, r => {
      if (r.reserveStatus !== ReserveRecordStatus.QUERYING_STATUS) {
        return;
      }

      // FIXME: check / compare history!
      if (!r.lastStatusQuery) {
        // FIXME: check if this matches initial expectations
        r.withdrawRemainingAmount = balance;
      } else {
        const expectedBalance = Amounts.sub(
          r.withdrawAllocatedAmount,
          r.withdrawCompletedAmount,
        );
        const cmp = Amounts.cmp(balance, expectedBalance.amount);
        if (cmp == 0) {
          // Nothing changed.
          return;
        }
        if (cmp > 0) {
          const extra = Amounts.sub(balance, expectedBalance.amount).amount;
          r.withdrawRemainingAmount = Amounts.add(
            r.withdrawRemainingAmount,
            extra,
          ).amount;
        } else {
          // We're missing some money.
        }
      }
      r.lastStatusQuery = getTimestampNow();
      r.reserveStatus = ReserveRecordStatus.WITHDRAWING;
      return r;
    });
    this.notifier.notify();
  }

  async getPossibleDenoms(
    exchangeBaseUrl: string,
  ): Promise<DenominationRecord[]> {
    return await oneShotIterIndex(
      this.db,
      Stores.denominations.exchangeBaseUrlIndex,
      exchangeBaseUrl,
    ).filter(d => {
      return (
        d.status === DenominationStatus.Unverified ||
        d.status === DenominationStatus.VerifiedGood
      );
    });
  }

  /**
   * Compute the smallest withdrawable amount possible, based on verified denominations.
   *
   * Writes to the DB in order to record the result from verifying
   * denominations.
   */
  async getVerifiedSmallestWithdrawAmount(
    exchangeBaseUrl: string,
  ): Promise<AmountJson> {
    const exchange = await oneShotGet(
      this.db,
      Stores.exchanges,
      exchangeBaseUrl,
    );
    if (!exchange) {
      throw Error(`exchange ${exchangeBaseUrl} not found`);
    }
    const exchangeDetails = exchange.details;
    if (!exchangeDetails) {
      throw Error(`exchange ${exchangeBaseUrl} details not available`);
    }

    const possibleDenoms = await this.getPossibleDenoms(exchange.baseUrl);

    possibleDenoms.sort((d1, d2) => {
      const a1 = Amounts.add(d1.feeWithdraw, d1.value).amount;
      const a2 = Amounts.add(d2.feeWithdraw, d2.value).amount;
      return Amounts.cmp(a1, a2);
    });

    for (const denom of possibleDenoms) {
      if (denom.status === DenominationStatus.VerifiedGood) {
        return Amounts.add(denom.feeWithdraw, denom.value).amount;
      }
      const valid = await this.cryptoApi.isValidDenom(
        denom,
        exchangeDetails.masterPublicKey,
      );
      if (!valid) {
        denom.status = DenominationStatus.VerifiedBad;
      } else {
        denom.status = DenominationStatus.VerifiedGood;
      }
      await oneShotPut(this.db, Stores.denominations, denom);
      if (valid) {
        return Amounts.add(denom.feeWithdraw, denom.value).amount;
      }
    }
    return Amounts.getZero(exchangeDetails.currency);
  }

  /**
   * Get a list of denominations to withdraw from the given exchange for the
   * given amount, making sure that all denominations' signatures are verified.
   *
   * Writes to the DB in order to record the result from verifying
   * denominations.
   */
  async getVerifiedWithdrawDenomList(
    exchangeBaseUrl: string,
    amount: AmountJson,
  ): Promise<DenominationRecord[]> {
    const exchange = await oneShotGet(
      this.db,
      Stores.exchanges,
      exchangeBaseUrl,
    );
    if (!exchange) {
      console.log("exchange not found");
      throw Error(`exchange ${exchangeBaseUrl} not found`);
    }
    const exchangeDetails = exchange.details;
    if (!exchangeDetails) {
      console.log("exchange details not available");
      throw Error(`exchange ${exchangeBaseUrl} details not available`);
    }

    console.log("getting possible denoms");

    const possibleDenoms = await this.getPossibleDenoms(exchange.baseUrl);

    console.log("got possible denoms");

    let allValid = false;

    let selectedDenoms: DenominationRecord[];

    do {
      allValid = true;
      const nextPossibleDenoms = [];
      selectedDenoms = getWithdrawDenomList(amount, possibleDenoms);
      console.log("got withdraw denom list");
      for (const denom of selectedDenoms || []) {
        if (denom.status === DenominationStatus.Unverified) {
          console.log("checking validity", denom, exchangeDetails.masterPublicKey);
          const valid = await this.cryptoApi.isValidDenom(
            denom,
            exchangeDetails.masterPublicKey,
          );
          console.log("done checking validity");
          if (!valid) {
            denom.status = DenominationStatus.VerifiedBad;
            allValid = false;
          } else {
            denom.status = DenominationStatus.VerifiedGood;
            nextPossibleDenoms.push(denom);
          }
          await oneShotPut(this.db, Stores.denominations, denom);
        } else {
          nextPossibleDenoms.push(denom);
        }
      }
    } while (selectedDenoms.length > 0 && !allValid);

    console.log("returning denoms");

    return selectedDenoms;
  }

  /**
   * Check if and how an exchange is trusted and/or audited.
   */
  async getExchangeTrust(
    exchangeInfo: ExchangeRecord,
  ): Promise<{ isTrusted: boolean; isAudited: boolean }> {
    let isTrusted = false;
    let isAudited = false;
    const exchangeDetails = exchangeInfo.details;
    if (!exchangeDetails) {
      throw Error(`exchange ${exchangeInfo.baseUrl} details not available`);
    }
    const currencyRecord = await oneShotGet(
      this.db,
      Stores.currencies,
      exchangeDetails.currency,
    );
    if (currencyRecord) {
      for (const trustedExchange of currencyRecord.exchanges) {
        if (trustedExchange.exchangePub === exchangeDetails.masterPublicKey) {
          isTrusted = true;
          break;
        }
      }
      for (const trustedAuditor of currencyRecord.auditors) {
        for (const exchangeAuditor of exchangeDetails.auditors) {
          if (trustedAuditor.auditorPub === exchangeAuditor.auditor_pub) {
            isAudited = true;
            break;
          }
        }
      }
    }
    return { isTrusted, isAudited };
  }

  async getWithdrawDetailsForUri(
    talerWithdrawUri: string,
    maybeSelectedExchange?: string,
  ): Promise<WithdrawDetails> {
    const info = await this.getWithdrawalInfo(talerWithdrawUri);
    let rci: ReserveCreationInfo | undefined = undefined;
    if (maybeSelectedExchange) {
      rci = await this.getWithdrawDetailsForAmount(
        maybeSelectedExchange,
        info.amount,
      );
    }
    return {
      withdrawInfo: info,
      reserveCreationInfo: rci,
    };
  }

  async getWithdrawDetailsForAmount(
    baseUrl: string,
    amount: AmountJson,
  ): Promise<ReserveCreationInfo> {
    const exchangeInfo = await this.updateExchangeFromUrl(baseUrl);
    const exchangeDetails = exchangeInfo.details;
    if (!exchangeDetails) {
      throw Error(`exchange ${exchangeInfo.baseUrl} details not available`);
    }
    const exchangeWireInfo = exchangeInfo.wireInfo;
    if (!exchangeWireInfo) {
      throw Error(
        `exchange ${exchangeInfo.baseUrl} wire details not available`,
      );
    }

    const selectedDenoms = await this.getVerifiedWithdrawDenomList(
      baseUrl,
      amount,
    );
    let acc = Amounts.getZero(amount.currency);
    for (const d of selectedDenoms) {
      acc = Amounts.add(acc, d.feeWithdraw).amount;
    }
    const actualCoinCost = selectedDenoms
      .map(
        (d: DenominationRecord) => Amounts.add(d.value, d.feeWithdraw).amount,
      )
      .reduce((a, b) => Amounts.add(a, b).amount);

    const exchangeWireAccounts: string[] = [];
    for (let account of exchangeWireInfo.accounts) {
      exchangeWireAccounts.push(account.url);
    }

    const { isTrusted, isAudited } = await this.getExchangeTrust(exchangeInfo);

    let earliestDepositExpiration = selectedDenoms[0].stampExpireDeposit;
    for (let i = 1; i < selectedDenoms.length; i++) {
      const expireDeposit = selectedDenoms[i].stampExpireDeposit;
      if (expireDeposit.t_ms < earliestDepositExpiration.t_ms) {
        earliestDepositExpiration = expireDeposit;
      }
    }

    const possibleDenoms = await oneShotIterIndex(
      this.db,
      Stores.denominations.exchangeBaseUrlIndex,
      baseUrl,
    ).filter(d => d.isOffered);

    const trustedAuditorPubs = [];
    const currencyRecord = await oneShotGet(
      this.db,
      Stores.currencies,
      amount.currency,
    );
    if (currencyRecord) {
      trustedAuditorPubs.push(
        ...currencyRecord.auditors.map(a => a.auditorPub),
      );
    }

    let versionMatch;
    if (exchangeDetails.protocolVersion) {
      versionMatch = LibtoolVersion.compare(
        WALLET_PROTOCOL_VERSION,
        exchangeDetails.protocolVersion,
      );

      if (
        versionMatch &&
        !versionMatch.compatible &&
        versionMatch.currentCmp === -1
      ) {
        console.warn(
          `wallet version ${WALLET_PROTOCOL_VERSION} might be outdated ` +
            `(exchange has ${exchangeDetails.protocolVersion}), checking for updates`,
        );
        if (isFirefox()) {
          console.log("skipping update check on Firefox");
        } else {
          chrome.runtime.requestUpdateCheck((status, details) => {
            console.log("update check status:", status);
          });
        }
      }
    }

    const ret: ReserveCreationInfo = {
      earliestDepositExpiration,
      exchangeInfo,
      exchangeWireAccounts,
      exchangeVersion: exchangeDetails.protocolVersion || "unknown",
      isAudited,
      isTrusted,
      numOfferedDenoms: possibleDenoms.length,
      overhead: Amounts.sub(amount, actualCoinCost).amount,
      selectedDenoms,
      trustedAuditorPubs,
      versionMatch,
      walletVersion: WALLET_PROTOCOL_VERSION,
      wireFees: exchangeWireInfo,
      withdrawFee: acc,
    };
    return ret;
  }

  async getExchangePaytoUri(
    exchangeBaseUrl: string,
    supportedTargetTypes: string[],
  ): Promise<string> {
    // We do the update here, since the exchange might not even exist
    // yet in our database.
    const exchangeRecord = await this.updateExchangeFromUrl(exchangeBaseUrl);
    if (!exchangeRecord) {
      throw Error(`Exchange '${exchangeBaseUrl}' not found.`);
    }
    const exchangeWireInfo = exchangeRecord.wireInfo;
    if (!exchangeWireInfo) {
      throw Error(`Exchange wire info for '${exchangeBaseUrl}' not found.`);
    }
    for (let account of exchangeWireInfo.accounts) {
      const paytoUri = new URI(account.url);
      if (supportedTargetTypes.includes(paytoUri.authority())) {
        return account.url;
      }
    }
    throw Error("no matching exchange account found");
  }

  /**
   * Update or add exchange DB entry by fetching the /keys and /wire information.
   * Optionally link the reserve entry to the new or existing
   * exchange entry in then DB.
   */
  async updateExchangeFromUrl(
    baseUrl: string,
    force: boolean = false,
  ): Promise<ExchangeRecord> {
    const now = getTimestampNow();
    baseUrl = canonicalizeBaseUrl(baseUrl);

    const r = await oneShotGet(this.db, Stores.exchanges, baseUrl);
    if (!r) {
      const newExchangeRecord: ExchangeRecord = {
        baseUrl: baseUrl,
        details: undefined,
        wireInfo: undefined,
        updateStatus: ExchangeUpdateStatus.FETCH_KEYS,
        updateStarted: now,
        updateReason: "initial",
        timestampAdded: getTimestampNow(),
      };
      await oneShotPut(this.db, Stores.exchanges, newExchangeRecord);
    } else {
      await runWithWriteTransaction(this.db, [Stores.exchanges], async t => {
        const rec = await t.get(Stores.exchanges, baseUrl);
        if (!rec) {
          return;
        }
        if (rec.updateStatus != ExchangeUpdateStatus.FETCH_KEYS && !force) {
          return;
        }
        if (rec.updateStatus != ExchangeUpdateStatus.FETCH_KEYS && force) {
          rec.updateReason = "forced";
        }
        rec.updateStarted = now;
        rec.updateStatus = ExchangeUpdateStatus.FETCH_KEYS;
        rec.lastError = undefined;
        t.put(Stores.exchanges, rec);
      });
    }

    await this.updateExchangeWithKeys(baseUrl);
    await this.updateExchangeWithWireInfo(baseUrl);

    const updatedExchange = await oneShotGet(
      this.db,
      Stores.exchanges,
      baseUrl,
    );

    if (!updatedExchange) {
      // This should practically never happen
      throw Error("exchange not found");
    }
    return updatedExchange;
  }

  private async setExchangeError(
    baseUrl: string,
    err: OperationError,
  ): Promise<void> {
    const mut = (exchange: ExchangeRecord) => {
      exchange.lastError = err;
      return exchange;
    };
    await oneShotMutate(this.db, Stores.exchanges, baseUrl, mut);
  }

  private async setReserveError(
    reservePub: string,
    err: OperationError,
  ): Promise<void> {
    const mut = (reserve: ReserveRecord) => {
      reserve.lastError = err;
      return reserve;
    };
    await oneShotMutate(this.db, Stores.reserves, reservePub, mut);
  }

  /**
   * Fetch the exchange's /keys and update our database accordingly.
   *
   * Exceptions thrown in this method must be caught and reported
   * in the pending operations.
   */
  private async updateExchangeWithKeys(baseUrl: string): Promise<void> {
    const existingExchangeRecord = await oneShotGet(
      this.db,
      Stores.exchanges,
      baseUrl,
    );

    if (
      existingExchangeRecord?.updateStatus != ExchangeUpdateStatus.FETCH_KEYS
    ) {
      return;
    }
    const keysUrl = new URI("keys")
      .absoluteTo(baseUrl)
      .addQuery("cacheBreaker", WALLET_CACHE_BREAKER_CLIENT_VERSION);
    let keysResp;
    try {
      keysResp = await this.http.get(keysUrl.href());
    } catch (e) {
      const m = `Fetching keys failed: ${e.message}`;
      await this.setExchangeError(baseUrl, {
        type: "network",
        details: {
          requestUrl: e.config?.url,
        },
        message: m,
      });
      throw new OperationFailedAndReportedError(m);
    }
    let exchangeKeysJson: KeysJson;
    try {
      exchangeKeysJson = KeysJson.checked(keysResp.responseJson);
    } catch (e) {
      const m = `Parsing /keys response failed: ${e.message}`;
      await this.setExchangeError(baseUrl, {
        type: "protocol-violation",
        details: {},
        message: m,
      });
      throw new OperationFailedAndReportedError(m);
    }

    const lastUpdateTimestamp = extractTalerStamp(
      exchangeKeysJson.list_issue_date,
    );
    if (!lastUpdateTimestamp) {
      const m = `Parsing /keys response failed: invalid list_issue_date.`;
      await this.setExchangeError(baseUrl, {
        type: "protocol-violation",
        details: {},
        message: m,
      });
      throw new OperationFailedAndReportedError(m);
    }

    if (exchangeKeysJson.denoms.length === 0) {
      const m = "exchange doesn't offer any denominations";
      await this.setExchangeError(baseUrl, {
        type: "protocol-violation",
        details: {},
        message: m,
      });
      throw new OperationFailedAndReportedError(m);
    }

    const protocolVersion = exchangeKeysJson.version;
    if (!protocolVersion) {
      const m = "outdate exchange, no version in /keys response";
      await this.setExchangeError(baseUrl, {
        type: "protocol-violation",
        details: {},
        message: m,
      });
      throw new OperationFailedAndReportedError(m);
    }

    const currency = Amounts.parseOrThrow(exchangeKeysJson.denoms[0].value)
      .currency;

    const newDenominations = await Promise.all(
      exchangeKeysJson.denoms.map(d =>
        this.denominationRecordFromKeys(baseUrl, d),
      ),
    );

    await runWithWriteTransaction(
      this.db,
      [Stores.exchanges, Stores.denominations],
      async tx => {
        const r = await tx.get(Stores.exchanges, baseUrl);
        if (!r) {
          console.warn(`exchange ${baseUrl} no longer present`);
          return;
        }
        if (r.details) {
          // FIXME: We need to do some consistency checks!
        }
        r.details = {
          auditors: exchangeKeysJson.auditors,
          currency: currency,
          lastUpdateTime: lastUpdateTimestamp,
          masterPublicKey: exchangeKeysJson.master_public_key,
          protocolVersion: protocolVersion,
        };
        r.updateStatus = ExchangeUpdateStatus.FETCH_WIRE;
        r.lastError = undefined;
        await tx.put(Stores.exchanges, r);

        for (const newDenom of newDenominations) {
          const oldDenom = await tx.get(Stores.denominations, [
            baseUrl,
            newDenom.denomPub,
          ]);
          if (oldDenom) {
            // FIXME: Do consistency check
          } else {
            await tx.put(Stores.denominations, newDenom);
          }
        }
      },
    );
  }

  /**
   * Fetch wire information for an exchange and store it in the database.
   *
   * @param exchangeBaseUrl Exchange base URL, assumed to be already normalized.
   */
  private async updateExchangeWithWireInfo(exchangeBaseUrl: string) {
    const exchange = await this.findExchange(exchangeBaseUrl);
    if (!exchange) {
      return;
    }
    if (exchange.updateStatus != ExchangeUpdateStatus.FETCH_WIRE) {
      return;
    }
    const reqUrl = new URI("wire")
      .absoluteTo(exchangeBaseUrl)
      .addQuery("cacheBreaker", WALLET_CACHE_BREAKER_CLIENT_VERSION);
    const resp = await this.http.get(reqUrl.href());

    const wiJson = resp.responseJson;
    if (!wiJson) {
      throw Error("/wire response malformed");
    }
    const wireInfo = ExchangeWireJson.checked(wiJson);
    const feesForType: { [wireMethod: string]: WireFee[] } = {};
    for (const wireMethod of Object.keys(wireInfo.fees)) {
      const feeList: WireFee[] = [];
      for (const x of wireInfo.fees[wireMethod]) {
        const startStamp = extractTalerStamp(x.start_date);
        if (!startStamp) {
          throw Error("wrong date format");
        }
        const endStamp = extractTalerStamp(x.end_date);
        if (!endStamp) {
          throw Error("wrong date format");
        }
        feeList.push({
          closingFee: Amounts.parseOrThrow(x.closing_fee),
          endStamp,
          sig: x.sig,
          startStamp,
          wireFee: Amounts.parseOrThrow(x.wire_fee),
        });
      }
      feesForType[wireMethod] = feeList;
    }

    await runWithWriteTransaction(this.db, [Stores.exchanges], async tx => {
      const r = await tx.get(Stores.exchanges, exchangeBaseUrl);
      if (!r) {
        return;
      }
      if (r.updateStatus != ExchangeUpdateStatus.FETCH_WIRE) {
        return;
      }
      r.wireInfo = {
        accounts: wireInfo.accounts,
        feesForType: feesForType,
      };
      r.updateStatus = ExchangeUpdateStatus.FINISHED;
      r.lastError = undefined;
      await tx.put(Stores.exchanges, r);
    });
  }

  /**
   * Get detailed balance information, sliced by exchange and by currency.
   */
  async getBalances(): Promise<WalletBalance> {
    /**
     * Add amount to a balance field, both for
     * the slicing by exchange and currency.
     */
    function addTo(
      balance: WalletBalance,
      field: keyof WalletBalanceEntry,
      amount: AmountJson,
      exchange: string,
    ): void {
      const z = Amounts.getZero(amount.currency);
      const balanceIdentity = {
        available: z,
        paybackAmount: z,
        pendingIncoming: z,
        pendingPayment: z,
        pendingIncomingDirty: z,
        pendingIncomingRefresh: z,
        pendingIncomingWithdraw: z,
      };
      let entryCurr = balance.byCurrency[amount.currency];
      if (!entryCurr) {
        balance.byCurrency[amount.currency] = entryCurr = {
          ...balanceIdentity,
        };
      }
      let entryEx = balance.byExchange[exchange];
      if (!entryEx) {
        balance.byExchange[exchange] = entryEx = { ...balanceIdentity };
      }
      entryCurr[field] = Amounts.add(entryCurr[field], amount).amount;
      entryEx[field] = Amounts.add(entryEx[field], amount).amount;
    }

    const balanceStore = {
      byCurrency: {},
      byExchange: {},
    };

    await runWithWriteTransaction(
      this.db,
      [Stores.coins, Stores.refresh, Stores.reserves, Stores.purchases],
      async tx => {
        await tx.iter(Stores.coins).forEach(c => {
          if (c.suspended) {
            return;
          }
          if (c.status === CoinStatus.Fresh) {
            addTo(
              balanceStore,
              "available",
              c.currentAmount,
              c.exchangeBaseUrl,
            );
          }
          if (c.status === CoinStatus.Dirty) {
            addTo(
              balanceStore,
              "pendingIncoming",
              c.currentAmount,
              c.exchangeBaseUrl,
            );
            addTo(
              balanceStore,
              "pendingIncomingDirty",
              c.currentAmount,
              c.exchangeBaseUrl,
            );
          }
        });
        await tx.iter(Stores.refresh).forEach(r => {
          // Don't count finished refreshes, since the refresh already resulted
          // in coins being added to the wallet.
          if (r.finished) {
            return;
          }
          addTo(
            balanceStore,
            "pendingIncoming",
            r.valueOutput,
            r.exchangeBaseUrl,
          );
          addTo(
            balanceStore,
            "pendingIncomingRefresh",
            r.valueOutput,
            r.exchangeBaseUrl,
          );
        });

        await tx.iter(Stores.purchases).forEach(t => {
          if (t.finished) {
            return;
          }
          for (const c of t.payReq.coins) {
            addTo(
              balanceStore,
              "pendingPayment",
              Amounts.parseOrThrow(c.contribution),
              c.exchange_url,
            );
          }
        });
      },
    );

    Wallet.enableTracing && console.log("computed balances:", balanceStore);
    return balanceStore;
  }

  async refresh(oldCoinPub: string, force: boolean = false): Promise<void> {
    const coin = await oneShotGet(this.db, Stores.coins, oldCoinPub);
    if (!coin) {
      console.warn("can't refresh, coin not in database");
      return;
    }
    switch (coin.status) {
      case CoinStatus.Dirty:
        break;
      case CoinStatus.Dormant:
        return;
      case CoinStatus.Fresh:
        if (!force) {
          return;
        }
        break;
    }

    const exchange = await this.updateExchangeFromUrl(coin.exchangeBaseUrl);
    if (!exchange) {
      throw Error("db inconsistent: exchange of coin not found");
    }

    const oldDenom = await oneShotGet(this.db, Stores.denominations, [
      exchange.baseUrl,
      coin.denomPub,
    ]);

    if (!oldDenom) {
      throw Error("db inconsistent: denomination for coin not found");
    }

    const availableDenoms: DenominationRecord[] = await oneShotIterIndex(
      this.db,
      Stores.denominations.exchangeBaseUrlIndex,
      exchange.baseUrl,
    ).toArray();

    const availableAmount = Amounts.sub(coin.currentAmount, oldDenom.feeRefresh)
      .amount;

    const newCoinDenoms = getWithdrawDenomList(
      availableAmount,
      availableDenoms,
    );

    if (newCoinDenoms.length === 0) {
      logger.trace(
        `not refreshing, available amount ${amountToPretty(
          availableAmount,
        )} too small`,
      );
      await oneShotMutate(this.db, Stores.coins, oldCoinPub, x => {
        if (x.status != coin.status) {
          // Concurrent modification?
          return;
        }
        x.status = CoinStatus.Dormant;
        return x;
      });
      this.notifier.notify();
      return;
    }

    const refreshSession: RefreshSessionRecord = await this.cryptoApi.createRefreshSession(
      exchange.baseUrl,
      3,
      coin,
      newCoinDenoms,
      oldDenom.feeRefresh,
    );

    function mutateCoin(c: CoinRecord): CoinRecord {
      const r = Amounts.sub(c.currentAmount, refreshSession.valueWithFee);
      if (r.saturated) {
        // Something else must have written the coin value
        throw TransactionAbort;
      }
      c.currentAmount = r.amount;
      c.status = CoinStatus.Dormant;
      return c;
    }

    // Store refresh session and subtract refreshed amount from
    // coin in the same transaction.
    await runWithWriteTransaction(
      this.db,
      [Stores.refresh, Stores.coins],
      async tx => {
        await tx.put(Stores.refresh, refreshSession);
        await tx.mutate(Stores.coins, coin.coinPub, mutateCoin);
      },
    );
    logger.info(`created refresh session ${refreshSession.refreshSessionId}`);
    this.notifier.notify();

    await this.processRefreshSession(refreshSession.refreshSessionId);
  }

  async processRefreshSession(refreshSessionId: string) {
    const refreshSession = await oneShotGet(
      this.db,
      Stores.refresh,
      refreshSessionId,
    );
    if (!refreshSession) {
      return;
    }
    if (refreshSession.finished) {
      return;
    }
    if (typeof refreshSession.norevealIndex !== "number") {
      await this.refreshMelt(refreshSession.refreshSessionId);
    }
    await this.refreshReveal(refreshSession.refreshSessionId);
    logger.trace("refresh finished");
  }

  async refreshMelt(refreshSessionId: string): Promise<void> {
    const refreshSession = await oneShotGet(
      this.db,
      Stores.refresh,
      refreshSessionId,
    );
    if (!refreshSession) {
      return;
    }
    if (refreshSession.norevealIndex !== undefined) {
      return;
    }

    const coin = await oneShotGet(
      this.db,
      Stores.coins,
      refreshSession.meltCoinPub,
    );

    if (!coin) {
      console.error("can't melt coin, it does not exist");
      return;
    }

    const reqUrl = new URI("refresh/melt").absoluteTo(
      refreshSession.exchangeBaseUrl,
    );
    const meltReq = {
      coin_pub: coin.coinPub,
      confirm_sig: refreshSession.confirmSig,
      denom_pub_hash: coin.denomPubHash,
      denom_sig: coin.denomSig,
      rc: refreshSession.hash,
      value_with_fee: refreshSession.valueWithFee,
    };
    Wallet.enableTracing && console.log("melt request:", meltReq);
    const resp = await this.http.postJson(reqUrl.href(), meltReq);

    Wallet.enableTracing && console.log("melt response:", resp.responseJson);

    if (resp.status !== 200) {
      console.error(resp.responseJson);
      throw Error("refresh failed");
    }

    const respJson = resp.responseJson;

    const norevealIndex = respJson.noreveal_index;

    if (typeof norevealIndex !== "number") {
      throw Error("invalid response");
    }

    refreshSession.norevealIndex = norevealIndex;

    await oneShotMutate(this.db, Stores.refresh, refreshSessionId, rs => {
      if (rs.norevealIndex !== undefined) {
        return;
      }
      if (rs.finished) {
        return;
      }
      rs.norevealIndex = norevealIndex;
      return rs;
    });

    this.notifier.notify();
  }

  private async refreshReveal(refreshSessionId: string): Promise<void> {
    const refreshSession = await oneShotGet(
      this.db,
      Stores.refresh,
      refreshSessionId,
    );
    if (!refreshSession) {
      return;
    }
    const norevealIndex = refreshSession.norevealIndex;
    if (norevealIndex === undefined) {
      throw Error("can't reveal without melting first");
    }
    const privs = Array.from(refreshSession.transferPrivs);
    privs.splice(norevealIndex, 1);

    const planchets = refreshSession.planchetsForGammas[norevealIndex];
    if (!planchets) {
      throw Error("refresh index error");
    }

    const meltCoinRecord = await oneShotGet(
      this.db,
      Stores.coins,
      refreshSession.meltCoinPub,
    );
    if (!meltCoinRecord) {
      throw Error("inconsistent database");
    }

    const evs = planchets.map((x: RefreshPlanchetRecord) => x.coinEv);

    const linkSigs: string[] = [];
    for (let i = 0; i < refreshSession.newDenoms.length; i++) {
      const linkSig = await this.cryptoApi.signCoinLink(
        meltCoinRecord.coinPriv,
        refreshSession.newDenomHashes[i],
        refreshSession.meltCoinPub,
        refreshSession.transferPubs[norevealIndex],
        planchets[i].coinEv,
      );
      linkSigs.push(linkSig);
    }

    const req = {
      coin_evs: evs,
      new_denoms_h: refreshSession.newDenomHashes,
      rc: refreshSession.hash,
      transfer_privs: privs,
      transfer_pub: refreshSession.transferPubs[norevealIndex],
      link_sigs: linkSigs,
    };

    const reqUrl = new URI("refresh/reveal").absoluteTo(
      refreshSession.exchangeBaseUrl,
    );
    Wallet.enableTracing && console.log("reveal request:", req);

    let resp;
    try {
      resp = await this.http.postJson(reqUrl.href(), req);
    } catch (e) {
      console.error("got error during /refresh/reveal request");
      console.error(e);
      return;
    }

    Wallet.enableTracing && console.log("session:", refreshSession);
    Wallet.enableTracing && console.log("reveal response:", resp);

    if (resp.status !== 200) {
      console.error("error: /refresh/reveal returned status " + resp.status);
      return;
    }

    const respJson = resp.responseJson;

    if (!respJson.ev_sigs || !Array.isArray(respJson.ev_sigs)) {
      console.error("/refresh/reveal did not contain ev_sigs");
      return;
    }

    const exchange = await this.findExchange(refreshSession.exchangeBaseUrl);
    if (!exchange) {
      console.error(`exchange ${refreshSession.exchangeBaseUrl} not found`);
      return;
    }

    const coins: CoinRecord[] = [];

    for (let i = 0; i < respJson.ev_sigs.length; i++) {
      const denom = await oneShotGet(this.db, Stores.denominations, [
        refreshSession.exchangeBaseUrl,
        refreshSession.newDenoms[i],
      ]);
      if (!denom) {
        console.error("denom not found");
        continue;
      }
      const pc =
        refreshSession.planchetsForGammas[refreshSession.norevealIndex!][i];
      const denomSig = await this.cryptoApi.rsaUnblind(
        respJson.ev_sigs[i].ev_sig,
        pc.blindingKey,
        denom.denomPub,
      );
      const coin: CoinRecord = {
        blindingKey: pc.blindingKey,
        coinPriv: pc.privateKey,
        coinPub: pc.publicKey,
        currentAmount: denom.value,
        denomPub: denom.denomPub,
        denomPubHash: denom.denomPubHash,
        denomSig,
        exchangeBaseUrl: refreshSession.exchangeBaseUrl,
        reservePub: undefined,
        status: CoinStatus.Fresh,
        coinIndex: -1,
        withdrawSessionId: "",
      };

      coins.push(coin);
    }

    refreshSession.finished = true;

    await runWithWriteTransaction(
      this.db,
      [Stores.coins, Stores.refresh],
      async tx => {
        const rs = await tx.get(Stores.refresh, refreshSessionId);
        if (!rs) {
          return;
        }
        if (rs.finished) {
          return;
        }
        for (let coin of coins) {
          await tx.put(Stores.coins, coin);
        }
        await tx.put(Stores.refresh, refreshSession);
      },
    );
    this.notifier.notify();
  }

  async findExchange(
    exchangeBaseUrl: string,
  ): Promise<ExchangeRecord | undefined> {
    return await oneShotGet(this.db, Stores.exchanges, exchangeBaseUrl);
  }

  /**
   * Retrive the full event history for this wallet.
   */
  async getHistory(
    historyQuery?: HistoryQuery,
  ): Promise<{ history: HistoryEvent[] }> {
    const history: HistoryEvent[] = [];

    // FIXME: do pagination instead of generating the full history

    // We uniquely identify history rows via their timestamp.
    // This works as timestamps are guaranteed to be monotonically
    // increasing even

    const proposals = await oneShotIter(this.db, Stores.proposals).toArray();
    for (const p of proposals) {
      history.push({
        detail: {
          contractTermsHash: p.contractTermsHash,
          merchantName: p.contractTerms.merchant.name,
        },
        timestamp: p.timestamp,
        type: "claim-order",
        explicit: false,
      });
    }

    const withdrawals = await oneShotIter(
      this.db,
      Stores.withdrawalSession,
    ).toArray();
    for (const w of withdrawals) {
      history.push({
        detail: {
          withdrawalAmount: w.withdrawalAmount,
        },
        timestamp: w.startTimestamp,
        type: "withdraw",
        explicit: false,
      });
    }

    const purchases = await oneShotIter(this.db, Stores.purchases).toArray();
    for (const p of purchases) {
      history.push({
        detail: {
          amount: p.contractTerms.amount,
          contractTermsHash: p.contractTermsHash,
          fulfillmentUrl: p.contractTerms.fulfillment_url,
          merchantName: p.contractTerms.merchant.name,
        },
        timestamp: p.timestamp,
        type: "pay",
        explicit: false,
      });
      if (p.timestamp_refund) {
        const contractAmount = Amounts.parseOrThrow(p.contractTerms.amount);
        const amountsPending = Object.keys(p.refundsPending).map(x =>
          Amounts.parseOrThrow(p.refundsPending[x].refund_amount),
        );
        const amountsDone = Object.keys(p.refundsDone).map(x =>
          Amounts.parseOrThrow(p.refundsDone[x].refund_amount),
        );
        const amounts: AmountJson[] = amountsPending.concat(amountsDone);
        const amount = Amounts.add(
          Amounts.getZero(contractAmount.currency),
          ...amounts,
        ).amount;

        history.push({
          detail: {
            contractTermsHash: p.contractTermsHash,
            fulfillmentUrl: p.contractTerms.fulfillment_url,
            merchantName: p.contractTerms.merchant.name,
            refundAmount: amount,
          },
          timestamp: p.timestamp_refund,
          type: "refund",
          explicit: false,
        });
      }
    }

    const reserves = await oneShotIter(this.db, Stores.reserves).toArray();

    for (const r of reserves) {
      const reserveType = r.bankWithdrawStatusUrl ? "taler-bank" : "manual";
      history.push({
        detail: {
          exchangeBaseUrl: r.exchangeBaseUrl,
          requestedAmount: Amounts.toString(r.initiallyRequestedAmount),
          reservePub: r.reservePub,
          reserveType,
          bankWithdrawStatusUrl: r.bankWithdrawStatusUrl,
        },
        timestamp: r.created,
        type: "reserve-created",
        explicit: false,
      });
      if (r.timestampConfirmed) {
        history.push({
          detail: {
            exchangeBaseUrl: r.exchangeBaseUrl,
            requestedAmount: Amounts.toString(r.initiallyRequestedAmount),
            reservePub: r.reservePub,
            reserveType,
            bankWithdrawStatusUrl: r.bankWithdrawStatusUrl,
          },
          timestamp: r.created,
          type: "reserve-confirmed",
          explicit: false,
        });
      }
    }

    const tips: TipRecord[] = await oneShotIter(this.db, Stores.tips).toArray();
    for (const tip of tips) {
      history.push({
        detail: {
          accepted: tip.accepted,
          amount: tip.amount,
          merchantDomain: tip.merchantDomain,
          tipId: tip.tipId,
        },
        timestamp: tip.timestamp,
        explicit: false,
        type: "tip",
      });
    }

    await oneShotIter(this.db, Stores.exchanges).forEach(exchange => {
      history.push({
        type: "exchange-added",
        explicit: false,
        timestamp: exchange.timestampAdded,
        detail: {
          exchangeBaseUrl: exchange.baseUrl,
        },
      });
    });

    history.sort((h1, h2) => Math.sign(h1.timestamp.t_ms - h2.timestamp.t_ms));

    return { history };
  }

  async getPendingOperations(): Promise<PendingOperationsResponse> {
    const pendingOperations: PendingOperationInfo[] = [];
    const exchanges = await this.getExchanges();
    for (let e of exchanges) {
      switch (e.updateStatus) {
        case ExchangeUpdateStatus.FINISHED:
          if (e.lastError) {
            pendingOperations.push({
              type: "bug",
              message:
                "Exchange record is in FINISHED state but has lastError set",
              details: {
                exchangeBaseUrl: e.baseUrl,
              },
            });
          }
          if (!e.details) {
            pendingOperations.push({
              type: "bug",
              message:
                "Exchange record does not have details, but no update in progress.",
              details: {
                exchangeBaseUrl: e.baseUrl,
              },
            });
          }
          if (!e.wireInfo) {
            pendingOperations.push({
              type: "bug",
              message:
                "Exchange record does not have wire info, but no update in progress.",
              details: {
                exchangeBaseUrl: e.baseUrl,
              },
            });
          }
          break;
        case ExchangeUpdateStatus.FETCH_KEYS:
          pendingOperations.push({
            type: "exchange-update",
            stage: "fetch-keys",
            exchangeBaseUrl: e.baseUrl,
            lastError: e.lastError,
            reason: e.updateReason || "unknown",
          });
          break;
        case ExchangeUpdateStatus.FETCH_WIRE:
          pendingOperations.push({
            type: "exchange-update",
            stage: "fetch-wire",
            exchangeBaseUrl: e.baseUrl,
            lastError: e.lastError,
            reason: e.updateReason || "unknown",
          });
          break;
        default:
          pendingOperations.push({
            type: "bug",
            message: "Unknown exchangeUpdateStatus",
            details: {
              exchangeBaseUrl: e.baseUrl,
              exchangeUpdateStatus: e.updateStatus,
            },
          });
          break;
      }
    }
    await oneShotIter(this.db, Stores.reserves).forEach(reserve => {
      const reserveType = reserve.bankWithdrawStatusUrl
        ? "taler-bank"
        : "manual";
      switch (reserve.reserveStatus) {
        case ReserveRecordStatus.DORMANT:
          // nothing to report as pending
          break;
        case ReserveRecordStatus.WITHDRAWING:
        case ReserveRecordStatus.UNCONFIRMED:
        case ReserveRecordStatus.QUERYING_STATUS:
        case ReserveRecordStatus.REGISTERING_BANK:
          pendingOperations.push({
            type: "reserve",
            stage: reserve.reserveStatus,
            timestampCreated: reserve.created,
            reserveType,
            reservePub: reserve.reservePub,
          });
          break;
        case ReserveRecordStatus.WAIT_CONFIRM_BANK:
          pendingOperations.push({
            type: "reserve",
            stage: reserve.reserveStatus,
            timestampCreated: reserve.created,
            reserveType,
            reservePub: reserve.reservePub,
            bankWithdrawConfirmUrl: reserve.bankWithdrawConfirmUrl,
          });
          break;
        default:
          pendingOperations.push({
            type: "bug",
            message: "Unknown reserve record status",
            details: {
              reservePub: reserve.reservePub,
              reserveStatus: reserve.reserveStatus,
            },
          });
          break;
      }
    });

    await oneShotIter(this.db, Stores.refresh).forEach(r => {
      if (r.finished) {
        return;
      }
      let refreshStatus: string;
      if (r.norevealIndex === undefined) {
        refreshStatus = "melt";
      } else {
        refreshStatus = "reveal";
      }

      pendingOperations.push({
        type: "refresh",
        oldCoinPub: r.meltCoinPub,
        refreshStatus,
        refreshOutputSize: r.newDenoms.length,
        refreshSessionId: r.refreshSessionId,
      });
    });

    await oneShotIter(this.db, Stores.planchets).forEach(pc => {
      pendingOperations.push({
        type: "planchet",
        coinPub: pc.coinPub,
        reservePub: pc.reservePub,
      });
    });

    await oneShotIter(this.db, Stores.coins).forEach(coin => {
      if (coin.status == CoinStatus.Dirty) {
        pendingOperations.push({
          type: "dirty-coin",
          coinPub: coin.coinPub,
        });
      }
    });

    await oneShotIter(this.db, Stores.withdrawalSession).forEach(ws => {
      const numCoinsWithdrawn = ws.withdrawn.reduce(
        (a, x) => a + (x ? 1 : 0),
        0,
      );
      const numCoinsTotal = ws.withdrawn.length;
      if (numCoinsWithdrawn < numCoinsTotal) {
        pendingOperations.push({
          type: "withdraw",
          numCoinsTotal,
          numCoinsWithdrawn,
          reservePub: ws.reservePub,
          withdrawSessionId: ws.withdrawSessionId,
        });
      }
    });

    await oneShotIter(this.db, Stores.proposals).forEach(proposal => {
      if (proposal.proposalStatus == ProposalStatus.PROPOSED) {
        pendingOperations.push({
          type: "proposal",
          merchantBaseUrl: proposal.contractTerms.merchant_base_url,
          proposalId: proposal.proposalId,
          proposalTimestamp: proposal.timestamp,
        });
      }
    });

    return {
      pendingOperations,
    };
  }

  async getDenoms(exchangeUrl: string): Promise<DenominationRecord[]> {
    const denoms = await oneShotIterIndex(
      this.db,
      Stores.denominations.exchangeBaseUrlIndex,
      exchangeUrl,
    ).toArray();
    return denoms;
  }

  async getProposal(proposalId: string): Promise<ProposalRecord | undefined> {
    const proposal = await oneShotGet(this.db, Stores.proposals, proposalId);
    return proposal;
  }

  async getExchanges(): Promise<ExchangeRecord[]> {
    return await oneShotIter(this.db, Stores.exchanges).toArray();
  }

  async getCurrencies(): Promise<CurrencyRecord[]> {
    return await oneShotIter(this.db, Stores.currencies).toArray();
  }

  async updateCurrency(currencyRecord: CurrencyRecord): Promise<void> {
    Wallet.enableTracing && console.log("updating currency to", currencyRecord);
    await oneShotPut(this.db, Stores.currencies, currencyRecord);
    this.notifier.notify();
  }

  async getReserves(exchangeBaseUrl: string): Promise<ReserveRecord[]> {
    return await oneShotIter(this.db, Stores.reserves).filter(
      r => r.exchangeBaseUrl === exchangeBaseUrl,
    );
  }

  async getCoinsForExchange(exchangeBaseUrl: string): Promise<CoinRecord[]> {
    return await oneShotIter(this.db, Stores.coins).filter(
      c => c.exchangeBaseUrl === exchangeBaseUrl,
    );
  }

  async getCoins(): Promise<CoinRecord[]> {
    return await oneShotIter(this.db, Stores.coins).toArray();
  }

  async getPlanchets(exchangeBaseUrl: string): Promise<PlanchetRecord[]> {
    return await oneShotIter(this.db, Stores.planchets).filter(
      c => c.exchangeBaseUrl === exchangeBaseUrl,
    );
  }

  private async hashContract(contract: ContractTerms): Promise<string> {
    return this.cryptoApi.hashString(canonicalJson(contract));
  }

  async payback(coinPub: string): Promise<void> {
    let coin = await oneShotGet(this.db, Stores.coins, coinPub);
    if (!coin) {
      throw Error(`Coin ${coinPub} not found, can't request payback`);
    }
    const reservePub = coin.reservePub;
    if (!reservePub) {
      throw Error(`Can't request payback for a refreshed coin`);
    }
    const reserve = await oneShotGet(this.db, Stores.reserves, reservePub);
    if (!reserve) {
      throw Error(`Reserve of coin ${coinPub} not found`);
    }
    switch (coin.status) {
      case CoinStatus.Dormant:
        throw Error(`Can't do payback for coin ${coinPub} since it's dormant`);
    }
    coin.status = CoinStatus.Dormant;
    // Even if we didn't get the payback yet, we suspend withdrawal, since
    // technically we might update reserve status before we get the response
    // from the reserve for the payback request.
    reserve.hasPayback = true;
    await runWithWriteTransaction(
      this.db,
      [Stores.coins, Stores.reserves],
      async tx => {
        await tx.put(Stores.coins, coin!!);
        await tx.put(Stores.reserves, reserve);
      },
    );
    this.notifier.notify();

    const paybackRequest = await this.cryptoApi.createPaybackRequest(coin);
    const reqUrl = new URI("payback").absoluteTo(coin.exchangeBaseUrl);
    const resp = await this.http.postJson(reqUrl.href(), paybackRequest);
    if (resp.status !== 200) {
      throw Error();
    }
    const paybackConfirmation = PaybackConfirmation.checked(resp.responseJson);
    if (paybackConfirmation.reserve_pub !== coin.reservePub) {
      throw Error(`Coin's reserve doesn't match reserve on payback`);
    }
    coin = await oneShotGet(this.db, Stores.coins, coinPub);
    if (!coin) {
      throw Error(`Coin ${coinPub} not found, can't confirm payback`);
    }
    coin.status = CoinStatus.Dormant;
    await oneShotPut(this.db, Stores.coins, coin);
    this.notifier.notify();
    await this.updateReserve(reservePub!);
  }

  private async denominationRecordFromKeys(
    exchangeBaseUrl: string,
    denomIn: Denomination,
  ): Promise<DenominationRecord> {
    const denomPubHash = await this.cryptoApi.hashDenomPub(denomIn.denom_pub);
    const d: DenominationRecord = {
      denomPub: denomIn.denom_pub,
      denomPubHash,
      exchangeBaseUrl,
      feeDeposit: Amounts.parseOrThrow(denomIn.fee_deposit),
      feeRefresh: Amounts.parseOrThrow(denomIn.fee_refresh),
      feeRefund: Amounts.parseOrThrow(denomIn.fee_refund),
      feeWithdraw: Amounts.parseOrThrow(denomIn.fee_withdraw),
      isOffered: true,
      masterSig: denomIn.master_sig,
      stampExpireDeposit: extractTalerStampOrThrow(
        denomIn.stamp_expire_deposit,
      ),
      stampExpireLegal: extractTalerStampOrThrow(denomIn.stamp_expire_legal),
      stampExpireWithdraw: extractTalerStampOrThrow(
        denomIn.stamp_expire_withdraw,
      ),
      stampStart: extractTalerStampOrThrow(denomIn.stamp_start),
      status: DenominationStatus.Unverified,
      value: Amounts.parseOrThrow(denomIn.value),
    };
    return d;
  }

  async withdrawPaybackReserve(reservePub: string): Promise<void> {
    const reserve = await oneShotGet(this.db, Stores.reserves, reservePub);
    if (!reserve) {
      throw Error(`Reserve ${reservePub} does not exist`);
    }
    reserve.hasPayback = false;
    await oneShotPut(this.db, Stores.reserves, reserve);
    this.depleteReserve(reserve.reservePub).catch(e => {
      console.error("Error depleting reserve after payback", e);
    });
  }

  async getPaybackReserves(): Promise<ReserveRecord[]> {
    return await oneShotIter(this.db, Stores.reserves).filter(
      r => r.hasPayback,
    );
  }

  /**
   * Stop ongoing processing.
   */
  stop() {
    //this.timerGroup.stopCurrentAndFutureTimers();
    this.cryptoApi.stop();
  }

  async getSenderWireInfos(): Promise<SenderWireInfos> {
    const m: { [url: string]: Set<string> } = {};

    await oneShotIter(this.db, Stores.exchanges).forEach(x => {
      const wi = x.wireInfo;
      if (!wi) {
        return;
      }
      const s = (m[x.baseUrl] = m[x.baseUrl] || new Set());
      Object.keys(wi.feesForType).map(k => s.add(k));
    });

    Wallet.enableTracing && console.log(m);
    const exchangeWireTypes: { [url: string]: string[] } = {};
    Object.keys(m).map(e => {
      exchangeWireTypes[e] = Array.from(m[e]);
    });

    const senderWiresSet: Set<string> = new Set();
    await oneShotIter(this.db, Stores.senderWires).forEach(x => {
      senderWiresSet.add(x.paytoUri);
    });

    const senderWires: string[] = Array.from(senderWiresSet);

    return {
      exchangeWireTypes,
      senderWires,
    };
  }

  /**
   * Trigger paying coins back into the user's account.
   */
  async returnCoins(req: ReturnCoinsRequest): Promise<void> {
    Wallet.enableTracing && console.log("got returnCoins request", req);
    const wireType = (req.senderWire as any).type;
    Wallet.enableTracing && console.log("wireType", wireType);
    if (!wireType || typeof wireType !== "string") {
      console.error(`wire type must be a non-empty string, not ${wireType}`);
      return;
    }
    const stampSecNow = Math.floor(new Date().getTime() / 1000);
    const exchange = await this.findExchange(req.exchange);
    if (!exchange) {
      console.error(`Exchange ${req.exchange} not known to the wallet`);
      return;
    }
    const exchangeDetails = exchange.details;
    if (!exchangeDetails) {
      throw Error("exchange information needs to be updated first.");
    }
    Wallet.enableTracing && console.log("selecting coins for return:", req);
    const cds = await this.getCoinsForReturn(req.exchange, req.amount);
    Wallet.enableTracing && console.log(cds);

    if (!cds) {
      throw Error("coin return impossible, can't select coins");
    }

    const { priv, pub } = await this.cryptoApi.createEddsaKeypair();

    const wireHash = await this.cryptoApi.hashString(
      canonicalJson(req.senderWire),
    );

    const contractTerms: ContractTerms = {
      H_wire: wireHash,
      amount: Amounts.toString(req.amount),
      auditors: [],
      exchanges: [
        { master_pub: exchangeDetails.masterPublicKey, url: exchange.baseUrl },
      ],
      extra: {},
      fulfillment_url: "",
      locations: [],
      max_fee: Amounts.toString(req.amount),
      merchant: {},
      merchant_pub: pub,
      order_id: "none",
      pay_deadline: `/Date(${stampSecNow + 30 * 5})/`,
      wire_transfer_deadline: `/Date(${stampSecNow + 60 * 5})/`,
      merchant_base_url: "taler://return-to-account",
      products: [],
      refund_deadline: `/Date(${stampSecNow + 60 * 5})/`,
      timestamp: `/Date(${stampSecNow})/`,
      wire_method: wireType,
    };

    const contractTermsHash = await this.cryptoApi.hashString(
      canonicalJson(contractTerms),
    );

    const payCoinInfo = await this.cryptoApi.signDeposit(
      contractTerms,
      cds,
      Amounts.parseOrThrow(contractTerms.amount),
    );

    Wallet.enableTracing && console.log("pci", payCoinInfo);

    const coins = payCoinInfo.sigs.map(s => ({ coinPaySig: s }));

    const coinsReturnRecord: CoinsReturnRecord = {
      coins,
      contractTerms,
      contractTermsHash,
      exchange: exchange.baseUrl,
      merchantPriv: priv,
      wire: req.senderWire,
    };

    await runWithWriteTransaction(
      this.db,
      [Stores.coinsReturns, Stores.coins],
      async tx => {
        await tx.put(Stores.coinsReturns, coinsReturnRecord);
        for (let c of payCoinInfo.updatedCoins) {
          await tx.put(Stores.coins, c);
        }
      },
    );
    this.badge.showNotification();
    this.notifier.notify();

    this.depositReturnedCoins(coinsReturnRecord);
  }

  async depositReturnedCoins(
    coinsReturnRecord: CoinsReturnRecord,
  ): Promise<void> {
    for (const c of coinsReturnRecord.coins) {
      if (c.depositedSig) {
        continue;
      }
      const req = {
        H_wire: coinsReturnRecord.contractTerms.H_wire,
        coin_pub: c.coinPaySig.coin_pub,
        coin_sig: c.coinPaySig.coin_sig,
        contribution: c.coinPaySig.contribution,
        denom_pub: c.coinPaySig.denom_pub,
        h_contract_terms: coinsReturnRecord.contractTermsHash,
        merchant_pub: coinsReturnRecord.contractTerms.merchant_pub,
        pay_deadline: coinsReturnRecord.contractTerms.pay_deadline,
        refund_deadline: coinsReturnRecord.contractTerms.refund_deadline,
        timestamp: coinsReturnRecord.contractTerms.timestamp,
        ub_sig: c.coinPaySig.ub_sig,
        wire: coinsReturnRecord.wire,
        wire_transfer_deadline: coinsReturnRecord.contractTerms.pay_deadline,
      };
      Wallet.enableTracing && console.log("req", req);
      const reqUrl = new URI("deposit").absoluteTo(coinsReturnRecord.exchange);
      const resp = await this.http.postJson(reqUrl.href(), req);
      if (resp.status !== 200) {
        console.error("deposit failed due to status code", resp);
        continue;
      }
      const respJson = resp.responseJson;
      if (respJson.status !== "DEPOSIT_OK") {
        console.error("deposit failed", resp);
        continue;
      }

      if (!respJson.sig) {
        console.error("invalid 'sig' field", resp);
        continue;
      }

      // FIXME: verify signature

      // For every successful deposit, we replace the old record with an updated one
      const currentCrr = await oneShotGet(
        this.db,
        Stores.coinsReturns,
        coinsReturnRecord.contractTermsHash,
      );
      if (!currentCrr) {
        console.error("database inconsistent");
        continue;
      }
      for (const nc of currentCrr.coins) {
        if (nc.coinPaySig.coin_pub === c.coinPaySig.coin_pub) {
          nc.depositedSig = respJson.sig;
        }
      }
      await oneShotPut(this.db, Stores.coinsReturns, currentCrr);
      this.notifier.notify();
    }
  }

  private async acceptRefundResponse(
    refundResponse: MerchantRefundResponse,
  ): Promise<string> {
    const refundPermissions = refundResponse.refund_permissions;

    if (!refundPermissions.length) {
      console.warn("got empty refund list");
      throw Error("empty refund");
    }

    /**
     * Add refund to purchase if not already added.
     */
    function f(t: PurchaseRecord | undefined): PurchaseRecord | undefined {
      if (!t) {
        console.error("purchase not found, not adding refunds");
        return;
      }

      t.timestamp_refund = getTimestampNow();

      for (const perm of refundPermissions) {
        if (
          !t.refundsPending[perm.merchant_sig] &&
          !t.refundsDone[perm.merchant_sig]
        ) {
          t.refundsPending[perm.merchant_sig] = perm;
        }
      }
      return t;
    }

    const hc = refundResponse.h_contract_terms;

    // Add the refund permissions to the purchase within a DB transaction
    await oneShotMutate(this.db, Stores.purchases, hc, f);
    this.notifier.notify();

    await this.submitRefunds(hc);

    return hc;
  }

  /**
   * Accept a refund, return the contract hash for the contract
   * that was involved in the refund.
   */
  async applyRefund(talerRefundUri: string): Promise<string> {
    const parseResult = parseRefundUri(talerRefundUri);

    if (!parseResult) {
      throw Error("invalid refund URI");
    }

    const refundUrl = parseResult.refundUrl;

    Wallet.enableTracing && console.log("processing refund");
    let resp;
    try {
      resp = await this.http.get(refundUrl);
    } catch (e) {
      console.error("error downloading refund permission", e);
      throw e;
    }

    const refundResponse = MerchantRefundResponse.checked(resp.responseJson);
    return this.acceptRefundResponse(refundResponse);
  }

  private async submitRefunds(contractTermsHash: string): Promise<void> {
    const purchase = await oneShotGet(
      this.db,
      Stores.purchases,
      contractTermsHash,
    );
    if (!purchase) {
      console.error(
        "not submitting refunds, contract terms not found:",
        contractTermsHash,
      );
      return;
    }
    const pendingKeys = Object.keys(purchase.refundsPending);
    if (pendingKeys.length === 0) {
      return;
    }
    for (const pk of pendingKeys) {
      const perm = purchase.refundsPending[pk];
      const req: RefundRequest = {
        coin_pub: perm.coin_pub,
        h_contract_terms: purchase.contractTermsHash,
        merchant_pub: purchase.contractTerms.merchant_pub,
        merchant_sig: perm.merchant_sig,
        refund_amount: perm.refund_amount,
        refund_fee: perm.refund_fee,
        rtransaction_id: perm.rtransaction_id,
      };
      console.log("sending refund permission", perm);
      // FIXME: not correct once we support multiple exchanges per payment
      const exchangeUrl = purchase.payReq.coins[0].exchange_url;
      const reqUrl = new URI("refund").absoluteTo(exchangeUrl);
      const resp = await this.http.postJson(reqUrl.href(), req);
      if (resp.status !== 200) {
        console.error("refund failed", resp);
        continue;
      }

      // Transactionally mark successful refunds as done
      const transformPurchase = (
        t: PurchaseRecord | undefined,
      ): PurchaseRecord | undefined => {
        if (!t) {
          console.warn("purchase not found, not updating refund");
          return;
        }
        if (t.refundsPending[pk]) {
          t.refundsDone[pk] = t.refundsPending[pk];
          delete t.refundsPending[pk];
        }
        return t;
      };
      const transformCoin = (
        c: CoinRecord | undefined,
      ): CoinRecord | undefined => {
        if (!c) {
          console.warn("coin not found, can't apply refund");
          return;
        }
        const refundAmount = Amounts.parseOrThrow(perm.refund_amount);
        const refundFee = Amounts.parseOrThrow(perm.refund_fee);
        c.status = CoinStatus.Dirty;
        c.currentAmount = Amounts.add(c.currentAmount, refundAmount).amount;
        c.currentAmount = Amounts.sub(c.currentAmount, refundFee).amount;

        return c;
      };

      await runWithWriteTransaction(
        this.db,
        [Stores.purchases, Stores.coins],
        async tx => {
          await tx.mutate(
            Stores.purchases,
            contractTermsHash,
            transformPurchase,
          );
          await tx.mutate(Stores.coins, perm.coin_pub, transformCoin);
        },
      );
      this.refresh(perm.coin_pub);
    }

    this.badge.showNotification();
    this.notifier.notify();
  }

  async getPurchase(
    contractTermsHash: string,
  ): Promise<PurchaseRecord | undefined> {
    return oneShotGet(this.db, Stores.purchases, contractTermsHash);
  }

  async getFullRefundFees(
    refundPermissions: MerchantRefundPermission[],
  ): Promise<AmountJson> {
    if (refundPermissions.length === 0) {
      throw Error("no refunds given");
    }
    const coin0 = await oneShotGet(
      this.db,
      Stores.coins,
      refundPermissions[0].coin_pub,
    );
    if (!coin0) {
      throw Error("coin not found");
    }
    let feeAcc = Amounts.getZero(
      Amounts.parseOrThrow(refundPermissions[0].refund_amount).currency,
    );

    const denoms = await oneShotIterIndex(
      this.db,
      Stores.denominations.exchangeBaseUrlIndex,
      coin0.exchangeBaseUrl,
    ).toArray();

    for (const rp of refundPermissions) {
      const coin = await oneShotGet(this.db, Stores.coins, rp.coin_pub);
      if (!coin) {
        throw Error("coin not found");
      }
      const denom = await oneShotGet(this.db, Stores.denominations, [
        coin0.exchangeBaseUrl,
        coin.denomPub,
      ]);
      if (!denom) {
        throw Error(`denom not found (${coin.denomPub})`);
      }
      // FIXME:  this assumes that the refund already happened.
      // When it hasn't, the refresh cost is inaccurate.  To fix this,
      // we need introduce a flag to tell if a coin was refunded or
      // refreshed normally (and what about incremental refunds?)
      const refundAmount = Amounts.parseOrThrow(rp.refund_amount);
      const refundFee = Amounts.parseOrThrow(rp.refund_fee);
      const refreshCost = getTotalRefreshCost(
        denoms,
        denom,
        Amounts.sub(refundAmount, refundFee).amount,
      );
      feeAcc = Amounts.add(feeAcc, refreshCost, refundFee).amount;
    }
    return feeAcc;
  }

  async acceptTip(talerTipUri: string): Promise<void> {
    const { tipId, merchantOrigin } = await this.getTipStatus(talerTipUri);
    let tipRecord = await oneShotGet(this.db, Stores.tips, [
      tipId,
      merchantOrigin,
    ]);
    if (!tipRecord) {
      throw Error("tip not in database");
    }

    tipRecord.accepted = true;
    await oneShotPut(this.db, Stores.tips, tipRecord);

    if (tipRecord.pickedUp) {
      console.log("tip already picked up");
      return;
    }
    await this.updateExchangeFromUrl(tipRecord.exchangeUrl);
    const denomsForWithdraw = await this.getVerifiedWithdrawDenomList(
      tipRecord.exchangeUrl,
      tipRecord.amount,
    );

    if (!tipRecord.planchets) {
      const planchets = await Promise.all(
        denomsForWithdraw.map(d => this.cryptoApi.createTipPlanchet(d)),
      );
      const coinPubs: string[] = planchets.map(x => x.coinPub);

      await oneShotMutate(this.db, Stores.tips, [tipId, merchantOrigin], r => {
        if (!r.planchets) {
          r.planchets = planchets;
          r.coinPubs = coinPubs;
        }
        return r;
      });

      this.notifier.notify();
    }

    tipRecord = await oneShotGet(this.db, Stores.tips, [tipId, merchantOrigin]);
    if (!tipRecord) {
      throw Error("tip not in database");
    }

    if (!tipRecord.planchets) {
      throw Error("invariant violated");
    }

    console.log("got planchets for tip!");

    // Planchets in the form that the merchant expects
    const planchetsDetail: TipPlanchetDetail[] = tipRecord.planchets.map(p => ({
      coin_ev: p.coinEv,
      denom_pub_hash: p.denomPubHash,
    }));

    let merchantResp;

    try {
      const req = { planchets: planchetsDetail, tip_id: tipId };
      merchantResp = await this.http.postJson(tipRecord.pickupUrl, req);
      console.log("got merchant resp:", merchantResp);
    } catch (e) {
      console.log("tipping failed", e);
      throw e;
    }

    const response = TipResponse.checked(merchantResp.responseJson);

    if (response.reserve_sigs.length !== tipRecord.planchets.length) {
      throw Error("number of tip responses does not match requested planchets");
    }

    for (let i = 0; i < tipRecord.planchets.length; i++) {
      const tipPlanchet = tipRecord.planchets[i];
      const planchet: PlanchetRecord = {
        blindingKey: tipPlanchet.blindingKey,
        coinEv: tipPlanchet.coinEv,
        coinPriv: tipPlanchet.coinPriv,
        coinPub: tipPlanchet.coinPub,
        coinValue: tipPlanchet.coinValue,
        denomPub: tipPlanchet.denomPub,
        denomPubHash: tipPlanchet.denomPubHash,
        exchangeBaseUrl: tipRecord.exchangeUrl,
        isFromTip: true,
        reservePub: response.reserve_pub,
        withdrawSig: response.reserve_sigs[i].reserve_sig,
        coinIndex: -1,
        withdrawSessionId: "",
      };
      await oneShotPut(this.db, Stores.planchets, planchet);
      await this.processPlanchet(planchet.coinPub);
    }

    tipRecord.pickedUp = true;

    await oneShotPut(this.db, Stores.tips, tipRecord);

    this.notifier.notify();
    this.badge.showNotification();
    return;
  }

  async getTipStatus(talerTipUri: string): Promise<TipStatus> {
    const res = parseTipUri(talerTipUri);
    if (!res) {
      throw Error("invalid taler://tip URI");
    }

    const tipStatusUrl = new URI(res.tipPickupUrl).href();
    console.log("checking tip status from", tipStatusUrl);
    const merchantResp = await this.http.get(tipStatusUrl);
    console.log("resp:", merchantResp.responseJson);
    const tipPickupStatus = TipPickupGetResponse.checked(
      merchantResp.responseJson,
    );

    console.log("status", tipPickupStatus);

    let amount = Amounts.parseOrThrow(tipPickupStatus.amount);

    let tipRecord = await oneShotGet(this.db, Stores.tips, [
      res.tipId,
      res.merchantOrigin,
    ]);

    if (!tipRecord) {
      const withdrawDetails = await this.getWithdrawDetailsForAmount(
        tipPickupStatus.exchange_url,
        amount,
      );

      tipRecord = {
        accepted: false,
        amount,
        coinPubs: [],
        deadline: getTalerStampSec(tipPickupStatus.stamp_expire)!,
        exchangeUrl: tipPickupStatus.exchange_url,
        merchantDomain: res.merchantOrigin,
        nextUrl: undefined,
        pickedUp: false,
        planchets: undefined,
        response: undefined,
        timestamp: getTimestampNow(),
        tipId: res.tipId,
        pickupUrl: res.tipPickupUrl,
        totalFees: Amounts.add(
          withdrawDetails.overhead,
          withdrawDetails.withdrawFee,
        ).amount,
      };
      await oneShotPut(this.db, Stores.tips, tipRecord);
    }

    const tipStatus: TipStatus = {
      accepted: !!tipRecord && tipRecord.accepted,
      amount: Amounts.parseOrThrow(tipPickupStatus.amount),
      amountLeft: Amounts.parseOrThrow(tipPickupStatus.amount_left),
      exchangeUrl: tipPickupStatus.exchange_url,
      nextUrl: tipPickupStatus.extra.next_url,
      merchantOrigin: res.merchantOrigin,
      tipId: res.tipId,
      expirationTimestamp: getTalerStampSec(tipPickupStatus.stamp_expire)!,
      timestamp: getTalerStampSec(tipPickupStatus.stamp_created)!,
      totalFees: tipRecord.totalFees,
    };

    return tipStatus;
  }

  async abortFailedPayment(contractTermsHash: string): Promise<void> {
    const purchase = await oneShotGet(
      this.db,
      Stores.purchases,
      contractTermsHash,
    );
    if (!purchase) {
      throw Error("Purchase not found, unable to abort with refund");
    }
    if (purchase.finished) {
      throw Error("Purchase already finished, not aborting");
    }
    if (purchase.abortDone) {
      console.warn("abort requested on already aborted purchase");
      return;
    }

    purchase.abortRequested = true;

    // From now on, we can't retry payment anymore,
    // so mark this in the DB in case the /pay abort
    // does not complete on the first try.
    await oneShotPut(this.db, Stores.purchases, purchase);

    let resp;

    const abortReq = { ...purchase.payReq, mode: "abort-refund" };

    const payUrl = new URI("pay")
      .absoluteTo(purchase.contractTerms.merchant_base_url)
      .href();

    try {
      resp = await this.http.postJson(payUrl, abortReq);
    } catch (e) {
      // Gives the user the option to retry / abort and refresh
      console.log("aborting payment failed", e);
      throw e;
    }

    const refundResponse = MerchantRefundResponse.checked(resp.responseJson);
    await this.acceptRefundResponse(refundResponse);

    await runWithWriteTransaction(this.db, [Stores.purchases], async tx => {
      const p = await tx.get(Stores.purchases, purchase.contractTermsHash);
      if (!p) {
        return;
      }
      p.abortDone = true;
      await tx.put(Stores.purchases, p);
    });
  }

  public async handleNotifyReserve() {
    const reserves = await oneShotIter(this.db, Stores.reserves).toArray();
    for (const r of reserves) {
      if (r.reserveStatus === ReserveRecordStatus.WAIT_CONFIRM_BANK) {
        try {
          this.processReserveBankStatus(r.reservePub);
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
  async collectGarbage() {
    // FIXME(#5845)
    // We currently do not garbage-collect the wallet database.  This might change
    // after the feature has been properly re-designed, and we have come up with a
    // strategy to test it.
  }

  /**
   * Get information about a withdrawal from
   * a taler://withdraw URI.
   */
  async getWithdrawalInfo(
    talerWithdrawUri: string,
  ): Promise<DownloadedWithdrawInfo> {
    const uriResult = parseWithdrawUri(talerWithdrawUri);
    if (!uriResult) {
      throw Error("can't parse URL");
    }
    const resp = await this.http.get(uriResult.statusUrl);
    console.log("resp:", resp.responseJson);
    const status = WithdrawOperationStatusResponse.checked(resp.responseJson);
    return {
      amount: Amounts.parseOrThrow(status.amount),
      confirmTransferUrl: status.confirm_transfer_url,
      extractedStatusUrl: uriResult.statusUrl,
      selectionDone: status.selection_done,
      senderWire: status.sender_wire,
      suggestedExchange: status.suggested_exchange,
      transferDone: status.transfer_done,
      wireTypes: status.wire_types,
    };
  }

  async acceptWithdrawal(
    talerWithdrawUri: string,
    selectedExchange: string,
  ): Promise<AcceptWithdrawalResponse> {
    const withdrawInfo = await this.getWithdrawalInfo(talerWithdrawUri);
    const exchangeWire = await this.getExchangePaytoUri(
      selectedExchange,
      withdrawInfo.wireTypes,
    );
    const reserve = await this.createReserve({
      amount: withdrawInfo.amount,
      bankWithdrawStatusUrl: withdrawInfo.extractedStatusUrl,
      exchange: selectedExchange,
      senderWire: withdrawInfo.senderWire,
      exchangeWire: exchangeWire,
    });
    // We do this here, as the reserve should be registered before we return,
    // so that we can redirect the user to the bank's status page.
    await this.processReserveBankStatus(reserve.reservePub);
    console.log("acceptWithdrawal: returning");
    return {
      reservePub: reserve.reservePub,
      confirmTransferUrl: withdrawInfo.confirmTransferUrl,
    };
  }

  async getPurchaseDetails(hc: string): Promise<PurchaseDetails> {
    const purchase = await oneShotGet(this.db, Stores.purchases, hc);
    if (!purchase) {
      throw Error("unknown purchase");
    }
    const refundsDoneAmounts = Object.values(purchase.refundsDone).map(x =>
      Amounts.parseOrThrow(x.refund_amount),
    );
    const refundsPendingAmounts = Object.values(
      purchase.refundsPending,
    ).map(x => Amounts.parseOrThrow(x.refund_amount));
    const totalRefundAmount = Amounts.sum([
      ...refundsDoneAmounts,
      ...refundsPendingAmounts,
    ]).amount;
    const refundsDoneFees = Object.values(purchase.refundsDone).map(x =>
      Amounts.parseOrThrow(x.refund_amount),
    );
    const refundsPendingFees = Object.values(purchase.refundsPending).map(x =>
      Amounts.parseOrThrow(x.refund_amount),
    );
    const totalRefundFees = Amounts.sum([
      ...refundsDoneFees,
      ...refundsPendingFees,
    ]).amount;
    const totalFees = totalRefundFees;
    return {
      contractTerms: purchase.contractTerms,
      hasRefund: purchase.timestamp_refund !== undefined,
      totalRefundAmount: totalRefundAmount,
      totalRefundAndRefreshFees: totalFees,
    };
  }

  clearNotification(): void {
    this.badge.clearNotification();
  }

  benchmarkCrypto(repetitions: number): Promise<BenchmarkResult> {
    return this.cryptoApi.benchmark(repetitions);
  }
}
