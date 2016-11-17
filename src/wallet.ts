/*
 This file is part of TALER
 (C) 2015 GNUnet e.V.

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
 * @module Wallet
 * @author Florian Dold
 */

import {
  AmountJson,
  Amounts,
  CheckRepurchaseResult,
  CoinRecord,
  CoinPaySig,
  Contract,
  CreateReserveResponse,
  Denomination,
  ExchangeHandle,
  ExchangeRecord,
  Notifier,
  PayCoinInfo,
  PreCoinRecord,
  RefreshSessionRecord,
  ReserveCreationInfo,
  ReserveRecord,
  WalletBalance,
  WalletBalanceEntry,
  WireInfo, DenominationRecord, DenominationStatus, denominationRecordFromKeys,
} from "./types";
import {
  HttpRequestLibrary,
  HttpResponse,
  RequestException,
} from "./http";
import {
  AbortTransaction,
  Index,
  JoinResult,
  QueryRoot,
  Store, JoinLeftResult,
} from "./query";
import {Checkable} from "./checkable";
import {
  amountToPretty,
  canonicalizeBaseUrl,
  canonicalJson,
  deepEquals,
  flatMap,
  getTalerStampSec,
} from "./helpers";
import {CryptoApi} from "./cryptoApi";

"use strict";

export interface CoinWithDenom {
  coin: CoinRecord;
  denom: DenominationRecord;
}


@Checkable.Class
export class KeysJson {
  @Checkable.List(Checkable.Value(Denomination))
  denoms: Denomination[];

  @Checkable.String
  master_public_key: string;

  @Checkable.Any
  auditors: any[];

  @Checkable.String
  list_issue_date: string;

  @Checkable.Any
  signkeys: any;

  @Checkable.String
  eddsa_pub: string;

  @Checkable.String
  eddsa_sig: string;

  static checked: (obj: any) => KeysJson;
}


@Checkable.Class
export class CreateReserveRequest {
  /**
   * The initial amount for the reserve.
   */
  @Checkable.Value(AmountJson)
  amount: AmountJson;

  /**
   * Exchange URL where the bank should create the reserve.
   */
  @Checkable.String
  exchange: string;

  static checked: (obj: any) => CreateReserveRequest;
}


@Checkable.Class
export class ConfirmReserveRequest {
  /**
   * Public key of then reserve that should be marked
   * as confirmed.
   */
  @Checkable.String
  reservePub: string;

  static checked: (obj: any) => ConfirmReserveRequest;
}


@Checkable.Class
export class OfferRecord {
  @Checkable.Value(Contract)
  contract: Contract;

  @Checkable.String
  merchant_sig: string;

  @Checkable.String
  H_contract: string;

  @Checkable.Number
  offer_time: number;

  /**
   * Serial ID when the offer is stored in the wallet DB.
   */
  @Checkable.Optional(Checkable.Number)
  id?: number;

  static checked: (obj: any) => OfferRecord;
}

export interface HistoryRecord {
  type: string;
  timestamp: number;
  subjectId?: string;
  detail: any;
  level: HistoryLevel;
}


interface PayReq {
  amount: AmountJson;
  coins: CoinPaySig[];
  H_contract: string;
  max_fee: AmountJson;
  merchant_sig: string;
  exchange: string;
  refund_deadline: string;
  timestamp: string;
  transaction_id: number;
  pay_deadline: string;
  /**
   * Merchant instance identifier that should receive the
   * payment, if applicable.
   */
  instance?: string;
}

interface TransactionRecord {
  contractHash: string;
  contract: Contract;
  payReq: PayReq;
  merchantSig: string;

  /**
   * The transaction isn't active anymore, it's either successfully paid
   * or refunded/aborted.
   */
  finished: boolean;
}

export enum HistoryLevel {
  Trace = 1,
  Developer = 2,
  Expert = 3,
  User = 4,
}


export interface Badge {
  setText(s: string): void;
  setColor(c: string): void;
  startBusy(): void;
  stopBusy(): void;
}


function setTimeout(f: any, t: number) {
  return chrome.extension.getBackgroundPage().setTimeout(f, t);
}


function isWithdrawableDenom(d: DenominationRecord) {
  const now_sec = (new Date).getTime() / 1000;
  const stamp_withdraw_sec = getTalerStampSec(d.stampExpireWithdraw);
  const stamp_start_sec = getTalerStampSec(d.stampStart);
  // Withdraw if still possible to withdraw within a minute
  if ((stamp_withdraw_sec + 60 > now_sec) && (now_sec >= stamp_start_sec)) {
    return true;
  }
  return false;
}


export type CoinSelectionResult = {exchangeUrl: string, cds: CoinWithDenom[]}|undefined;

export function selectCoins(cds: CoinWithDenom[], paymentAmount: AmountJson,
                            depositFeeLimit: AmountJson): CoinWithDenom[]|undefined {
  if (cds.length == 0) {
    return undefined;
  }
  // Sort by ascending deposit fee
  cds.sort((o1, o2) => Amounts.cmp(o1.denom.feeDeposit,
                                   o2.denom.feeDeposit));
  let currency = cds[0].denom.value.currency;
  let cdsResult: CoinWithDenom[] = [];
  let accFee: AmountJson = Amounts.getZero(currency);
  let accAmount: AmountJson = Amounts.getZero(currency);
  let isBelowFee = false;
  let coversAmount = false;
  let coversAmountWithFee = false;
  for (let i = 0; i < cds.length; i++) {
    let {coin, denom} = cds[i];
    cdsResult.push(cds[i]);
    if (Amounts.cmp(denom.feeDeposit, coin.currentAmount) >= 0) {
      continue;
    }
    accFee = Amounts.add(denom.feeDeposit, accFee).amount;
    accAmount = Amounts.add(coin.currentAmount, accAmount).amount;
    coversAmount = Amounts.cmp(accAmount, paymentAmount) >= 0;
    coversAmountWithFee = Amounts.cmp(accAmount,
                                      Amounts.add(paymentAmount,
                                                  denom.feeDeposit).amount) >= 0;
    isBelowFee = Amounts.cmp(accFee, depositFeeLimit) <= 0;
    if ((coversAmount && isBelowFee) || coversAmountWithFee) {
      return cdsResult;
    }
  }
  return undefined;
}


/**
 * Get a list of denominations (with repetitions possible)
 * whose total value is as close as possible to the available
 * amount, but never larger.
 */
function getWithdrawDenomList(amountAvailable: AmountJson,
                              denoms: DenominationRecord[]): DenominationRecord[] {
  let remaining = Amounts.copy(amountAvailable);
  const ds: DenominationRecord[] = [];

  denoms = denoms.filter(isWithdrawableDenom);
  denoms.sort((d1, d2) => Amounts.cmp(d2.value, d1.value));

  // This is an arbitrary number of coins
  // we can withdraw in one go.  It's not clear if this limit
  // is useful ...
  for (let i = 0; i < 1000; i++) {
    let found = false;
    for (let d of denoms) {
      let cost = Amounts.add(d.value, d.feeWithdraw).amount;
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


export namespace Stores {
  class ExchangeStore extends Store<ExchangeRecord> {
    constructor() {
      super("exchanges", {keyPath: "baseUrl"});
    }

    pubKeyIndex = new Index<string,ExchangeRecord>(this, "pubKey", "masterPublicKey");
  }

  class CoinsStore extends Store<CoinRecord> {
    constructor() {
      super("coins", {keyPath: "coinPub"});
    }

    exchangeBaseUrlIndex = new Index<string,CoinRecord>(this, "exchangeBaseUrl", "exchangeBaseUrl");
  }

  class HistoryStore extends Store<HistoryRecord> {
    constructor() {
      super("history", {
        keyPath: "id",
        autoIncrement: true
      });
    }

    timestampIndex = new Index<number,HistoryRecord>(this, "timestamp", "timestamp");
  }

  class OffersStore extends Store<OfferRecord> {
    constructor() {
      super("offers", {
        keyPath: "id",
        autoIncrement: true
      });
    }
  }

  class TransactionsStore extends Store<TransactionRecord> {
    constructor() {
      super("transactions", {keyPath: "contractHash"});
    }

    repurchaseIndex = new Index<[string,string],TransactionRecord>(this, "repurchase", [
      "contract.merchant_pub",
      "contract.repurchase_correlation_id"
    ]);
  }

  class DenominationsStore extends Store<DenominationRecord> {
    constructor() {
      // case needed because of bug in type annotations
      super("denominations",
            {keyPath: ["exchangeBaseUrl", "denomPub"] as any as IDBKeyPath});
    }

    exchangeBaseUrlIndex = new Index<string, DenominationRecord>(this, "exchangeBaseUrl", "exchangeBaseUrl");
    denomPubIndex = new Index<string, DenominationRecord>(this, "denomPub", "denomPub");
  }

  export const exchanges: ExchangeStore = new ExchangeStore();
  export const transactions: TransactionsStore = new TransactionsStore();
  export const reserves: Store<ReserveRecord> = new Store<ReserveRecord>("reserves", {keyPath: "reserve_pub"});
  export const coins: CoinsStore = new CoinsStore();
  export const refresh: Store<RefreshSessionRecord> = new Store<RefreshSessionRecord>("refresh", {keyPath: "meltCoinPub"});
  export const history: HistoryStore = new HistoryStore();
  export const offers: OffersStore = new OffersStore();
  export const precoins: Store<PreCoinRecord> = new Store<PreCoinRecord>("precoins", {keyPath: "coinPub"});
  export const denominations: DenominationsStore = new DenominationsStore();
}


export class Wallet {
  private db: IDBDatabase;
  private http: HttpRequestLibrary;
  private badge: Badge;
  private notifier: Notifier;
  public cryptoApi: CryptoApi;

  private processPreCoinConcurrent = 0;
  private processPreCoinThrottle: {[url: string]: number} = {};

  /**
   * Set of identifiers for running operations.
   */
  private runningOperations: Set<string> = new Set();

  q(): QueryRoot {
    return new QueryRoot(this.db);
  }

  constructor(db: IDBDatabase,
              http: HttpRequestLibrary,
              badge: Badge,
              notifier: Notifier) {
    this.db = db;
    this.http = http;
    this.badge = badge;
    this.notifier = notifier;
    this.cryptoApi = new CryptoApi();

    this.resumePendingFromDb();
  }


  private startOperation(operationId: string) {
    this.runningOperations.add(operationId);
    this.badge.startBusy();
  }

  private stopOperation(operationId: string) {
    this.runningOperations.delete(operationId);
    if (this.runningOperations.size == 0) {
      this.badge.stopBusy();
    }
  }

  async updateExchanges(): Promise<void> {
    console.log("updating exchanges");

    let exchangesUrls = await this.q()
                                  .iter(Stores.exchanges)
                                  .map((e) => e.baseUrl)
                                  .toArray();

    for (let url of exchangesUrls) {
      this.updateExchangeFromUrl(url)
          .catch((e) => {
            console.error("updating exchange failed", e);
          });
    }
  }

  /**
   * Resume various pending operations that are pending
   * by looking at the database.
   */
  private resumePendingFromDb(): void {
    console.log("resuming pending operations from db");

    this.q()
        .iter(Stores.reserves)
        .reduce((reserve) => {
          console.log("resuming reserve", reserve.reserve_pub);
          this.processReserve(reserve);
        });

    this.q()
        .iter(Stores.precoins)
        .reduce((preCoin) => {
          console.log("resuming precoin");
          this.processPreCoin(preCoin);
        });

    this.q()
        .iter(Stores.refresh)
        .reduce((r: RefreshSessionRecord) => {
          this.continueRefreshSession(r);
        });

    // FIXME: optimize via index
    this.q()
        .iter(Stores.coins)
        .reduce((c: CoinRecord) => {
          if (c.dirty && !c.transactionPending) {
            this.refresh(c.coinPub);
          }
        });
  }


  /**
   * Get exchanges and associated coins that are still spendable,
   * but only if the sum the coins' remaining value exceeds the payment amount.
   */
  private async getCoinsForPayment(paymentAmount: AmountJson,
                                   depositFeeLimit: AmountJson,
                                   allowedExchanges: ExchangeHandle[]): Promise<CoinSelectionResult> {

    for (let exchangeHandle of allowedExchanges) {
      let exchange = await this.q().get(Stores.exchanges, exchangeHandle.url);
      if (!exchange) {
        console.error("db inconsistent");
        continue;
      }
      let coins: CoinRecord[] = await this.q()
                                          .iterIndex(Stores.coins.exchangeBaseUrlIndex,
                                                     exchangeHandle.url)
                                          .toArray();
      if (!coins || coins.length == 0) {
        continue;
      }
      // Denomination of the first coin, we assume that all other
      // coins have the same currency
      let firstDenom = await this.q().get(Stores.denominations,
                                          [
                                            exchangeHandle.url,
                                            coins[0].denomPub
                                          ]);
      if (!firstDenom) {
        throw Error("db inconsistent");
      }
      let currency = firstDenom.value.currency;
      let cds: CoinWithDenom[] = [];
      for (let i = 0; i < coins.length; i++) {
        let coin = coins[i];
        let denom = await this.q().get(Stores.denominations,
                                       [exchangeHandle.url, coin.denomPub]);
        if (!denom) {
          throw Error("db inconsistent");
        }
        if (denom.value.currency != currency) {
          console.warn(`same pubkey for different currencies at exchange ${exchange.baseUrl}`);
          continue;
        }
        if (coin.suspended) {
          continue;
        }
        cds.push({coin, denom});
      }

      let res = selectCoins(cds, paymentAmount, depositFeeLimit);
      if (res) {
        return {
          exchangeUrl: exchangeHandle.url,
          cds: res,
        }
      }
    }
    return undefined;
  }


  /**
   * Record all information that is necessary to
   * pay for a contract in the wallet's database.
   */
  private async recordConfirmPay(offer: OfferRecord,
                                 payCoinInfo: PayCoinInfo,
                                 chosenExchange: string): Promise<void> {
    let payReq: PayReq = {
      amount: offer.contract.amount,
      coins: payCoinInfo.map((x) => x.sig),
      H_contract: offer.H_contract,
      max_fee: offer.contract.max_fee,
      merchant_sig: offer.merchant_sig,
      exchange: URI(chosenExchange).href(),
      refund_deadline: offer.contract.refund_deadline,
      pay_deadline: offer.contract.pay_deadline,
      timestamp: offer.contract.timestamp,
      transaction_id: offer.contract.transaction_id,
      instance: offer.contract.merchant.instance
    };
    let t: TransactionRecord = {
      contractHash: offer.H_contract,
      contract: offer.contract,
      payReq: payReq,
      merchantSig: offer.merchant_sig,
      finished: false,
    };

    let historyEntry: HistoryRecord = {
      type: "pay",
      timestamp: (new Date).getTime(),
      subjectId: `contract-${offer.H_contract}`,
      detail: {
        merchantName: offer.contract.merchant.name,
        amount: offer.contract.amount,
        contractHash: offer.H_contract,
        fulfillmentUrl: offer.contract.fulfillment_url,
      },
      level: HistoryLevel.User
    };

    await this.q()
              .put(Stores.transactions, t)
              .put(Stores.history, historyEntry)
              .putAll(Stores.coins, payCoinInfo.map((pci) => pci.updatedCoin))
              .finish();

    this.notifier.notify();
  }


  async putHistory(historyEntry: HistoryRecord): Promise<void> {
    await this.q().put(Stores.history, historyEntry).finish();
    this.notifier.notify();
  }


  async saveOffer(offer: OfferRecord): Promise<number> {
    console.log(`saving offer in wallet.ts`);
    let id = await this.q().putWithResult(Stores.offers, offer);
    this.notifier.notify();
    console.log(`saved offer with id ${id}`);
    if (typeof id !== "number") {
      throw Error("db schema wrong");
    }
    return id;
  }


  /**
   * Add a contract to the wallet and sign coins,
   * but do not send them yet.
   */
  async confirmPay(offer: OfferRecord): Promise<any> {
    console.log("executing confirmPay");

    let transaction = await this.q().get(Stores.transactions, offer.H_contract);

    if (transaction) {
      // Already payed ...
      return {};
    }

    let res = await this.getCoinsForPayment(offer.contract.amount,
                                            offer.contract.max_fee,
                                            offer.contract.exchanges);

    if (!res) {
      console.log("not confirming payment, insufficient coins");
      return {
        error: "coins-insufficient",
      };
    }
    let {exchangeUrl, cds} = res;

    let ds = await this.cryptoApi.signDeposit(offer, cds);
    await this.recordConfirmPay(offer,
                                ds,
                                exchangeUrl);
    return {};
  }


  /**
   * Add a contract to the wallet and sign coins,
   * but do not send them yet.
   */
  async checkPay(offer: OfferRecord): Promise<any> {
    // First check if we already payed for it.
    let transaction = await this.q().get(Stores.transactions, offer.H_contract);
    if (transaction) {
      return {isPayed: true};
    }

    // If not already payed, check if we could pay for it.
    let res = await this.getCoinsForPayment(offer.contract.amount,
                                            offer.contract.max_fee,
                                            offer.contract.exchanges);

    if (!res) {
      console.log("not confirming payment, insufficient coins");
      return {
        error: "coins-insufficient",
      };
    }
    return {isPayed: false};
  }


  /**
   * Retrieve all necessary information for looking up the contract
   * with the given hash.
   */
  async executePayment(H_contract: string): Promise<any> {
    let t = await this.q().get<TransactionRecord>(Stores.transactions,
                                                  H_contract);
    if (!t) {
      return {
        success: false,
        contractFound: false,
      }
    }
    let resp = {
      success: true,
      payReq: t.payReq,
      contract: t.contract,
    };
    return resp;
  }


  /**
   * First fetch information requred to withdraw from the reserve,
   * then deplete the reserve, withdrawing coins until it is empty.
   */
  private async processReserve(reserveRecord: ReserveRecord,
                               retryDelayMs: number = 250): Promise<void> {
    const opId = "reserve-" + reserveRecord.reserve_pub;
    this.startOperation(opId);

    try {
      let exchange = await this.updateExchangeFromUrl(reserveRecord.exchange_base_url);
      let reserve = await this.updateReserve(reserveRecord.reserve_pub,
                                             exchange);
      let n = await this.depleteReserve(reserve, exchange);

      if (n != 0) {
        let depleted: HistoryRecord = {
          type: "depleted-reserve",
          subjectId: `reserve-progress-${reserveRecord.reserve_pub}`,
          timestamp: (new Date).getTime(),
          detail: {
            exchangeBaseUrl: reserveRecord.exchange_base_url,
            reservePub: reserveRecord.reserve_pub,
            requestedAmount: reserveRecord.requested_amount,
            currentAmount: reserveRecord.current_amount,
          },
          level: HistoryLevel.User
        };
        await this.q().put(Stores.history, depleted).finish();
      }
    } catch (e) {
      // random, exponential backoff truncated at 3 minutes
      let nextDelay = Math.min(2 * retryDelayMs + retryDelayMs * Math.random(),
                               3000 * 60);
      console.warn(`Failed to deplete reserve, trying again in ${retryDelayMs} ms`);
      setTimeout(() => this.processReserve(reserveRecord, nextDelay),
                 retryDelayMs);
    } finally {
      this.stopOperation(opId);
    }
  }


  private async processPreCoin(preCoin: PreCoinRecord,
                               retryDelayMs = 200): Promise<void> {
    if (this.processPreCoinConcurrent >= 4 || this.processPreCoinThrottle[preCoin.exchangeBaseUrl]) {
      console.log("delaying processPreCoin");
      setTimeout(() => this.processPreCoin(preCoin, retryDelayMs * 2),
                 retryDelayMs);
      return;
    }
    console.log("executing processPreCoin");
    this.processPreCoinConcurrent++;
    try {
      const exchange = await this.q().get(Stores.exchanges,
                                          preCoin.exchangeBaseUrl);
      if (!exchange) {
        console.error("db inconsistend: exchange for precoin not found");
        return;
      }
      const denom = await this.q().get(Stores.denominations,
                                       [preCoin.exchangeBaseUrl, preCoin.denomPub]);
      if (!denom) {
        console.error("db inconsistent: denom for precoin not found");
        return;
      }

      const coin = await this.withdrawExecute(preCoin);

      const mutateReserve = (r: ReserveRecord) => {

        console.log(`before committing coin: current ${amountToPretty(r.current_amount!)}, precoin: ${amountToPretty(
          r.precoin_amount)})}`);

        let x = Amounts.sub(r.precoin_amount,
                            preCoin.coinValue,
                            denom.feeWithdraw);
        if (x.saturated) {
          console.error("database inconsistent");
          throw AbortTransaction;
        }
        r.precoin_amount = x.amount;
        return r;
      };

      const historyEntry: HistoryRecord = {
        type: "withdraw",
        timestamp: (new Date).getTime(),
        level: HistoryLevel.Expert,
        detail: {
          coinPub: coin.coinPub,
        }
      };

      await this.q()
                .mutate(Stores.reserves, preCoin.reservePub, mutateReserve)
                .delete("precoins", coin.coinPub)
                .add(Stores.coins, coin)
                .add(Stores.history, historyEntry)
                .finish();

      this.notifier.notify();
    } catch (e) {
      console.error("Failed to withdraw coin from precoin, retrying in",
                    retryDelayMs,
                    "ms", e);
      // exponential backoff truncated at one minute
      let nextRetryDelayMs = Math.min(retryDelayMs * 2, 1000 * 60);
      setTimeout(() => this.processPreCoin(preCoin, nextRetryDelayMs),
                 retryDelayMs);
      this.processPreCoinThrottle[preCoin.exchangeBaseUrl] = (this.processPreCoinThrottle[preCoin.exchangeBaseUrl] || 0) + 1;
      setTimeout(() => {this.processPreCoinThrottle[preCoin.exchangeBaseUrl]--; }, retryDelayMs);
    } finally {
      this.processPreCoinConcurrent--;
    }
  }


  /**
   * Create a reserve, but do not flag it as confirmed yet.
   */
  async createReserve(req: CreateReserveRequest): Promise<CreateReserveResponse> {
    let keypair = await this.cryptoApi.createEddsaKeypair();
    const now = (new Date).getTime();
    const canonExchange = canonicalizeBaseUrl(req.exchange);

    const reserveRecord: ReserveRecord = {
      reserve_pub: keypair.pub,
      reserve_priv: keypair.priv,
      exchange_base_url: canonExchange,
      created: now,
      last_query: null,
      current_amount: null,
      requested_amount: req.amount,
      confirmed: false,
      precoin_amount: Amounts.getZero(req.amount.currency),
    };

    const historyEntry = {
      type: "create-reserve",
      level: HistoryLevel.Expert,
      timestamp: now,
      subjectId: `reserve-progress-${reserveRecord.reserve_pub}`,
      detail: {
        requestedAmount: req.amount,
        reservePub: reserveRecord.reserve_pub,
      }
    };

    await this.q()
              .put(Stores.reserves, reserveRecord)
              .put(Stores.history, historyEntry)
              .finish();

    let r: CreateReserveResponse = {
      exchange: canonExchange,
      reservePub: keypair.pub,
    };
    return r;
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
    const now = (new Date).getTime();
    let reserve: ReserveRecord|undefined = await (
      this.q().get<ReserveRecord>(Stores.reserves,
                                  req.reservePub));
    if (!reserve) {
      console.error("Unable to confirm reserve, not found in DB");
      return;
    }
    console.log("reserve confirmed");
    const historyEntry: HistoryRecord = {
      type: "confirm-reserve",
      timestamp: now,
      subjectId: `reserve-progress-${reserve.reserve_pub}`,
      detail: {
        exchangeBaseUrl: reserve.exchange_base_url,
        reservePub: req.reservePub,
        requestedAmount: reserve.requested_amount,
      },
      level: HistoryLevel.User,
    };
    reserve.confirmed = true;
    await this.q()
              .put(Stores.reserves, reserve)
              .put(Stores.history, historyEntry)
              .finish();
    this.notifier.notify();

    this.processReserve(reserve);
  }


  private async withdrawExecute(pc: PreCoinRecord): Promise<CoinRecord> {
    let reserve = await this.q().get<ReserveRecord>(Stores.reserves,
                                                    pc.reservePub);

    if (!reserve) {
      throw Error("db inconsistent");
    }

    let wd: any = {};
    wd.denom_pub = pc.denomPub;
    wd.reserve_pub = pc.reservePub;
    wd.reserve_sig = pc.withdrawSig;
    wd.coin_ev = pc.coinEv;
    let reqUrl = URI("reserve/withdraw").absoluteTo(reserve.exchange_base_url);
    let resp = await this.http.postJson(reqUrl, wd);


    if (resp.status != 200) {
      throw new RequestException({
        hint: "Withdrawal failed",
        status: resp.status
      });
    }
    let r = JSON.parse(resp.responseText);
    let denomSig = await this.cryptoApi.rsaUnblind(r.ev_sig,
                                                   pc.blindingKey,
                                                   pc.denomPub);
    let coin: CoinRecord = {
      coinPub: pc.coinPub,
      coinPriv: pc.coinPriv,
      denomPub: pc.denomPub,
      denomSig: denomSig,
      currentAmount: pc.coinValue,
      exchangeBaseUrl: pc.exchangeBaseUrl,
      dirty: false,
      transactionPending: false,
    };
    return coin;
  }


  /**
   * Withdraw coins from a reserve until it is empty.
   */
  private async depleteReserve(reserve: ReserveRecord,
                               exchange: ExchangeRecord): Promise<number> {
    if (!reserve.current_amount) {
      throw Error("can't withdraw when amount is unknown");
    }
    let currentAmount = reserve.current_amount;
    if (!currentAmount) {
      throw Error("can't withdraw when amount is unknown");
    }
    let denomsForWithdraw = await this.getVerifiedWithdrawDenomList(exchange.baseUrl,
                                                                    currentAmount);

    let ps = denomsForWithdraw.map(async(denom) => {
      function mutateReserve(r: ReserveRecord): ReserveRecord {
        let currentAmount = r.current_amount;
        if (!currentAmount) {
          throw Error("can't withdraw when amount is unknown");
        }
        r.precoin_amount = Amounts.add(r.precoin_amount,
                                       denom.value,
                                       denom.feeWithdraw).amount;
        let result = Amounts.sub(currentAmount,
                                 denom.value,
                                 denom.feeWithdraw);
        if (result.saturated) {
          console.error("can't create precoin, saturated");
          throw AbortTransaction;
        }
        r.current_amount = result.amount;

        console.log(`after creating precoin: current ${amountToPretty(r.current_amount)}, precoin: ${amountToPretty(
          r.precoin_amount)})}`);

        return r;
      }

      let preCoin = await this.cryptoApi
                              .createPreCoin(denom, reserve);
      await this.q()
                .put(Stores.precoins, preCoin)
                .mutate(Stores.reserves, reserve.reserve_pub, mutateReserve);
      await this.processPreCoin(preCoin);
    });

    await Promise.all(ps);
    return ps.length;
  }


  /**
   * Update the information about a reserve that is stored in the wallet
   * by quering the reserve's exchange.
   */
  private async updateReserve(reservePub: string,
                              exchange: ExchangeRecord): Promise<ReserveRecord> {
    let reserve = await this.q()
                            .get<ReserveRecord>(Stores.reserves, reservePub);
    if (!reserve) {
      throw Error("reserve not in db");
    }
    let reqUrl = URI("reserve/status").absoluteTo(exchange.baseUrl);
    reqUrl.query({'reserve_pub': reservePub});
    let resp = await this.http.get(reqUrl);
    if (resp.status != 200) {
      throw Error();
    }
    let reserveInfo = JSON.parse(resp.responseText);
    if (!reserveInfo) {
      throw Error();
    }
    let oldAmount = reserve.current_amount;
    let newAmount = reserveInfo.balance;
    reserve.current_amount = reserveInfo.balance;
    let historyEntry = {
      type: "reserve-update",
      timestamp: (new Date).getTime(),
      subjectId: `reserve-progress-${reserve.reserve_pub}`,
      detail: {
        reservePub,
        requestedAmount: reserve.requested_amount,
        oldAmount,
        newAmount
      }
    };
    await this.q()
              .put(Stores.reserves, reserve)
              .finish();
    this.notifier.notify();
    return reserve;
  }


  /**
   * Get the wire information for the exchange with the given base URL.
   */
  async getWireInfo(exchangeBaseUrl: string): Promise<WireInfo> {
    exchangeBaseUrl = canonicalizeBaseUrl(exchangeBaseUrl);
    let reqUrl = URI("wire").absoluteTo(exchangeBaseUrl);
    let resp = await this.http.get(reqUrl);

    if (resp.status != 200) {
      throw Error("/wire request failed");
    }

    let wiJson = JSON.parse(resp.responseText);
    if (!wiJson) {
      throw Error("/wire response malformed")
    }
    return wiJson;
  }

  async getPossibleDenoms(exchangeBaseUrl: string) {
    return (
      this.q().iterIndex(Stores.denominations.exchangeBaseUrlIndex,
                         exchangeBaseUrl)
          .filter((d) => d.status == DenominationStatus.Unverified || d.status == DenominationStatus.VerifiedGood)
          .toArray()
    );
  }

  /**
   * Get a list of denominations to withdraw from the given exchange for the
   * given amount, making sure that all denominations' signatures are verified.
   *
   * Writes to the DB in order to record the result from verifying
   * denominations.
   */
  async getVerifiedWithdrawDenomList(exchangeBaseUrl: string,
                                     amount: AmountJson): Promise<DenominationRecord[]> {
    const exchange = await this.q().get(Stores.exchanges, exchangeBaseUrl);
    if (!exchange) {
      throw Error(`exchange ${exchangeBaseUrl} not found`);
    }

    const possibleDenoms = await (
      this.q().iterIndex(Stores.denominations.exchangeBaseUrlIndex,
                         exchange.baseUrl)
          .filter((d) => d.status == DenominationStatus.Unverified || d.status == DenominationStatus.VerifiedGood)
          .toArray()
    );

    let allValid = false;
    let currentPossibleDenoms = possibleDenoms;

    let selectedDenoms: DenominationRecord[];

    do {
      allValid = true;
      let nextPossibleDenoms = [];
      selectedDenoms = getWithdrawDenomList(amount, possibleDenoms);
      for (let denom of selectedDenoms || []) {
        if (denom.status == DenominationStatus.Unverified) {
          console.log(`verifying denom ${denom.denomPub.substr(0, 15)}`);
          let valid = await this.cryptoApi.isValidDenom(denom,
                                                        exchange.masterPublicKey);
          if (!valid) {
            denom.status = DenominationStatus.VerifiedBad;
            allValid = false;
          } else {
            denom.status = DenominationStatus.VerifiedGood;
            nextPossibleDenoms.push(denom);
          }
          await this.q().put(Stores.denominations, denom).finish();
        } else {
          nextPossibleDenoms.push(denom);
        }
      }
      currentPossibleDenoms = nextPossibleDenoms;
    } while (selectedDenoms.length > 0 && !allValid);

    return selectedDenoms;
  }

  async getReserveCreationInfo(baseUrl: string,
                               amount: AmountJson): Promise<ReserveCreationInfo> {
    let exchangeInfo = await this.updateExchangeFromUrl(baseUrl);

    let selectedDenoms = await this.getVerifiedWithdrawDenomList(baseUrl,
                                                                 amount);
    let acc = Amounts.getZero(amount.currency);
    for (let d of selectedDenoms) {
      acc = Amounts.add(acc, d.feeWithdraw).amount;
    }
    let actualCoinCost = selectedDenoms
      .map((d: DenominationRecord) => Amounts.add(d.value,
                                                  d.feeWithdraw).amount)
      .reduce((a, b) => Amounts.add(a, b).amount);

    let wireInfo = await this.getWireInfo(baseUrl);

    let ret: ReserveCreationInfo = {
      exchangeInfo,
      selectedDenoms,
      wireInfo,
      withdrawFee: acc,
      overhead: Amounts.sub(amount, actualCoinCost).amount,
    };
    return ret;
  }


  /**
   * Update or add exchange DB entry by fetching the /keys information.
   * Optionally link the reserve entry to the new or existing
   * exchange entry in then DB.
   */
  async updateExchangeFromUrl(baseUrl: string): Promise<ExchangeRecord> {
    baseUrl = canonicalizeBaseUrl(baseUrl);
    let reqUrl = URI("keys").absoluteTo(baseUrl);
    let resp = await this.http.get(reqUrl);
    if (resp.status != 200) {
      throw Error("/keys request failed");
    }
    let exchangeKeysJson = KeysJson.checked(JSON.parse(resp.responseText));
    return this.updateExchangeFromJson(baseUrl, exchangeKeysJson);
  }


  private async suspendCoins(exchangeInfo: ExchangeRecord): Promise<void> {
    let suspendedCoins = await (
      this.q()
          .iterIndex(Stores.coins.exchangeBaseUrlIndex, exchangeInfo.baseUrl)
          .indexJoinLeft(Stores.denominations.exchangeBaseUrlIndex,
                         (e) => e.exchangeBaseUrl)
          .reduce((cd: JoinLeftResult<CoinRecord,DenominationRecord>,
                   suspendedCoins: CoinRecord[]) => {
            if (!cd.right || !cd.right.isOffered) {
              return Array.prototype.concat(suspendedCoins, [cd.left]);
            }
            return Array.prototype.concat(suspendedCoins);
          }, []));

    let q = this.q();
    suspendedCoins.map((c) => {
      console.log("suspending coin", c);
      c.suspended = true;
      q.put(Stores.coins, c);
    });
    await q.finish();
  }


  private async updateExchangeFromJson(baseUrl: string,
                                       exchangeKeysJson: KeysJson): Promise<ExchangeRecord> {
    const updateTimeSec = getTalerStampSec(exchangeKeysJson.list_issue_date);
    if (updateTimeSec === null) {
      throw Error("invalid update time");
    }

    const r = await this.q().get<ExchangeRecord>(Stores.exchanges, baseUrl);

    let exchangeInfo: ExchangeRecord;

    if (!r) {
      exchangeInfo = {
        baseUrl,
        lastUpdateTime: updateTimeSec,
        masterPublicKey: exchangeKeysJson.master_public_key,
      };
      console.log("making fresh exchange");
    } else {
      if (updateTimeSec < r.lastUpdateTime) {
        console.log("outdated /keys, not updating");
        return r
      }
      exchangeInfo = r;
      exchangeInfo.lastUpdateTime = updateTimeSec;
      console.log("updating old exchange");
    }

    let updatedExchangeInfo = await this.updateExchangeInfo(exchangeInfo,
                                                            exchangeKeysJson);
    await this.suspendCoins(updatedExchangeInfo);

    await this.q()
              .put(Stores.exchanges, updatedExchangeInfo)
              .finish();

    return updatedExchangeInfo;
  }


  private async updateExchangeInfo(exchangeInfo: ExchangeRecord,
                                   newKeys: KeysJson): Promise<ExchangeRecord> {
    if (exchangeInfo.masterPublicKey != newKeys.master_public_key) {
      throw Error("public keys do not match");
    }

    const existingDenoms: {[denomPub: string]: DenominationRecord} = await (
      this.q().iterIndex(Stores.denominations.exchangeBaseUrlIndex,
                         exchangeInfo.baseUrl)
          .reduce((x: DenominationRecord,
                   acc: typeof existingDenoms) => (acc[x.denomPub] = x, acc),
                  {})
    );

    const newDenoms: typeof existingDenoms = {};

    for (let d of newKeys.denoms) {
      if (!(d.denom_pub in existingDenoms)) {
        let dr = denominationRecordFromKeys(exchangeInfo.baseUrl, d);
        newDenoms[dr.denomPub] = dr;
      }
    }

    for (let oldDenomPub in existingDenoms) {
      if (!(oldDenomPub in newDenoms)) {
        let d = existingDenoms[oldDenomPub];
        d.isOffered = false;
      }
    }

    await this.q()
              .putAll(Stores.denominations,
                      Object.keys(newDenoms).map((d) => newDenoms[d]))
              .finish();
    return exchangeInfo;
  }


  /**
   * Retrieve a mapping from currency name to the amount
   * that is currenctly available for spending in the wallet.
   */
  async getBalances(): Promise<WalletBalance> {
    function ensureEntry(balance: WalletBalance, currency: string) {
      let entry: WalletBalanceEntry|undefined = balance[currency];
      let z = Amounts.getZero(currency);
      if (!entry) {
        balance[currency] = entry = {
          available: z,
          pendingIncoming: z,
          pendingPayment: z,
        };
      }
      return entry;
    }

    function collectBalances(c: CoinRecord, balance: WalletBalance) {
      if (c.suspended) {
        return balance;
      }
      let currency = c.currentAmount.currency;
      let entry = ensureEntry(balance, currency);
      entry.available = Amounts.add(entry.available, c.currentAmount).amount;
      return balance;
    }

    function collectPendingWithdraw(r: ReserveRecord, balance: WalletBalance) {
      if (!r.confirmed) {
        return balance;
      }
      let entry = ensureEntry(balance, r.requested_amount.currency);
      let amount = r.current_amount;
      if (!amount) {
        amount = r.requested_amount;
      }
      amount = Amounts.add(amount, r.precoin_amount).amount;
      if (Amounts.cmp(smallestWithdraw[r.exchange_base_url], amount) < 0) {
        entry.pendingIncoming = Amounts.add(entry.pendingIncoming,
                                            amount).amount;
      }
      return balance;
    }

    function collectPendingRefresh(r: RefreshSessionRecord,
                                   balance: WalletBalance) {
      if (!r.finished) {
        return balance;
      }
      let entry = ensureEntry(balance, r.valueWithFee.currency);
      entry.pendingIncoming = Amounts.add(entry.pendingIncoming,
                                          r.valueOutput).amount;

      return balance;
    }

    function collectPayments(t: TransactionRecord, balance: WalletBalance) {
      if (t.finished) {
        return balance;
      }
      let entry = ensureEntry(balance, t.contract.amount.currency);
      entry.pendingPayment = Amounts.add(entry.pendingPayment,
                                         t.contract.amount).amount;

      return balance;
    }

    function collectSmallestWithdraw(e: JoinResult<ExchangeRecord, DenominationRecord>,
                                     sw: any) {
      let min = sw[e.left.baseUrl];
      let v = Amounts.add(e.right.value, e.right.feeWithdraw).amount;
      if (!min) {
        min = v;
      } else if (Amounts.cmp(v, min) < 0) {
        min = v;
      }
      sw[e.left.baseUrl] = min;
      return sw;
    }

    let balance = {};
    // Mapping from exchange pub to smallest
    // possible amount we can withdraw
    let smallestWithdraw: {[baseUrl: string]: AmountJson} = {};

    smallestWithdraw = await (this.q()
                                  .iter(Stores.exchanges)
                                  .indexJoin(Stores.denominations.exchangeBaseUrlIndex,
                                             (x) => x.baseUrl)
                                  .reduce(collectSmallestWithdraw, {}));

    console.log("smallest withdraws", smallestWithdraw);

    let tx = this.q();
    tx.iter(Stores.coins)
      .reduce(collectBalances, balance);
    tx.iter(Stores.refresh)
      .reduce(collectPendingRefresh, balance);
    tx.iter(Stores.reserves)
      .reduce(collectPendingWithdraw, balance);
    tx.iter(Stores.transactions)
      .reduce(collectPayments, balance);
    await tx.finish();
    return balance;

  }


  async createRefreshSession(oldCoinPub: string): Promise<RefreshSessionRecord|undefined> {
    let coin = await this.q().get<CoinRecord>(Stores.coins, oldCoinPub);

    if (!coin) {
      throw Error("coin not found");
    }

    let exchange = await this.updateExchangeFromUrl(coin.exchangeBaseUrl);

    if (!exchange) {
      throw Error("db inconsistent");
    }

    let oldDenom = await this.q().get(Stores.denominations,
                                      [exchange.baseUrl, coin.denomPub]);

    if (!oldDenom) {
      throw Error("db inconsistent");
    }

    let availableDenoms: DenominationRecord[] = await (
      this.q()
          .iterIndex(Stores.denominations.exchangeBaseUrlIndex,
                     exchange.baseUrl)
          .toArray()
    );

    let availableAmount = Amounts.sub(coin.currentAmount,
                                      oldDenom.feeRefresh).amount;

    let newCoinDenoms = getWithdrawDenomList(availableAmount,
                                             availableDenoms);

    console.log("refreshing into", newCoinDenoms);

    if (newCoinDenoms.length == 0) {
      console.log("not refreshing, value too small");
      return undefined;
    }


    let refreshSession: RefreshSessionRecord = await (
      this.cryptoApi.createRefreshSession(exchange.baseUrl,
                                          3,
                                          coin,
                                          newCoinDenoms,
                                          oldDenom.feeRefresh));

    function mutateCoin(c: CoinRecord): CoinRecord {
      let r = Amounts.sub(c.currentAmount,
                          refreshSession.valueWithFee);
      if (r.saturated) {
        // Something else must have written the coin value
        throw AbortTransaction;
      }
      c.currentAmount = r.amount;
      return c;
    }

    await this.q()
              .put(Stores.refresh, refreshSession)
              .mutate(Stores.coins, coin.coinPub, mutateCoin)
              .finish();

    return refreshSession;
  }


  async refresh(oldCoinPub: string): Promise<void> {
    let refreshSession: RefreshSessionRecord|undefined;
    let oldSession = await this.q().get(Stores.refresh, oldCoinPub);
    if (oldSession) {
      refreshSession = oldSession;
    } else {
      refreshSession = await this.createRefreshSession(oldCoinPub);
    }
    if (!refreshSession) {
      // refreshing not necessary
      return;
    }
    this.continueRefreshSession(refreshSession);
  }

  async continueRefreshSession(refreshSession: RefreshSessionRecord) {
    if (refreshSession.finished) {
      return;
    }
    if (typeof refreshSession.norevealIndex !== "number") {
      let coinPub = refreshSession.meltCoinPub;
      await this.refreshMelt(refreshSession);
      let r = await this.q().get<RefreshSessionRecord>(Stores.refresh, coinPub);
      if (!r) {
        throw Error("refresh session does not exist anymore");
      }
      refreshSession = r;
    }

    await this.refreshReveal(refreshSession);
  }


  async refreshMelt(refreshSession: RefreshSessionRecord): Promise<void> {
    if (refreshSession.norevealIndex != undefined) {
      console.error("won't melt again");
      return;
    }

    let coin = await this.q().get<CoinRecord>(Stores.coins,
                                              refreshSession.meltCoinPub);
    if (!coin) {
      console.error("can't melt coin, it does not exist");
      return;
    }

    let reqUrl = URI("refresh/melt").absoluteTo(refreshSession.exchangeBaseUrl);
    let meltCoin = {
      coin_pub: coin.coinPub,
      denom_pub: coin.denomPub,
      denom_sig: coin.denomSig,
      confirm_sig: refreshSession.confirmSig,
      value_with_fee: refreshSession.valueWithFee,
    };
    let coinEvs = refreshSession.preCoinsForGammas.map((x) => x.map((y) => y.coinEv));
    let req = {
      "new_denoms": refreshSession.newDenoms,
      "melt_coin": meltCoin,
      "transfer_pubs": refreshSession.transferPubs,
      "coin_evs": coinEvs,
    };
    console.log("melt request:", req);
    let resp = await this.http.postJson(reqUrl, req);

    console.log("melt request:", req);
    console.log("melt response:", resp.responseText);

    if (resp.status != 200) {
      console.error(resp.responseText);
      throw Error("refresh failed");
    }

    let respJson = JSON.parse(resp.responseText);

    if (!respJson) {
      throw Error("exchange responded with garbage");
    }

    let norevealIndex = respJson.noreveal_index;

    if (typeof norevealIndex != "number") {
      throw Error("invalid response");
    }

    refreshSession.norevealIndex = norevealIndex;

    await this.q().put(Stores.refresh, refreshSession).finish();
  }


  async refreshReveal(refreshSession: RefreshSessionRecord): Promise<void> {
    let norevealIndex = refreshSession.norevealIndex;
    if (norevealIndex == undefined) {
      throw Error("can't reveal without melting first");
    }
    let privs = Array.from(refreshSession.transferPrivs);
    privs.splice(norevealIndex, 1);

    let req = {
      "session_hash": refreshSession.hash,
      "transfer_privs": privs,
    };

    let reqUrl = URI("refresh/reveal")
      .absoluteTo(refreshSession.exchangeBaseUrl);
    console.log("reveal request:", req);
    let resp = await this.http.postJson(reqUrl, req);

    console.log("session:", refreshSession);
    console.log("reveal response:", resp);

    if (resp.status != 200) {
      console.log("error:  /refresh/reveal returned status " + resp.status);
      return;
    }

    let respJson = JSON.parse(resp.responseText);

    if (!respJson.ev_sigs || !Array.isArray(respJson.ev_sigs)) {
      console.log("/refresh/reveal did not contain ev_sigs");
    }

    let exchange = await this.q().get<ExchangeRecord>(Stores.exchanges,
                                                      refreshSession.exchangeBaseUrl);
    if (!exchange) {
      console.error(`exchange ${refreshSession.exchangeBaseUrl} not found`);
      return;
    }

    let coins: CoinRecord[] = [];

    for (let i = 0; i < respJson.ev_sigs.length; i++) {
      let denom = await (
        this.q()
            .get(Stores.denominations,
                 [
                   refreshSession.exchangeBaseUrl,
                   refreshSession.newDenoms[i]
                 ]));
      if (!denom) {
        console.error("denom not found");
        continue;
      }
      let pc = refreshSession.preCoinsForGammas[refreshSession.norevealIndex!][i];
      let denomSig = await this.cryptoApi.rsaUnblind(respJson.ev_sigs[i].ev_sig,
                                                     pc.blindingKey,
                                                     denom.denomPub);
      let coin: CoinRecord = {
        coinPub: pc.publicKey,
        coinPriv: pc.privateKey,
        denomPub: denom.denomPub,
        denomSig: denomSig,
        currentAmount: denom.value,
        exchangeBaseUrl: refreshSession.exchangeBaseUrl,
        dirty: false,
        transactionPending: false,
      };

      coins.push(coin);
    }

    refreshSession.finished = true;

    await this.q()
              .putAll(Stores.coins, coins)
              .put(Stores.refresh, refreshSession)
              .finish();
  }


  /**
   * Retrive the full event history for this wallet.
   */
  async getHistory(): Promise<{history: HistoryRecord[]}> {
    function collect(x: any, acc: any) {
      acc.push(x);
      return acc;
    }

    let history = await (
      this.q()
          .iterIndex(Stores.history.timestampIndex)
          .reduce(collect, []));

    return {history};
  }

  async getDenoms(exchangeUrl: string): Promise<DenominationRecord[]> {
    let denoms = await this.q().iterIndex(Stores.denominations.exchangeBaseUrlIndex, exchangeUrl).toArray();
    return denoms;
  }

  async getOffer(offerId: number): Promise<any> {
    let offer = await this.q() .get(Stores.offers, offerId);
    return offer;
  }

  async getExchanges(): Promise<ExchangeRecord[]> {
    return this.q()
               .iter<ExchangeRecord>(Stores.exchanges)
               .flatMap((e) => [e])
               .toArray();
  }

  async getReserves(exchangeBaseUrl: string): Promise<ReserveRecord[]> {
    return this.q()
               .iter<ReserveRecord>(Stores.reserves)
               .filter((r: ReserveRecord) => r.exchange_base_url === exchangeBaseUrl)
               .toArray();
  }

  async getCoins(exchangeBaseUrl: string): Promise<CoinRecord[]> {
    return this.q()
               .iter<CoinRecord>(Stores.coins)
               .filter((c: CoinRecord) => c.exchangeBaseUrl === exchangeBaseUrl)
               .toArray();
  }

  async getPreCoins(exchangeBaseUrl: string): Promise<PreCoinRecord[]> {
    return this.q()
               .iter<PreCoinRecord>(Stores.precoins)
               .filter((c: PreCoinRecord) => c.exchangeBaseUrl === exchangeBaseUrl)
               .toArray();
  }

  async hashContract(contract: Contract): Promise<string> {
    return this.cryptoApi.hashString(canonicalJson(contract));
  }

  /**
   * Check if there's an equivalent contract we've already purchased.
   */
  async checkRepurchase(contract: Contract): Promise<CheckRepurchaseResult> {
    if (!contract.repurchase_correlation_id) {
      console.log("no repurchase: no correlation id");
      return {isRepurchase: false};
    }
    let result: TransactionRecord|undefined = await (
      this.q()
          .getIndexed(Stores.transactions.repurchaseIndex,
                      [
                        contract.merchant_pub,
                        contract.repurchase_correlation_id
                      ]));

    if (result) {
      console.assert(result.contract.repurchase_correlation_id == contract.repurchase_correlation_id);
      return {
        isRepurchase: true,
        existingContractHash: result.contractHash,
        existingFulfillmentUrl: result.contract.fulfillment_url,
      };
    } else {
      return {isRepurchase: false};
    }
  }


  async paymentSucceeded(contractHash: string): Promise<any> {
    const doPaymentSucceeded = async() => {
      let t = await this.q().get<TransactionRecord>(Stores.transactions,
                                                    contractHash);
      if (!t) {
        console.error("contract not found");
        return;
      }
      t.finished = true;
      let modifiedCoins: CoinRecord[] = [];
      for (let pc of t.payReq.coins) {
        let c = await this.q().get<CoinRecord>(Stores.coins, pc.coin_pub);
        if (!c) {
          console.error("coin not found");
          return;
        }
        c.transactionPending = false;
        modifiedCoins.push(c);
      }

      await this.q()
                .putAll(Stores.coins, modifiedCoins)
                .put(Stores.transactions, t)
                .finish();
      for (let c of t.payReq.coins) {
        this.refresh(c.coin_pub);
      }
    };
    doPaymentSucceeded();
    return;
  }
}
