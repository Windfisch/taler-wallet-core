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
 */

/**
 * Imports.
 */
import {
  AmountJson,
  Amounts,
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
  CurrencyRecord,
  Auditor,
  AuditorRecord,
  WalletBalance,
  WalletBalanceEntry,
  WireFee,
  ExchangeWireFeesRecord,
  WireInfo,
  DenominationRecord,
  DenominationStatus,
  CoinStatus,
  PaybackConfirmation,
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
import URI = require("urijs");


/**
 * Named tuple of coin and denomination.
 */
export interface CoinWithDenom {
  coin: CoinRecord;
  denom: DenominationRecord;
}


/**
 * Element of the payback list that the
 * exchange gives us in /keys.
 */
@Checkable.Class
export class Payback {
  @Checkable.String
  h_denom_pub: string;
}


/**
 * Structure that the exchange gives us in /keys.
 */
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

  @Checkable.List(Checkable.Value(Payback))
  payback?: Payback[];

  @Checkable.Any
  signkeys: any;

  @Checkable.String
  eddsa_pub: string;

  @Checkable.String
  eddsa_sig: string;

  static checked: (obj: any) => KeysJson;
}


@Checkable.Class
class WireFeesJson {
  @Checkable.Value(AmountJson)
  wire_fee: AmountJson;

  @Checkable.Value(AmountJson)
  closing_fee: AmountJson;

  @Checkable.String
  sig: string;

  @Checkable.String
  start_date: string;

  @Checkable.String
  end_date: string;

  static checked: (obj: any) => WireFeesJson;
}


@Checkable.ClassWithExtra
class WireDetailJson {
  @Checkable.String
  type: string;

  @Checkable.List(Checkable.Value(WireFeesJson))
  fees: WireFeesJson[];

  static checked: (obj: any) => WireDetailJson;
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
  coins: CoinPaySig[];
  merchant_pub: string;
  order_id: string;
  exchange: string;
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

export interface NonceRecord {
  priv: string;
  pub: string;
}


export interface ConfigRecord {
  key: string;
  value: any;
}



const builtinCurrencies: CurrencyRecord[] = [
  {
    name: "KUDOS",
    fractionalDigits: 2,
    auditors: [
      {
        baseUrl: "https://auditor.demo.taler.net/",
        expirationStamp: (new Date(2027, 1)).getTime(),
        auditorPub: "XN9KMN5G2KGPCAN0E89MM5HE8FV4WBWA9KDTMTDR817MWBCYA7H0",
      },
    ],
    exchanges: [],
  },
  {
    name: "PUDOS",
    fractionalDigits: 2,
    auditors: [
    ],
    exchanges: [
      { baseUrl: "https://exchange.test.taler.net/", priority: 0 },
    ],
  },
];



// FIXME: these functions should be dependency-injected
// into the wallet, as this is chrome specific => bad

function setTimeout(f: any, t: number) {
  return chrome.extension.getBackgroundPage().setTimeout(f, t);
}

function setInterval(f: any, t: number) {
  return chrome.extension.getBackgroundPage().setInterval(f, t);
}


function isWithdrawableDenom(d: DenominationRecord) {
  const now_sec = (new Date).getTime() / 1000;
  const stamp_withdraw_sec = getTalerStampSec(d.stampExpireWithdraw);
  if (stamp_withdraw_sec == null) {
    return false;
  }
  const stamp_start_sec = getTalerStampSec(d.stampStart);
  if (stamp_start_sec == null) {
    return false;
  }
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
    if (coin.suspended) {
      continue;
    }
    if (coin.status != CoinStatus.Fresh) {
      continue;
    }
    if (Amounts.cmp(denom.feeDeposit, coin.currentAmount) >= 0) {
      continue;
    }
    cdsResult.push(cds[i]);
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

  class NonceStore extends Store<NonceRecord> {
    constructor() {
      super("nonces", {keyPath: "pub"});
    }
  }

  class CoinsStore extends Store<CoinRecord> {
    constructor() {
      super("coins", {keyPath: "coinPub"});
    }

    exchangeBaseUrlIndex = new Index<string,CoinRecord>(this, "exchangeBaseUrl", "exchangeBaseUrl");
    denomPubIndex = new Index<string,CoinRecord>(this, "denomPub", "denomPub");
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

    fulfillmentUrlIndex = new Index<string,TransactionRecord>(this, "fulfillment_url", "contract.fulfillment_url");
    orderIdIndex = new Index<string,TransactionRecord>(this, "order_id", "contract.order_id");
  }

  class DenominationsStore extends Store<DenominationRecord> {
    constructor() {
      // cast needed because of bug in type annotations
      super("denominations",
            {keyPath: ["exchangeBaseUrl", "denomPub"] as any as IDBKeyPath});
    }

    denomPubHashIndex = new Index<string,DenominationRecord>(this, "denomPubHash", "denomPubHash");
    exchangeBaseUrlIndex = new Index<string, DenominationRecord>(this, "exchangeBaseUrl", "exchangeBaseUrl");
    denomPubIndex = new Index<string, DenominationRecord>(this, "denomPub", "denomPub");
  }

  class CurrenciesStore extends Store<CurrencyRecord> {
    constructor() {
      super("currencies", {keyPath: "name"});
    }
  }

  class ConfigStore extends Store<ConfigRecord> {
    constructor() {
      super("config", {keyPath: "key"});
    }
  }

  class ExchangeWireFeesStore extends Store<ExchangeWireFeesRecord> {
    constructor() {
      super("exchangeWireFees", {keyPath: "exchangeBaseUrl"});
    }
  }
  export const exchanges: ExchangeStore = new ExchangeStore();
  export const exchangeWireFees: ExchangeWireFeesStore = new ExchangeWireFeesStore();
  export const nonces: NonceStore = new NonceStore();
  export const transactions: TransactionsStore = new TransactionsStore();
  export const reserves: Store<ReserveRecord> = new Store<ReserveRecord>("reserves", {keyPath: "reserve_pub"});
  export const coins: CoinsStore = new CoinsStore();
  export const refresh: Store<RefreshSessionRecord> = new Store<RefreshSessionRecord>("refresh", {keyPath: "meltCoinPub"});
  export const history: HistoryStore = new HistoryStore();
  export const offers: OffersStore = new OffersStore();
  export const precoins: Store<PreCoinRecord> = new Store<PreCoinRecord>("precoins", {keyPath: "coinPub"});
  export const denominations: DenominationsStore = new DenominationsStore();
  export const currencies: CurrenciesStore = new CurrenciesStore();
  export const config: ConfigStore = new ConfigStore();
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

    this.fillDefaults();
    this.resumePendingFromDb();

    setInterval(() => this.updateExchanges(), 1000 * 60 * 15);
  }

  private async fillDefaults() {
    let onTrue = (r: QueryRoot) => {
      console.log("defaults already applied");
    };
    let onFalse = (r: QueryRoot) => {
      console.log("applying defaults");
      r.put(Stores.config, {key: "currencyDefaultsApplied", value: true})
        .putAll(Stores.currencies, builtinCurrencies)
        .finish();
    };
    await (
      this.q()
          .iter(Stores.config)
          .filter(x => x.key == "currencyDefaultsApplied")
          .first()
          .cond((x) => x && x.value, onTrue, onFalse)
    );
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
          if (c.status == CoinStatus.Dirty) {
            console.log("resuming pending refresh for coin", c);
            this.refresh(c.coinPub);
          }
        });
  }


  /**
   * Get exchanges and associated coins that are still spendable,
   * but only if the sum the coins' remaining value exceeds the payment amount.
   */
  private async getCoinsForPayment(paymentAmount: AmountJson,
                                   wireMethod: string,
                                   wireFeeTime: number,
                                   depositFeeLimit: AmountJson,
                                   wireFeeLimit: AmountJson,
                                   wireFeeAmortization: number,
                                   allowedExchanges: ExchangeHandle[],
                                   allowedAuditors: Auditor[]): Promise<CoinSelectionResult> {

    let exchanges = await this.q().iter(Stores.exchanges).toArray();

    for (let exchange of exchanges) {
      let isOkay: boolean = false;

      // is the exchange explicitly allowed?
      for (let allowedExchange of allowedExchanges) {
        if (allowedExchange.master_pub == exchange.masterPublicKey) {
          isOkay = true;
          break;
        }
      }

      // is the exchange allowed because of one of its auditors?
      if (!isOkay) {
        for (let allowedAuditor of allowedAuditors) {
          for (let auditor of exchange.auditors) {
            if (auditor.auditor_pub == allowedAuditor.auditor_pub) {
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

      let coins: CoinRecord[] = await this.q()
                                          .iterIndex(Stores.coins.exchangeBaseUrlIndex,
                                                     exchange.baseUrl)
                                          .toArray();
      if (!coins || coins.length == 0) {
        continue;
      }
      // Denomination of the first coin, we assume that all other
      // coins have the same currency
      let firstDenom = await this.q().get(Stores.denominations,
                                          [
                                            exchange.baseUrl,
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
                                       [exchange.baseUrl, coin.denomPub]);
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
        if (coin.status != CoinStatus.Fresh) {
          continue;
        }
        cds.push({coin, denom});
      }

      let fees = await this.q().get(Stores.exchangeWireFees, exchange.baseUrl);
      if (!fees) {
        console.error("no fees found for exchange", exchange);
        continue;
      }

      let wireFee: AmountJson|undefined = undefined;
      for (let fee of (fees.feesForType[wireMethod] || [])) {
        if (fee.startStamp >= wireFeeTime && fee.endStamp <= wireFeeTime) {
          wireFee = fee.wireFee;
          break;
        }
      }

      if (wireFee) {
        let amortizedWireFee = Amounts.divide(wireFee, wireFeeAmortization);
        if (Amounts.cmp(wireFeeLimit, amortizedWireFee) < 0) {
          paymentAmount = Amounts.add(amortizedWireFee, paymentAmount).amount;
        }
      }

      let res = selectCoins(cds, paymentAmount, depositFeeLimit);
      if (res) {
        return {
          exchangeUrl: exchange.baseUrl,
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
      coins: payCoinInfo.map((x) => x.sig),
      merchant_pub: offer.contract.merchant_pub,
      order_id: offer.contract.order_id,
      exchange: chosenExchange,
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
                                            offer.contract.wire_method,
                                            getTalerStampSec(offer.contract.timestamp) || 0,
                                            offer.contract.max_fee,
                                            offer.contract.max_wire_fee || Amounts.getZero(offer.contract.amount.currency),
                                            offer.contract.wire_fee_amortization || 1,
                                            offer.contract.exchanges,
                                            offer.contract.auditors);

    console.log("max_fee", offer.contract.max_fee);
    console.log("coin selection result", res);

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
                                            offer.contract.wire_method,
                                            getTalerStampSec(offer.contract.timestamp) || 0,
                                            offer.contract.max_fee,
                                            offer.contract.max_wire_fee || Amounts.getZero(offer.contract.amount.currency),
                                            offer.contract.wire_fee_amortization || 1,
                                            offer.contract.exchanges,
                                            offer.contract.auditors);

    if (!res) {
      console.log("not confirming payment, insufficient coins");
      return {
        error: "coins-insufficient",
      };
    }
    return {isPayed: false};
  }


  /**
   * Retrieve information required to pay for a contract, where the
   * contract is identified via the fulfillment url.
   */
  async queryPayment(url: string): Promise<any> {
    console.log("query for payment", url);

    const t = await this.q().getIndexed(Stores.transactions.fulfillmentUrlIndex, url);

    if (!t) {
      console.log("query for payment failed");
      return {
        success: false,
      }
    }
    console.log("query for payment succeeded:", t);
    let resp = {
      success: true,
      payReq: t.payReq,
      H_contract: t.contractHash,
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
      let reserve = await this.updateReserve(reserveRecord.reserve_pub);
      let n = await this.depleteReserve(reserve);

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
      setTimeout(() => this.processPreCoin(preCoin, Math.min(retryDelayMs * 2, 5 * 60 * 1000)),
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
      let nextRetryDelayMs = Math.min(retryDelayMs * 2, 5 * 60 * 1000);
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
   *
   * Adds the corresponding exchange as a trusted exchange if it is neither
   * audited nor trusted already.
   */
  async createReserve(req: CreateReserveRequest): Promise<CreateReserveResponse> {
    let keypair = await this.cryptoApi.createEddsaKeypair();
    const now = (new Date).getTime();
    const canonExchange = canonicalizeBaseUrl(req.exchange);

    const reserveRecord: ReserveRecord = {
      hasPayback: false,
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

    let exchangeInfo = await this.updateExchangeFromUrl(req.exchange);
    let {isAudited, isTrusted} = await this.getExchangeTrust(exchangeInfo);
    let currencyRecord = await this.q().get(Stores.currencies, exchangeInfo.currency);
    if (!currencyRecord) {
      currencyRecord = {
        name: exchangeInfo.currency,
        fractionalDigits: 2,
        exchanges: [],
        auditors: [],
      }
    }

    if (!isAudited && !isTrusted) {
      currencyRecord.exchanges.push({baseUrl: req.exchange, priority: 0});
    }

    await this.q()
              .put(Stores.currencies, currencyRecord)
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
    let reqUrl = (new URI("reserve/withdraw")).absoluteTo(reserve.exchange_base_url);
    let resp = await this.http.postJson(reqUrl.href(), wd);

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
      reservePub: pc.reservePub,
      coinPub: pc.coinPub,
      coinPriv: pc.coinPriv,
      denomPub: pc.denomPub,
      denomSig: denomSig,
      blindingKey: pc.blindingKey,
      currentAmount: pc.coinValue,
      exchangeBaseUrl: pc.exchangeBaseUrl,
      status: CoinStatus.Fresh,
    };
    return coin;
  }


  /**
   * Withdraw coins from a reserve until it is empty.
   */
  private async depleteReserve(reserve: ReserveRecord): Promise<number> {
    console.log("depleting reserve");
    if (!reserve.current_amount) {
      throw Error("can't withdraw when amount is unknown");
    }
    let currentAmount = reserve.current_amount;
    if (!currentAmount) {
      throw Error("can't withdraw when amount is unknown");
    }
    let denomsForWithdraw = await this.getVerifiedWithdrawDenomList(reserve.exchange_base_url,
                                                                    currentAmount);

    console.log(`withdrawing ${denomsForWithdraw.length} coins`);

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
  private async updateReserve(reservePub: string): Promise<ReserveRecord> {
    let reserve = await this.q()
                            .get<ReserveRecord>(Stores.reserves, reservePub);
    if (!reserve) {
      throw Error("reserve not in db");
    }
    let reqUrl = new URI("reserve/status").absoluteTo(reserve.exchange_base_url);
    reqUrl.query({'reserve_pub': reservePub});
    let resp = await this.http.get(reqUrl.href());
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
    let reqUrl = new URI("wire").absoluteTo(exchangeBaseUrl);
    let resp = await this.http.get(reqUrl.href());

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



  /**
   * Check if and how an exchange is trusted and/or audited.
   */
  async getExchangeTrust(exchangeInfo: ExchangeRecord): Promise<{isTrusted: boolean, isAudited: boolean}> {
    let isTrusted = false;
    let isAudited = false;
    let currencyRecord = await this.q().get(Stores.currencies, exchangeInfo.currency);
    if (currencyRecord) {
      for (let trustedExchange of currencyRecord.exchanges) {
        if (trustedExchange.baseUrl == exchangeInfo.baseUrl) {
          isTrusted = true;
          break;
        }
      }
      for (let trustedAuditor of currencyRecord.auditors) {
        for (let exchangeAuditor of exchangeInfo.auditors) {
          if (trustedAuditor.baseUrl == exchangeAuditor.url) {
            isAudited = true;
            break;
          }
        }
      }
    }
    return {isTrusted, isAudited};
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

    let wireFees = await this.q().get(Stores.exchangeWireFees, baseUrl);
    if (!wireFees) {
      // should never happen unless DB is inconsistent
      throw Error(`no wire fees found for exchange ${baseUrl}`);
    }

    let {isTrusted, isAudited} = await this.getExchangeTrust(exchangeInfo);

    let earliestDepositExpiration = Infinity;;
    for (let denom of selectedDenoms) {
      let expireDeposit = getTalerStampSec(denom.stampExpireDeposit)!;
      if (expireDeposit < earliestDepositExpiration) {
        earliestDepositExpiration = expireDeposit;
      }
    }

    let ret: ReserveCreationInfo = {
      exchangeInfo,
      selectedDenoms,
      wireInfo,
      wireFees,
      isAudited,
      isTrusted,
      withdrawFee: acc,
      earliestDepositExpiration,
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
    let keysUrl = new URI("keys").absoluteTo(baseUrl);
    let wireUrl = new URI("wire").absoluteTo(baseUrl);
    let keysResp = await this.http.get(keysUrl.href());
    if (keysResp.status != 200) {
      throw Error("/keys request failed");
    }
    let wireResp = await this.http.get(wireUrl.href());
    if (wireResp.status != 200) {
      throw Error("/wire request failed");
    }
    let exchangeKeysJson = KeysJson.checked(JSON.parse(keysResp.responseText));
    let wireRespJson = JSON.parse(wireResp.responseText);
    if (typeof wireRespJson !== "object") {
      throw Error("/wire response is not an object");
    }
    console.log("exchange wire", wireRespJson);
    let wireMethodDetails: WireDetailJson[] = [];
    for (let methodName in wireRespJson) {
      wireMethodDetails.push(WireDetailJson.checked(wireRespJson[methodName]));
    }
    return this.updateExchangeFromJson(baseUrl, exchangeKeysJson, wireMethodDetails);
  }


  private async suspendCoins(exchangeInfo: ExchangeRecord): Promise<void> {
    let suspendedCoins = await (
      this.q()
          .iterIndex(Stores.coins.exchangeBaseUrlIndex, exchangeInfo.baseUrl)
          .indexJoinLeft(Stores.denominations.exchangeBaseUrlIndex,
                         (e) => e.exchangeBaseUrl)
          .reduce((cd: JoinLeftResult<CoinRecord,DenominationRecord>,
                   suspendedCoins: CoinRecord[]) => {
            if ((!cd.right) || (!cd.right.isOffered)) {
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
                                       exchangeKeysJson: KeysJson,
                                       wireMethodDetails: WireDetailJson[]): Promise<ExchangeRecord> {

    // FIXME: all this should probably be commited atomically
    const updateTimeSec = getTalerStampSec(exchangeKeysJson.list_issue_date);
    if (updateTimeSec === null) {
      throw Error("invalid update time");
    }

    if (exchangeKeysJson.denoms.length == 0) {
      throw Error("exchange doesn't offer any denominations");
    }

    const r = await this.q().get<ExchangeRecord>(Stores.exchanges, baseUrl);

    let exchangeInfo: ExchangeRecord;

    if (!r) {
      exchangeInfo = {
        baseUrl,
        lastUpdateTime: updateTimeSec,
        masterPublicKey: exchangeKeysJson.master_public_key,
        auditors: exchangeKeysJson.auditors,
        currency: exchangeKeysJson.denoms[0].value.currency,
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

    let oldWireFees = await this.q().get(Stores.exchangeWireFees, baseUrl);
    if (!oldWireFees) {
      oldWireFees = {
        exchangeBaseUrl: baseUrl,
        feesForType: {},
      };
    }

    for (let detail of wireMethodDetails) {
      let latestFeeStamp = 0;
      let fees = oldWireFees.feesForType[detail.type] || [];
      oldWireFees.feesForType[detail.type] = fees;
      for (let oldFee of fees) {
        if (oldFee.endStamp > latestFeeStamp) {
          latestFeeStamp = oldFee.endStamp;
        }
      }
      for (let fee of detail.fees) {
        let start = getTalerStampSec(fee.start_date);
        if (start == null) {
          console.error("invalid start stamp in fee", fee);
          continue;
        }
        if (start < latestFeeStamp) {
          continue;
        }
        let end = getTalerStampSec(fee.end_date);
        if (end == null) {
          console.error("invalid end stamp in fee", fee);
          continue;
        }
        let wf: WireFee = {
          wireFee: fee.wire_fee,
          closingFee: fee.closing_fee,
          sig: fee.sig,
          startStamp: start,
          endStamp: end,
        }
        let valid: boolean = await this.cryptoApi.isValidWireFee(detail.type, wf, exchangeInfo.masterPublicKey);
        if (!valid) {
          console.error("fee signature invalid", fee);
          throw Error("fee signature invalid");
        }
        fees.push(wf);
      }
    }

    await this.q().put(Stores.exchangeWireFees, oldWireFees);

    if (exchangeKeysJson.payback) {
      for (let payback of exchangeKeysJson.payback) {
        let denom = await this.q().getIndexed(Stores.denominations.denomPubHashIndex, payback.h_denom_pub);
        if (!denom) {
          continue;
        }
        console.log(`cashing back denom`, denom);
        let coins = await this.q().iterIndex(Stores.coins.denomPubIndex, denom.denomPub).toArray();
        for (let coin of coins) {
          this.payback(coin.coinPub);
        }
      }
    }

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
    const newAndUnseenDenoms: typeof existingDenoms = {};

    for (let d of newKeys.denoms) {
      let dr = await this.denominationRecordFromKeys(exchangeInfo.baseUrl, d);
      if (!(d.denom_pub in existingDenoms)) {
        newAndUnseenDenoms[dr.denomPub] = dr;
      }
      newDenoms[dr.denomPub] = dr;
    }

    for (let oldDenomPub in existingDenoms) {
      if (!(oldDenomPub in newDenoms)) {
        let d = existingDenoms[oldDenomPub];
        d.isOffered = false;
      }
    }

    await this.q()
              .putAll(Stores.denominations,
                      Object.keys(newAndUnseenDenoms).map((d) => newAndUnseenDenoms[d]))
              .putAll(Stores.denominations,
                      Object.keys(existingDenoms).map((d) => existingDenoms[d]))
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
          paybackAmount: z,
        };
      }
      return entry;
    }

    function collectBalances(c: CoinRecord, balance: WalletBalance) {
      if (c.suspended) {
        return balance;
      }
      if (!(c.status == CoinStatus.Dirty || c.status == CoinStatus.Fresh)) {
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

    function collectPaybacks(r: ReserveRecord, balance: WalletBalance) {
      if (!r.hasPayback) {
        return balance;
      }
      let entry = ensureEntry(balance, r.requested_amount.currency);
      if (Amounts.cmp(smallestWithdraw[r.exchange_base_url], r.current_amount!) < 0) {
        entry.paybackAmount = Amounts.add(entry.paybackAmount, r.current_amount!).amount;
      }
      return balance;
    }

    function collectPendingRefresh(r: RefreshSessionRecord,
                                   balance: WalletBalance) {
      // Don't count finished refreshes, since the refresh already resulted
      // in coins being added to the wallet.
      if (r.finished) {
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

    let tx = this.q();
    tx.iter(Stores.coins)
      .reduce(collectBalances, balance);
    tx.iter(Stores.refresh)
      .reduce(collectPendingRefresh, balance);
    tx.iter(Stores.reserves)
      .reduce(collectPendingWithdraw, balance);
    tx.iter(Stores.reserves)
      .reduce(collectPaybacks, balance);
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

    if (coin.currentAmount.value == 0 && coin.currentAmount.fraction == 0) {
      return undefined;
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

    console.log("refreshing coin", coin);
    console.log("refreshing into", newCoinDenoms);

    if (newCoinDenoms.length == 0) {
      console.log(`not refreshing, available amount ${amountToPretty(availableAmount)} too small`);
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
      c.status = CoinStatus.Refreshed;
      return c;
    }

    // Store refresh session and subtract refreshed amount from
    // coin in the same transaction.
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
      console.log("got old session for", oldCoinPub);
      console.log(oldSession);
      refreshSession = oldSession;
    } else {
      refreshSession = await this.createRefreshSession(oldCoinPub);
    }
    if (!refreshSession) {
      // refreshing not necessary
      console.log("not refreshing", oldCoinPub);
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

    let reqUrl = new URI("refresh/melt").absoluteTo(refreshSession.exchangeBaseUrl);
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
    let resp = await this.http.postJson(reqUrl.href(), req);

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

    let reqUrl = new URI("refresh/reveal")
      .absoluteTo(refreshSession.exchangeBaseUrl);
    console.log("reveal request:", req);
    let resp = await this.http.postJson(reqUrl.href(), req);

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
        reservePub: undefined,
        blindingKey: pc.blindingKey,
        coinPub: pc.publicKey,
        coinPriv: pc.privateKey,
        denomPub: denom.denomPub,
        denomSig: denomSig,
        currentAmount: denom.value,
        exchangeBaseUrl: refreshSession.exchangeBaseUrl,
        status: CoinStatus.Fresh,
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

  async getCurrencies(): Promise<CurrencyRecord[]> {
    return this.q()
               .iter<CurrencyRecord>(Stores.currencies)
               .flatMap((e) => [e])
               .toArray();
  }

  async updateCurrency(currencyRecord: CurrencyRecord): Promise<void> {
    console.log("updating currency to", currencyRecord);
    await this.q()
               .put(Stores.currencies, currencyRecord)
               .finish();
    this.notifier.notify();
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
   * Generate a nonce in form of an EdDSA public key.
   * Store the private key in our DB, so we can prove ownership.
   */
  async generateNonce(): Promise<string> {
    let {priv, pub} = await this.cryptoApi.createEddsaKeypair();
    await this.q()
              .put(Stores.nonces, {priv, pub})
              .finish();
    return pub;
  }

  async getCurrencyRecord(currency: string): Promise<CurrencyRecord|undefined> {
    return this.q().get(Stores.currencies, currency);
  }


  async paymentSucceeded(contractHash: string, merchantSig: string): Promise<any> {
    const doPaymentSucceeded = async() => {
      let t = await this.q().get<TransactionRecord>(Stores.transactions,
                                                    contractHash);
      if (!t) {
        console.error("contract not found");
        return;
      }
      let merchantPub = t.contract.merchant_pub;
      let valid = this.cryptoApi.isValidPaymentSignature(merchantSig, contractHash, merchantPub);
      if (!valid) {
        console.error("merchant payment signature invalid");
        // FIXME: properly display error
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
        c.status = CoinStatus.Dirty;
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

  async payback(coinPub: string): Promise<void> {
    let coin = await this.q().get(Stores.coins, coinPub);
    if (!coin) {
      throw Error(`Coin ${coinPub} not found, can't request payback`);
    }
    let reservePub = coin.reservePub;
    if (!reservePub) {
      throw Error(`Can't request payback for a refreshed coin`);
    }
    let reserve = await this.q().get(Stores.reserves, reservePub);
    if (!reserve) {
      throw Error(`Reserve of coin ${coinPub} not found`);
    }
    switch (coin.status) {
      case CoinStatus.Refreshed:
        throw Error(`Can't do payback for coin ${coinPub} since it's refreshed`);
      case CoinStatus.PaybackDone:
        console.log(`Coin ${coinPub} already payed back`);
        return;
    }
    coin.status = CoinStatus.PaybackPending;
    // Even if we didn't get the payback yet, we suspend withdrawal, since
    // technically we might update reserve status before we get the response
    // from the reserve for the payback request.
    reserve.hasPayback = true;
    await this.q().put(Stores.coins, coin).put(Stores.reserves, reserve);

    let paybackRequest = await this.cryptoApi.createPaybackRequest(coin);
    let reqUrl = new URI("payback").absoluteTo(coin.exchangeBaseUrl);
    let resp = await this.http.postJson(reqUrl.href(), paybackRequest);
    if (resp.status != 200) {
      throw Error();
    }
    let paybackConfirmation = PaybackConfirmation.checked(JSON.parse(resp.responseText));
    if (paybackConfirmation.reserve_pub != coin.reservePub) {
      throw Error(`Coin's reserve doesn't match reserve on payback`);
    }
    coin = await this.q().get(Stores.coins, coinPub);
    if (!coin) {
      throw Error(`Coin ${coinPub} not found, can't confirm payback`);
    }
    coin.status = CoinStatus.PaybackDone;
    await this.q().put(Stores.coins, coin);
    await this.updateReserve(reservePub!);
  }


  async denominationRecordFromKeys(exchangeBaseUrl: string, denomIn: Denomination): Promise<DenominationRecord> {
    let denomPubHash = await this.cryptoApi.hashDenomPub(denomIn.denom_pub);
    let d: DenominationRecord = {
      denomPubHash,
      denomPub: denomIn.denom_pub,
      exchangeBaseUrl: exchangeBaseUrl,
      feeDeposit: denomIn.fee_deposit,
      masterSig: denomIn.master_sig,
      feeRefund: denomIn.fee_refund,
      feeRefresh: denomIn.fee_refresh,
      feeWithdraw: denomIn.fee_withdraw,
      stampExpireDeposit: denomIn.stamp_expire_deposit,
      stampExpireLegal: denomIn.stamp_expire_legal,
      stampExpireWithdraw: denomIn.stamp_expire_withdraw,
      stampStart: denomIn.stamp_start,
      status: DenominationStatus.Unverified,
      isOffered: true,
      value: denomIn.value,
    };
    return d;
  }

  async withdrawPaybackReserve(reservePub: string): Promise<void> {
    let reserve = await this.q().get(Stores.reserves, reservePub);
    if (!reserve) {
      throw Error(`Reserve ${reservePub} does not exist`);
    }
    reserve.hasPayback = false;
    await this.q().put(Stores.reserves, reserve);
    this.depleteReserve(reserve);
  }

  async getPaybackReserves(): Promise<ReserveRecord[]> {
    return await this.q().iter(Stores.reserves).filter(r => r.hasPayback).toArray()
  }

}
