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
import {Checkable} from "./checkable";
import {CryptoApi} from "./crypto/cryptoApi";
import {
  amountToPretty,
  canonicalJson,
  canonicalizeBaseUrl,
  getTalerStampSec,
} from "./helpers";
import {
  HttpRequestLibrary,
  RequestException,
} from "./http";
import * as LibtoolVersion from "./libtoolVersion";
import {
  AbortTransaction,
  Index,
  JoinLeftResult,
  JoinResult,
  QueryRoot,
  Store,
} from "./query";
import {TimerGroup} from "./timer";
import {
  AmountJson,
  Amounts,
  Auditor,
  CheckPayResult,
  CoinPaySig,
  CoinRecord,
  CoinSelectionResult,
  CoinStatus,
  CoinWithDenom,
  ConfirmPayResult,
  ConfirmReserveRequest,
  ContractTerms,
  CreateReserveRequest,
  CreateReserveResponse,
  CurrencyRecord,
  Denomination,
  DenominationRecord,
  DenominationStatus,
  ExchangeHandle,
  ExchangeRecord,
  ExchangeWireFeesRecord,
  HistoryRecord,
  Notifier,
  PayCoinInfo,
  PayReq,
  PaybackConfirmation,
  PreCoinRecord,
  ProposalRecord,
  PurchaseRecord,
  QueryPaymentResult,
  RefreshSessionRecord,
  RefundPermission,
  ReserveCreationInfo,
  ReserveRecord,
  ReturnCoinsRequest,
  SenderWireInfos,
  TipPlanchetDetail,
  TipRecord,
  TipResponse,
  TipStatus,
  WalletBalance,
  WalletBalanceEntry,
  WireFee,
  WireInfo,
} from "./types";

import URI = require("urijs");


/**
 * Element of the payback list that the
 * exchange gives us in /keys.
 */
@Checkable.Class()
export class Payback {
  /**
   * The hash of the denomination public key for which the payback is offered.
   */
  @Checkable.String
  h_denom_pub: string;
}


/**
 * Structure that the exchange gives us in /keys.
 */
@Checkable.Class({extra: true})
export class KeysJson {
  /**
   * List of offered denominations.
   */
  @Checkable.List(Checkable.Value(Denomination))
  denoms: Denomination[];

  /**
   * The exchange's master public key.
   */
  @Checkable.String
  master_public_key: string;

  /**
   * The list of auditors (partially) auditing the exchange.
   */
  @Checkable.List(Checkable.Value(Auditor))
  auditors: Auditor[];

  /**
   * Timestamp when this response was issued.
   */
  @Checkable.String
  list_issue_date: string;

  /**
   * List of paybacks for compromised denominations.
   */
  @Checkable.Optional(Checkable.List(Checkable.Value(Payback)))
  payback?: Payback[];

  /**
   * Short-lived signing keys used to sign online
   * responses.
   */
  @Checkable.Any
  signkeys: any;

  /**
   * Protocol version.
   */
  @Checkable.Optional(Checkable.String)
  version?: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => KeysJson;
}


/**
 * Wire fees as anounced by the exchange.
 */
@Checkable.Class()
class WireFeesJson {
  /**
   * Cost of a wire transfer.
   */
  @Checkable.Value(AmountJson)
  wire_fee: AmountJson;

  /**
   * Cost of clising a reserve.
   */
  @Checkable.Value(AmountJson)
  closing_fee: AmountJson;

  /**
   * Signature made with the exchange's master key.
   */
  @Checkable.String
  sig: string;

  /**
   * Date from which the fee applies.
   */
  @Checkable.String
  start_date: string;

  /**
   * Data after which the fee doesn't apply anymore.
   */
  @Checkable.String
  end_date: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => WireFeesJson;
}


/**
 * Information about wire transfer methods supported
 * by the exchange.
 */
@Checkable.Class({extra: true})
class WireDetailJson {
  /**
   * Name of the wire transfer method.
   */
  @Checkable.String
  type: string;

  /**
   * Fees associated with the wire transfer method.
   */
  @Checkable.List(Checkable.Value(WireFeesJson))
  fees: WireFeesJson[];

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => WireDetailJson;
}


/**
 * Badge that shows activity for the wallet.
 */
export interface Badge {
  /**
   * Start indicating background activity.
   */
  startBusy(): void;

  /**
   * Stop indicating background activity.
   */
  stopBusy(): void;
}


/**
 * Nonce record as stored in the wallet's database.
 */
export interface NonceRecord {
  priv: string;
  pub: string;
}

/**
 * Configuration key/value entries to configure
 * the wallet.
 */
export interface ConfigRecord {
  key: string;
  value: any;
}


/**
 * Coin that we're depositing ourselves.
 */
export interface DepositCoin {
  coinPaySig: CoinPaySig;

  /**
   * Undefined if coin not deposited, otherwise signature
   * from the exchange confirming the deposit.
   */
  depositedSig?: string;
}

/**
 * Record stored in the wallet's database when the user sends coins back to
 * their own bank account.  Stores the status of coins that are deposited to
 * the wallet itself, where the wallet acts as a "merchant" for the customer.
 */
export interface CoinsReturnRecord {
  /**
   * Hash of the contract for sending coins to our own bank account.
   */
  contractTermsHash: string;

  contractTerms: ContractTerms;

  /**
   * Private key where corresponding
   * public key is used in the contract terms
   * as merchant pub.
   */
  merchantPriv: string;

  coins: DepositCoin[];

  /**
   * Exchange base URL to deposit coins at.
   */
  exchange: string;

  /**
   * Our own wire information for the deposit.
   */
  wire: any;
}


/**
 * Wallet protocol version spoken with the exchange
 * and merchant.
 *
 * Uses libtool's current:revision:age versioning.
 */
export const WALLET_PROTOCOL_VERSION = "0:0:0";

/**
 * Current database version, should be incremented
 * each time we do incompatible schema changes on the database.
 * In the future we might consider adding migration functions for
 * each version increment.
 */
export const WALLET_DB_VERSION = 21;

const builtinCurrencies: CurrencyRecord[] = [
  {
    auditors: [
      {
        auditorPub: "BW9DC48PHQY4NH011SHHX36DZZ3Q22Y6X7FZ1VD1CMZ2PTFZ6PN0",
        baseUrl: "https://auditor.demo.taler.net/",
        expirationStamp: (new Date(2027, 1)).getTime(),
      },
    ],
    exchanges: [],
    fractionalDigits: 2,
    name: "KUDOS",
  },
];


function isWithdrawableDenom(d: DenominationRecord) {
  const nowSec = (new Date()).getTime() / 1000;
  const stampWithdrawSec = getTalerStampSec(d.stampExpireWithdraw);
  if (stampWithdrawSec === null) {
    return false;
  }
  const stampStartSec = getTalerStampSec(d.stampStart);
  if (stampStartSec === null) {
    return false;
  }
  // Withdraw if still possible to withdraw within a minute
  if ((stampWithdrawSec + 60 > nowSec) && (nowSec >= stampStartSec)) {
    return true;
  }
  return false;
}


function strcmp(s1: string, s2: string): number {
  if (s1 < s2) {
    return -1;
  }
  if (s1 > s2) {
    return 1;
  }
  return 0;
}


interface SelectPayCoinsResult {
  cds: CoinWithDenom[];
  totalFees: AmountJson;
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
export function getTotalRefreshCost(denoms: DenominationRecord[],
                                    refreshedDenom: DenominationRecord,
                                    amountLeft: AmountJson): AmountJson {
  const withdrawAmount = Amounts.sub(amountLeft, refreshedDenom.feeRefresh).amount;
  const withdrawDenoms = getWithdrawDenomList(withdrawAmount, denoms);
  const resultingAmount = Amounts.add(Amounts.getZero(withdrawAmount.currency),
                                      ...withdrawDenoms.map((d) => d.value)).amount;
  const totalCost = Amounts.sub(amountLeft, resultingAmount).amount;
  console.log("total refresh cost for", amountToPretty(amountLeft), "is", amountToPretty(totalCost));
  return totalCost;
}


/**
 * Select coins for a payment under the merchant's constraints.
 *
 * @param denoms all available denoms, used to compute refresh fees
 */
export function selectPayCoins(denoms: DenominationRecord[], cds: CoinWithDenom[], paymentAmount: AmountJson,
                               depositFeeLimit: AmountJson): SelectPayCoinsResult|undefined {
  if (cds.length === 0) {
    return undefined;
  }
  // Sort by ascending deposit fee and denomPub if deposit fee is the same
  // (to guarantee deterministic results)
  cds.sort((o1, o2) => Amounts.cmp(o1.denom.feeDeposit, o2.denom.feeDeposit) ||
                                     strcmp(o1.denom.denomPub, o2.denom.denomPub));
  const currency = cds[0].denom.value.currency;
  const cdsResult: CoinWithDenom[] = [];
  let accDepositFee: AmountJson = Amounts.getZero(currency);
  let accAmount: AmountJson = Amounts.getZero(currency);
  for (const {coin, denom} of cds) {
    if (coin.suspended) {
      continue;
    }
    if (coin.status !== CoinStatus.Fresh) {
      continue;
    }
    if (Amounts.cmp(denom.feeDeposit, coin.currentAmount) >= 0) {
      continue;
    }
    cdsResult.push({coin, denom});
    accDepositFee = Amounts.add(denom.feeDeposit, accDepositFee).amount;
    let leftAmount = Amounts.sub(coin.currentAmount, Amounts.sub(paymentAmount, accAmount).amount).amount;
    accAmount = Amounts.add(coin.currentAmount, accAmount).amount;
    const coversAmount = Amounts.cmp(accAmount, paymentAmount) >= 0;
    const coversAmountWithFee = Amounts.cmp(accAmount,
                                      Amounts.add(paymentAmount,
                                                  denom.feeDeposit).amount) >= 0;
    const isBelowFee = Amounts.cmp(accDepositFee, depositFeeLimit) <= 0;

    console.log("coin selection", { coversAmount, isBelowFee, accDepositFee, accAmount, paymentAmount });

    if ((coversAmount && isBelowFee) || coversAmountWithFee) {
      const depositFeeToCover = Amounts.sub(accDepositFee, depositFeeLimit).amount;
      leftAmount = Amounts.sub(leftAmount, depositFeeToCover).amount;
      console.log("deposit fee to cover", amountToPretty(depositFeeToCover));

      let totalFees: AmountJson = Amounts.getZero(currency);
      if (coversAmountWithFee && !isBelowFee) {
        // these are the fees the customer has to pay
        // because the merchant doesn't cover them
        totalFees = Amounts.sub(depositFeeLimit, accDepositFee).amount;
      }
      totalFees = Amounts.add(totalFees, getTotalRefreshCost(denoms, denom, leftAmount)).amount;
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

/* tslint:disable:completed-docs */

/**
 * The stores and indices for the wallet database.
 */
export namespace Stores {
  class ExchangeStore extends Store<ExchangeRecord> {
    constructor() {
      super("exchanges", {keyPath: "baseUrl"});
    }

    pubKeyIndex = new Index<string, ExchangeRecord>(this, "pubKeyIndex", "masterPublicKey");
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

    exchangeBaseUrlIndex = new Index<string, CoinRecord>(this, "exchangeBaseUrl", "exchangeBaseUrl");
    denomPubIndex = new Index<string, CoinRecord>(this, "denomPubIndex", "denomPub");
  }

  class ProposalsStore extends Store<ProposalRecord> {
    constructor() {
      super("proposals", {
        autoIncrement: true,
        keyPath: "id",
      });
    }
    timestampIndex = new Index<string, ProposalRecord>(this, "timestampIndex", "timestamp");
  }

  class PurchasesStore extends Store<PurchaseRecord> {
    constructor() {
      super("purchases", {keyPath: "contractTermsHash"});
    }

    fulfillmentUrlIndex = new Index<string, PurchaseRecord>(this, "fulfillmentUrlIndex", "contractTerms.fulfillment_url");
    orderIdIndex = new Index<string, PurchaseRecord>(this, "orderIdIndex", "contractTerms.order_id");
    timestampIndex = new Index<string, PurchaseRecord>(this, "timestampIndex", "timestamp");
  }

  class DenominationsStore extends Store<DenominationRecord> {
    constructor() {
      // cast needed because of bug in type annotations
      super("denominations",
            {keyPath: ["exchangeBaseUrl", "denomPub"] as any as IDBKeyPath});
    }

    denomPubHashIndex = new Index<string, DenominationRecord>(this, "denomPubHashIndex", "denomPubHash");
    exchangeBaseUrlIndex = new Index<string, DenominationRecord>(this, "exchangeBaseUrlIndex", "exchangeBaseUrl");
    denomPubIndex = new Index<string, DenominationRecord>(this, "denomPubIndex", "denomPub");
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

  class ReservesStore extends Store<ReserveRecord> {
    constructor() {
      super("reserves", {keyPath: "reserve_pub"});
    }
    timestampCreatedIndex = new Index<string, ReserveRecord>(this, "timestampCreatedIndex", "created");
    timestampConfirmedIndex = new Index<string, ReserveRecord>(this, "timestampConfirmedIndex", "timestamp_confirmed");
    timestampDepletedIndex = new Index<string, ReserveRecord>(this, "timestampDepletedIndex", "timestamp_depleted");
  }

  class TipsStore extends Store<TipRecord> {
    constructor() {
      super("tips", {keyPath: ["tipId", "merchantDomain"] as any as IDBKeyPath});
    }
    coinPubIndex = new Index<string, TipRecord>(this, "coinPubIndex", "coinPubs", { multiEntry: true });
  }

  export const coins = new CoinsStore();
  export const coinsReturns = new Store<CoinsReturnRecord>("coinsReturns", {keyPath: "contractTermsHash"});
  export const config = new ConfigStore();
  export const currencies = new CurrenciesStore();
  export const denominations = new DenominationsStore();
  export const exchangeWireFees = new ExchangeWireFeesStore();
  export const exchanges = new ExchangeStore();
  export const nonces = new NonceStore();
  export const precoins = new Store<PreCoinRecord>("precoins", {keyPath: "coinPub"});
  export const proposals = new ProposalsStore();
  export const refresh = new Store<RefreshSessionRecord>("refresh", {keyPath: "id", autoIncrement: true});
  export const reserves = new ReservesStore();
  export const purchases = new PurchasesStore();
  export const tips = new TipsStore();
}

/* tslint:enable:completed-docs */


interface CoinsForPaymentArgs {
  allowedAuditors: Auditor[];
  allowedExchanges: ExchangeHandle[];
  depositFeeLimit: AmountJson;
  paymentAmount: AmountJson;
  wireFeeAmortization: number;
  wireFeeLimit: AmountJson;
  wireFeeTime: number;
  wireMethod: string;
}


/**
 * The platform-independent wallet implementation.
 */
export class Wallet {
  /**
   * IndexedDB database used by the wallet.
   */
  db: IDBDatabase;
  private http: HttpRequestLibrary;
  private badge: Badge;
  private notifier: Notifier;
  private cryptoApi: CryptoApi;
  private processPreCoinConcurrent = 0;
  private processPreCoinThrottle: {[url: string]: number} = {};
  private timerGroup: TimerGroup;

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

    this.timerGroup = new TimerGroup();

    this.timerGroup.every(1000 * 60 * 15, () => this.updateExchanges());
  }

  private async fillDefaults() {
    const onTrue = (r: QueryRoot) => {
      console.log("defaults already applied");
    };
    const onFalse = (r: QueryRoot) => {
      console.log("applying defaults");
      r.put(Stores.config, {key: "currencyDefaultsApplied", value: true})
        .putAll(Stores.currencies, builtinCurrencies)
        .finish();
    };
    await (
      this.q()
          .iter(Stores.config)
          .filter((x) => x.key === "currencyDefaultsApplied")
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
    if (this.runningOperations.size === 0) {
      this.badge.stopBusy();
    }
  }

  async updateExchanges(): Promise<void> {
    console.log("updating exchanges");

    const exchangesUrls = await this.q()
                                   .iter(Stores.exchanges)
                                   .map((e) => e.baseUrl)
                                   .toArray();

    for (const url of exchangesUrls) {
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

    this.q()
        .iter(Stores.coinsReturns)
        .reduce((r: CoinsReturnRecord) => {
          this.depositReturnedCoins(r);
        });

    // FIXME: optimize via index
    this.q()
        .iter(Stores.coins)
        .reduce((c: CoinRecord) => {
          if (c.status === CoinStatus.Dirty) {
            console.log("resuming pending refresh for coin", c);
            this.refresh(c.coinPub);
          }
        });
  }


  private async getCoinsForReturn(exchangeBaseUrl: string, amount: AmountJson): Promise<CoinWithDenom[] | undefined> {
    const exchange = await this.q().get(Stores.exchanges, exchangeBaseUrl);
    if (!exchange) {
      throw Error(`Exchange ${exchangeBaseUrl} not known to the wallet`);
    }

    const coins: CoinRecord[] = await (
      this.q()
          .iterIndex(Stores.coins.exchangeBaseUrlIndex, exchange.baseUrl)
          .toArray()
    );

    if (!coins || !coins.length) {
      return [];
    }

    const denoms = await this.q().iterIndex(Stores.denominations.exchangeBaseUrlIndex, exchange.baseUrl).toArray();

    // Denomination of the first coin, we assume that all other
    // coins have the same currency
    const firstDenom = await this.q().get(Stores.denominations,
                                          [
                                            exchange.baseUrl,
                                            coins[0].denomPub,
                                          ]);
    if (!firstDenom) {
      throw Error("db inconsistent");
    }
    const currency = firstDenom.value.currency;

    const cds: CoinWithDenom[] = [];
    for (const coin of coins) {
      const denom = await this.q().get(Stores.denominations,
                                     [exchange.baseUrl, coin.denomPub]);
      if (!denom) {
        throw Error("db inconsistent");
      }
      if (denom.value.currency !== currency) {
        console.warn(`same pubkey for different currencies at exchange ${exchange.baseUrl}`);
        continue;
      }
      if (coin.suspended) {
        continue;
      }
      if (coin.status !== CoinStatus.Fresh) {
        continue;
      }
      cds.push({coin, denom});
    }

    console.log("coin return:  selecting from possible coins", { cds, amount } );

    const res = selectPayCoins(denoms, cds, amount, amount);
    if (res) {
      return res.cds;
    }
    return undefined;
  }


  /**
   * Get exchanges and associated coins that are still spendable,
   * but only if the sum the coins' remaining value exceeds the payment amount.
   */
  private async getCoinsForPayment(args: CoinsForPaymentArgs): Promise<CoinSelectionResult|undefined> {
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

    const exchanges = await this.q().iter(Stores.exchanges).toArray();

    for (const exchange of exchanges) {
      let isOkay: boolean = false;

      // is the exchange explicitly allowed?
      for (const allowedExchange of allowedExchanges) {
        if (allowedExchange.master_pub === exchange.masterPublicKey) {
          isOkay = true;
          break;
        }
      }

      // is the exchange allowed because of one of its auditors?
      if (!isOkay) {
        for (const allowedAuditor of allowedAuditors) {
          for (const auditor of exchange.auditors) {
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

      const coins: CoinRecord[] = await this.q()
                                          .iterIndex(Stores.coins.exchangeBaseUrlIndex,
                                                     exchange.baseUrl)
                                          .toArray();
      const denoms = await this.q().iterIndex(Stores.denominations.exchangeBaseUrlIndex, exchange.baseUrl).toArray();
      if (!coins || coins.length === 0) {
        continue;
      }

      // Denomination of the first coin, we assume that all other
      // coins have the same currency
      const firstDenom = await this.q().get(Stores.denominations,
                                            [
                                              exchange.baseUrl,
                                              coins[0].denomPub,
                                            ]);
      if (!firstDenom) {
        throw Error("db inconsistent");
      }
      const currency = firstDenom.value.currency;
      const cds: CoinWithDenom[] = [];
      for (const coin of coins) {
        const denom = await this.q().get(Stores.denominations,
                                       [exchange.baseUrl, coin.denomPub]);
        if (!denom) {
          throw Error("db inconsistent");
        }
        if (denom.value.currency !== currency) {
          console.warn(`same pubkey for different currencies at exchange ${exchange.baseUrl}`);
          continue;
        }
        if (coin.suspended) {
          continue;
        }
        if (coin.status !== CoinStatus.Fresh) {
          continue;
        }
        cds.push({coin, denom});
      }

      const fees = await this.q().get(Stores.exchangeWireFees, exchange.baseUrl);
      if (!fees) {
        console.error("no fees found for exchange", exchange);
        continue;
      }

      let totalFees = Amounts.getZero(currency);
      let wireFee: AmountJson|undefined;
      for (const fee of (fees.feesForType[wireMethod] || [])) {
        if (fee.startStamp >= wireFeeTime && fee.endStamp <= wireFeeTime) {
          wireFee = fee.wireFee;
          break;
        }
      }

      if (wireFee) {
        const amortizedWireFee = Amounts.divide(wireFee, wireFeeAmortization);
        if (Amounts.cmp(wireFeeLimit, amortizedWireFee) < 0) {
          totalFees = Amounts.add(amortizedWireFee, totalFees).amount;
          remainingAmount = Amounts.add(amortizedWireFee, remainingAmount).amount;
        }
      }

      const res = selectPayCoins(denoms, cds, remainingAmount, depositFeeLimit);
      if (res) {
        totalFees = Amounts.add(totalFees, res.totalFees).amount;
        return {
          cds: res.cds,
          exchangeUrl: exchange.baseUrl,
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
  private async recordConfirmPay(proposal: ProposalRecord,
                                 payCoinInfo: PayCoinInfo,
                                 chosenExchange: string): Promise<void> {
    const payReq: PayReq = {
      coins: payCoinInfo.map((x) => x.sig),
      exchange: chosenExchange,
      merchant_pub: proposal.contractTerms.merchant_pub,
      order_id: proposal.contractTerms.order_id,
    };
    const t: PurchaseRecord = {
      contractTerms: proposal.contractTerms,
      contractTermsHash: proposal.contractTermsHash,
      finished: false,
      merchantSig: proposal.merchantSig,
      payReq,
      refundsDone: {},
      refundsPending: {},
      timestamp: (new Date()).getTime(),
      timestamp_refund: 0,
    };

    await this.q()
              .put(Stores.purchases, t)
              .putAll(Stores.coins, payCoinInfo.map((pci) => pci.updatedCoin))
              .finish();

    this.notifier.notify();
  }


  /**
   * Save a proposal in the database and return an id for it to
   * retrieve it later.
   */
  async saveProposal(proposal: ProposalRecord): Promise<number> {
    const id = await this.q().putWithResult(Stores.proposals, proposal);
    this.notifier.notify();
    if (typeof id !== "number") {
      throw Error("db schema wrong");
    }
    return id;
  }


  /**
   * Add a contract to the wallet and sign coins,
   * but do not send them yet.
   */
  async confirmPay(proposalId: number): Promise<ConfirmPayResult> {
    console.log("executing confirmPay");
    const proposal: ProposalRecord|undefined = await this.q().get(Stores.proposals, proposalId);

    if (!proposal) {
      throw Error(`proposal with id ${proposalId} not found`);
    }

    const purchase = await this.q().get(Stores.purchases, proposal.contractTermsHash);

    if (purchase) {
      // Already payed ...
      return "paid";
    }

    const res = await this.getCoinsForPayment({
      allowedAuditors: proposal.contractTerms.auditors,
      allowedExchanges: proposal.contractTerms.exchanges,
      depositFeeLimit: proposal.contractTerms.max_fee,
      paymentAmount: proposal.contractTerms.amount,
      wireFeeAmortization: proposal.contractTerms.wire_fee_amortization || 1,
      wireFeeLimit: proposal.contractTerms.max_wire_fee || Amounts.getZero(proposal.contractTerms.amount.currency),
      wireFeeTime: getTalerStampSec(proposal.contractTerms.timestamp) || 0,
      wireMethod: proposal.contractTerms.wire_method,
    });

    console.log("max_fee", proposal.contractTerms.max_fee);
    console.log("coin selection result", res);

    if (!res) {
      console.log("not confirming payment, insufficient coins");
      return "insufficient-balance";
    }
    const {exchangeUrl, cds} = res;

    const ds = await this.cryptoApi.signDeposit(proposal.contractTerms, cds);
    await this.recordConfirmPay(proposal, ds, exchangeUrl);
    return "paid";
  }


  /**
   * Check if payment for an offer is possible, or if the offer has already
   * been payed for.
   */
  async checkPay(proposalId: number): Promise<CheckPayResult> {
    const proposal = await this.q().get(Stores.proposals, proposalId);

    if (!proposal) {
      throw Error(`proposal with id ${proposalId} not found`);
    }

    // First check if we already payed for it.
    const purchase = await this.q().get(Stores.purchases, proposal.contractTermsHash);
    if (purchase) {
      return { status: "paid" };
    }

    // If not already payed, check if we could pay for it.
    const res = await this.getCoinsForPayment({
      allowedAuditors: proposal.contractTerms.auditors,
      allowedExchanges: proposal.contractTerms.exchanges,
      depositFeeLimit: proposal.contractTerms.max_fee,
      paymentAmount: proposal.contractTerms.amount,
      wireFeeAmortization: proposal.contractTerms.wire_fee_amortization || 1,
      wireFeeLimit: proposal.contractTerms.max_wire_fee || Amounts.getZero(proposal.contractTerms.amount.currency),
      wireFeeTime: getTalerStampSec(proposal.contractTerms.timestamp) || 0,
      wireMethod: proposal.contractTerms.wire_method,
    });

    if (!res) {
      console.log("not confirming payment, insufficient coins");
      return { status: "insufficient-balance" };
    }
    return { status: "payment-possible", coinSelection: res };
  }


  /**
   * Retrieve information required to pay for a contract, where the
   * contract is identified via the fulfillment url.
   */
  async queryPayment(url: string): Promise<QueryPaymentResult> {
    console.log("query for payment", url);

    const t = await this.q().getIndexed(Stores.purchases.fulfillmentUrlIndex, url);

    if (!t) {
      console.log("query for payment failed");
      return {
        found: false,
      };
    }
    console.log("query for payment succeeded:", t);
    return {
      contractTerms: t.contractTerms,
      contractTermsHash: t.contractTermsHash,
      found: true,
      payReq: t.payReq,
    };
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
      const reserve = await this.updateReserve(reserveRecord.reserve_pub);
      await this.depleteReserve(reserve);
    } catch (e) {
      // random, exponential backoff truncated at 3 minutes
      const nextDelay = Math.min(2 * retryDelayMs + retryDelayMs * Math.random(), 3000 * 60);
      console.warn(`Failed to deplete reserve, trying again in ${retryDelayMs} ms`);
      this.timerGroup.after(retryDelayMs, () => this.processReserve(reserveRecord, nextDelay));
    } finally {
      this.stopOperation(opId);
    }
  }


  /**
   * Given a planchet, withdraw a coin from the exchange.
   */
  private async processPreCoin(preCoin: PreCoinRecord,
                               retryDelayMs = 200): Promise<void> {
    // Throttle concurrent executions of this function, so we don't withdraw too many coins at once.
    if (this.processPreCoinConcurrent >= 4 || this.processPreCoinThrottle[preCoin.exchangeBaseUrl]) {
      console.log("delaying processPreCoin");
      this.timerGroup.after(retryDelayMs,
                            () => this.processPreCoin(preCoin, Math.min(retryDelayMs * 2, 5 * 60 * 1000)));
      return;
    }
    console.log("executing processPreCoin", preCoin);
    this.processPreCoinConcurrent++;
    try {
      const exchange = await this.q().get(Stores.exchanges,
                                          preCoin.exchangeBaseUrl);
      if (!exchange) {
        console.error("db inconsistent: exchange for precoin not found");
        return;
      }
      const denom = await this.q().get(Stores.denominations,
                                       [preCoin.exchangeBaseUrl, preCoin.denomPub]);
      if (!denom) {
        console.error("db inconsistent: denom for precoin not found");
        return;
      }

      const coin = await this.withdrawExecute(preCoin);
      console.log("processPreCoin: got coin", coin);

      const mutateReserve = (r: ReserveRecord) => {

        console.log(`before committing coin: current ${amountToPretty(r.current_amount!)}, precoin: ${amountToPretty(
          r.precoin_amount)})}`);

        const x = Amounts.sub(r.precoin_amount, preCoin.coinValue, denom.feeWithdraw);
        if (x.saturated) {
          console.error("database inconsistent");
          throw AbortTransaction;
        }
        r.precoin_amount = x.amount;
        return r;
      };

      await this.q()
                .mutate(Stores.reserves, preCoin.reservePub, mutateReserve)
                .delete(Stores.precoins, coin.coinPub)
                .add(Stores.coins, coin)
                .finish();

      if (coin.status === CoinStatus.TainedByTip) {
        let tip = await this.q().getIndexed(Stores.tips.coinPubIndex, coin.coinPub);
        if (!tip) {
          throw Error(`inconsistent DB: tip for coin pub ${coin.coinPub} not found.`);
        }

        if (tip.accepted) {
          // Transactionall set coin to fresh.
          const mutateCoin = (c: CoinRecord) => {
            if (c.status === CoinStatus.TainedByTip) {
              c.status = CoinStatus.Fresh;
            }
            return c;
          }
          await this.q().mutate(Stores.coins, coin.coinPub, mutateCoin)
        }
      }

      this.notifier.notify();
    } catch (e) {
      console.error("Failed to withdraw coin from precoin, retrying in",
                    retryDelayMs,
                    "ms", e);
      // exponential backoff truncated at one minute
      const nextRetryDelayMs = Math.min(retryDelayMs * 2, 5 * 60 * 1000);
      this.timerGroup.after(retryDelayMs, () => this.processPreCoin(preCoin, nextRetryDelayMs));

      const currentThrottle = this.processPreCoinThrottle[preCoin.exchangeBaseUrl] || 0;
      this.processPreCoinThrottle[preCoin.exchangeBaseUrl] = currentThrottle + 1;
      this.timerGroup.after(retryDelayMs, () => {this.processPreCoinThrottle[preCoin.exchangeBaseUrl]--; });
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
    const keypair = await this.cryptoApi.createEddsaKeypair();
    const now = (new Date()).getTime();
    const canonExchange = canonicalizeBaseUrl(req.exchange);

    const reserveRecord: ReserveRecord = {
      created: now,
      current_amount: null,
      exchange_base_url: canonExchange,
      hasPayback: false,
      precoin_amount: Amounts.getZero(req.amount.currency),
      requested_amount: req.amount,
      reserve_priv: keypair.priv,
      reserve_pub: keypair.pub,
      senderWire: req.senderWire,
      timestamp_confirmed: 0,
      timestamp_depleted: 0,
    };

    const exchangeInfo = await this.updateExchangeFromUrl(req.exchange);
    const {isAudited, isTrusted} = await this.getExchangeTrust(exchangeInfo);
    let currencyRecord = await this.q().get(Stores.currencies, exchangeInfo.currency);
    if (!currencyRecord) {
      currencyRecord = {
        auditors: [],
        exchanges: [],
        fractionalDigits: 2,
        name: exchangeInfo.currency,
      };
    }

    if (!isAudited && !isTrusted) {
      currencyRecord.exchanges.push({baseUrl: req.exchange, exchangePub: exchangeInfo.masterPublicKey});
    }

    await this.q()
              .put(Stores.currencies, currencyRecord)
              .put(Stores.reserves, reserveRecord)
              .finish();

    const r: CreateReserveResponse = {
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
    const now = (new Date()).getTime();
    const reserve: ReserveRecord|undefined = await (
      this.q().get<ReserveRecord>(Stores.reserves,
                                  req.reservePub));
    if (!reserve) {
      console.error("Unable to confirm reserve, not found in DB");
      return;
    }
    console.log("reserve confirmed");
    reserve.timestamp_confirmed = now;
    await this.q()
              .put(Stores.reserves, reserve)
              .finish();
    this.notifier.notify();

    this.processReserve(reserve);
  }


  private async withdrawExecute(pc: PreCoinRecord): Promise<CoinRecord> {
    const wd: any = {};
    wd.denom_pub = pc.denomPub;
    wd.reserve_pub = pc.reservePub;
    wd.reserve_sig = pc.withdrawSig;
    wd.coin_ev = pc.coinEv;
    const reqUrl = (new URI("reserve/withdraw")).absoluteTo(pc.exchangeBaseUrl);
    const resp = await this.http.postJson(reqUrl.href(), wd);

    if (resp.status !== 200) {
      throw new RequestException({
        hint: "Withdrawal failed",
        status: resp.status,
      });
    }
    const r = JSON.parse(resp.responseText);
    const denomSig = await this.cryptoApi.rsaUnblind(r.ev_sig,
                                                     pc.blindingKey,
                                                     pc.denomPub);
    const coin: CoinRecord = {
      blindingKey: pc.blindingKey,
      coinPriv: pc.coinPriv,
      coinPub: pc.coinPub,
      currentAmount: pc.coinValue,
      denomPub: pc.denomPub,
      denomSig,
      exchangeBaseUrl: pc.exchangeBaseUrl,
      reservePub: pc.reservePub,
      status: CoinStatus.Fresh,
    };
    return coin;
  }


  /**
   * Withdraw coins from a reserve until it is empty.
   *
   * When finished, marks the reserve as depleted by setting
   * the depleted timestamp.
   */
  private async depleteReserve(reserve: ReserveRecord): Promise<void> {
    console.log("depleting reserve");
    if (!reserve.current_amount) {
      throw Error("can't withdraw when amount is unknown");
    }
    const withdrawAmount = reserve.current_amount;
    if (!withdrawAmount) {
      throw Error("can't withdraw when amount is unknown");
    }
    const denomsForWithdraw = await this.getVerifiedWithdrawDenomList(reserve.exchange_base_url, withdrawAmount);
    const smallestAmount = await this.getVerifiedSmallestWithdrawAmount(reserve.exchange_base_url);

    console.log(`withdrawing ${denomsForWithdraw.length} coins`);

    const ps = denomsForWithdraw.map(async(denom) => {
      function mutateReserve(r: ReserveRecord): ReserveRecord {
        const currentAmount = r.current_amount;
        if (!currentAmount) {
          throw Error("can't withdraw when amount is unknown");
        }
        r.precoin_amount = Amounts.add(r.precoin_amount,
                                       denom.value,
                                       denom.feeWithdraw).amount;
        const result = Amounts.sub(currentAmount,
                                 denom.value,
                                 denom.feeWithdraw);
        if (result.saturated) {
          console.error("can't create precoin, saturated");
          throw AbortTransaction;
        }
        r.current_amount = result.amount;

        // Reserve is depleted if the amount left is too small to withdraw
        if (Amounts.cmp(r.current_amount, smallestAmount) < 0) {
          r.timestamp_depleted = (new Date()).getTime();
        }

        console.log(`after creating precoin: current ${amountToPretty(r.current_amount)}, precoin: ${amountToPretty(
          r.precoin_amount)})}`);

        return r;
      }

      const preCoin = await this.cryptoApi
                              .createPreCoin(denom, reserve);
      await this.q()
                .put(Stores.precoins, preCoin)
                .mutate(Stores.reserves, reserve.reserve_pub, mutateReserve);
      await this.processPreCoin(preCoin);
    });

    await Promise.all(ps);
  }


  /**
   * Update the information about a reserve that is stored in the wallet
   * by quering the reserve's exchange.
   */
  private async updateReserve(reservePub: string): Promise<ReserveRecord> {
    const reserve = await this.q()
                            .get<ReserveRecord>(Stores.reserves, reservePub);
    if (!reserve) {
      throw Error("reserve not in db");
    }
    const reqUrl = new URI("reserve/status").absoluteTo(reserve.exchange_base_url);
    reqUrl.query({reserve_pub: reservePub});
    const resp = await this.http.get(reqUrl.href());
    if (resp.status !== 200) {
      throw Error();
    }
    const reserveInfo = JSON.parse(resp.responseText);
    if (!reserveInfo) {
      throw Error();
    }
    reserve.current_amount = reserveInfo.balance;
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
    const reqUrl = new URI("wire").absoluteTo(exchangeBaseUrl);
    const resp = await this.http.get(reqUrl.href());

    if (resp.status !== 200) {
      throw Error("/wire request failed");
    }

    const wiJson = JSON.parse(resp.responseText);
    if (!wiJson) {
      throw Error("/wire response malformed");
    }
    return wiJson;
  }

  async getPossibleDenoms(exchangeBaseUrl: string) {
    return (
      this.q().iterIndex(Stores.denominations.exchangeBaseUrlIndex,
                         exchangeBaseUrl)
          .filter((d) => d.status === DenominationStatus.Unverified || d.status === DenominationStatus.VerifiedGood)
          .toArray()
    );
  }


  /**
   * Compute the smallest withdrawable amount possible, based on verified denominations.
   *
   * Writes to the DB in order to record the result from verifying
   * denominations.
   */
  async getVerifiedSmallestWithdrawAmount(exchangeBaseUrl: string): Promise<AmountJson> {
    const exchange = await this.q().get(Stores.exchanges, exchangeBaseUrl);
    if (!exchange) {
      throw Error(`exchange ${exchangeBaseUrl} not found`);
    }

    const possibleDenoms = await (
      this.q().iterIndex(Stores.denominations.exchangeBaseUrlIndex,
                         exchange.baseUrl)
          .filter((d) => d.status === DenominationStatus.Unverified || d.status === DenominationStatus.VerifiedGood)
          .toArray()
    );
    possibleDenoms.sort((d1, d2) => {
      const a1 = Amounts.add(d1.feeWithdraw, d1.value).amount;
      const a2 = Amounts.add(d2.feeWithdraw, d2.value).amount;
      return Amounts.cmp(a1, a2);
    });

    for (const denom of possibleDenoms) {
      if (denom.status === DenominationStatus.VerifiedGood) {
        return Amounts.add(denom.feeWithdraw, denom.value).amount;
      }
      console.log(`verifying denom ${denom.denomPub.substr(0, 15)}`);
      const valid = await this.cryptoApi.isValidDenom(denom,
                                                      exchange.masterPublicKey);
      if (!valid) {
        denom.status = DenominationStatus.VerifiedBad;
      } else {
        denom.status = DenominationStatus.VerifiedGood;
      }
      await this.q().put(Stores.denominations, denom).finish();
      if (valid) {
        return Amounts.add(denom.feeWithdraw, denom.value).amount;
      }
    }
    return Amounts.getZero(exchange.currency);
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
          .filter((d) => d.status === DenominationStatus.Unverified || d.status === DenominationStatus.VerifiedGood)
          .toArray()
    );

    let allValid = false;
    let currentPossibleDenoms = possibleDenoms;

    let selectedDenoms: DenominationRecord[];

    do {
      allValid = true;
      const nextPossibleDenoms = [];
      selectedDenoms = getWithdrawDenomList(amount, possibleDenoms);
      for (const denom of selectedDenoms || []) {
        if (denom.status === DenominationStatus.Unverified) {
          console.log(`verifying denom ${denom.denomPub.substr(0, 15)}`);
          const valid = await this.cryptoApi.isValidDenom(denom,
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
    const currencyRecord = await this.q().get(Stores.currencies, exchangeInfo.currency);
    if (currencyRecord) {
      for (const trustedExchange of currencyRecord.exchanges) {
        if (trustedExchange.exchangePub === exchangeInfo.masterPublicKey) {
          isTrusted = true;
          break;
        }
      }
      for (const trustedAuditor of currencyRecord.auditors) {
        for (const exchangeAuditor of exchangeInfo.auditors) {
          if (trustedAuditor.auditorPub === exchangeAuditor.auditor_pub) {
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
    const exchangeInfo = await this.updateExchangeFromUrl(baseUrl);

    const selectedDenoms = await this.getVerifiedWithdrawDenomList(baseUrl,
                                                                 amount);
    let acc = Amounts.getZero(amount.currency);
    for (const d of selectedDenoms) {
      acc = Amounts.add(acc, d.feeWithdraw).amount;
    }
    const actualCoinCost = selectedDenoms
      .map((d: DenominationRecord) => Amounts.add(d.value,
                                                  d.feeWithdraw).amount)
      .reduce((a, b) => Amounts.add(a, b).amount);

    const wireInfo = await this.getWireInfo(baseUrl);

    const wireFees = await this.q().get(Stores.exchangeWireFees, baseUrl);
    if (!wireFees) {
      // should never happen unless DB is inconsistent
      throw Error(`no wire fees found for exchange ${baseUrl}`);
    }

    const {isTrusted, isAudited} = await this.getExchangeTrust(exchangeInfo);

    let earliestDepositExpiration = Infinity;
    for (const denom of selectedDenoms) {
      const expireDeposit = getTalerStampSec(denom.stampExpireDeposit)!;
      if (expireDeposit < earliestDepositExpiration) {
        earliestDepositExpiration = expireDeposit;
      }
    }

    const possibleDenoms = await (
      this.q().iterIndex(Stores.denominations.exchangeBaseUrlIndex, baseUrl)
          .filter((d) => d.isOffered)
          .toArray()
    ) || [];

    const trustedAuditorPubs = [];
    const currencyRecord = await this.q().get<CurrencyRecord>(Stores.currencies, amount.currency);
    if (currencyRecord) {
      trustedAuditorPubs.push(...currencyRecord.auditors.map((a) => a.auditorPub));
    }

    let versionMatch;
    if (exchangeInfo.protocolVersion) {
      versionMatch = LibtoolVersion.compare(WALLET_PROTOCOL_VERSION, exchangeInfo.protocolVersion);

      if (versionMatch && !versionMatch.compatible && versionMatch.currentCmp === -1) {
        console.log("wallet version might be outdated, checking for updates");
        chrome.runtime.requestUpdateCheck((status, details) => {
          console.log("update check status:", status);
        });
      }
    }


    const ret: ReserveCreationInfo = {
      earliestDepositExpiration,
      exchangeInfo,
      isAudited,
      isTrusted,
      numOfferedDenoms: possibleDenoms.length,
      overhead: Amounts.sub(amount, actualCoinCost).amount,
      selectedDenoms,
      trustedAuditorPubs,
      versionMatch,
      wireFees,
      wireInfo,
      withdrawFee: acc,
      exchangeVersion: exchangeInfo.protocolVersion || "unknown",
      walletVersion: WALLET_PROTOCOL_VERSION,
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
    const keysUrl = new URI("keys").absoluteTo(baseUrl);
    const wireUrl = new URI("wire").absoluteTo(baseUrl);
    const keysResp = await this.http.get(keysUrl.href());
    if (keysResp.status !== 200) {
      throw Error("/keys request failed");
    }
    const wireResp = await this.http.get(wireUrl.href());
    if (wireResp.status !== 200) {
      throw Error("/wire request failed");
    }
    const exchangeKeysJson = KeysJson.checked(JSON.parse(keysResp.responseText));
    const wireRespJson = JSON.parse(wireResp.responseText);
    if (typeof wireRespJson !== "object") {
      throw Error("/wire response is not an object");
    }
    console.log("exchange wire", wireRespJson);
    const wireMethodDetails: WireDetailJson[] = [];
    for (const methodName in wireRespJson) {
      wireMethodDetails.push(WireDetailJson.checked(wireRespJson[methodName]));
    }
    return this.updateExchangeFromJson(baseUrl, exchangeKeysJson, wireMethodDetails);
  }


  private async suspendCoins(exchangeInfo: ExchangeRecord): Promise<void> {
    const resultSuspendedCoins = await (
      this.q()
          .iterIndex(Stores.coins.exchangeBaseUrlIndex, exchangeInfo.baseUrl)
          .indexJoinLeft(Stores.denominations.exchangeBaseUrlIndex,
                         (e) => e.exchangeBaseUrl)
          .reduce((cd: JoinLeftResult<CoinRecord, DenominationRecord>,
                   suspendedCoins: CoinRecord[]) => {
            if ((!cd.right) || (!cd.right.isOffered)) {
              return Array.prototype.concat(suspendedCoins, [cd.left]);
            }
            return Array.prototype.concat(suspendedCoins);
          }, []));

    const q = this.q();
    resultSuspendedCoins.map((c) => {
      console.log("suspending coin", c);
      c.suspended = true;
      q.put(Stores.coins, c);
      this.notifier.notify();
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

    if (exchangeKeysJson.denoms.length === 0) {
      throw Error("exchange doesn't offer any denominations");
    }

    const r = await this.q().get<ExchangeRecord>(Stores.exchanges, baseUrl);

    let exchangeInfo: ExchangeRecord;

    if (!r) {
      exchangeInfo = {
        auditors: exchangeKeysJson.auditors,
        baseUrl,
        currency: exchangeKeysJson.denoms[0].value.currency,
        lastUpdateTime: updateTimeSec,
        masterPublicKey: exchangeKeysJson.master_public_key,
      };
      console.log("making fresh exchange");
    } else {
      if (updateTimeSec < r.lastUpdateTime) {
        console.log("outdated /keys, not updating");
        return r;
      }
      exchangeInfo = r;
      exchangeInfo.lastUpdateTime = updateTimeSec;
      console.log("updating old exchange");
    }

    const updatedExchangeInfo = await this.updateExchangeInfo(exchangeInfo,
                                                              exchangeKeysJson);
    await this.suspendCoins(updatedExchangeInfo);
    updatedExchangeInfo.protocolVersion = exchangeKeysJson.version;

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

    for (const detail of wireMethodDetails) {
      let latestFeeStamp = 0;
      const fees = oldWireFees.feesForType[detail.type] || [];
      oldWireFees.feesForType[detail.type] = fees;
      for (const oldFee of fees) {
        if (oldFee.endStamp > latestFeeStamp) {
          latestFeeStamp = oldFee.endStamp;
        }
      }
      for (const fee of detail.fees) {
        const start = getTalerStampSec(fee.start_date);
        if (start === null) {
          console.error("invalid start stamp in fee", fee);
          continue;
        }
        if (start < latestFeeStamp) {
          continue;
        }
        const end = getTalerStampSec(fee.end_date);
        if (end === null) {
          console.error("invalid end stamp in fee", fee);
          continue;
        }
        const wf: WireFee = {
          closingFee: fee.closing_fee,
          endStamp: end,
          sig: fee.sig,
          startStamp: start,
          wireFee: fee.wire_fee,
        };
        const valid: boolean = await this.cryptoApi.isValidWireFee(detail.type, wf, exchangeInfo.masterPublicKey);
        if (!valid) {
          console.error("fee signature invalid", fee);
          throw Error("fee signature invalid");
        }
        fees.push(wf);
      }
    }

    await this.q().put(Stores.exchangeWireFees, oldWireFees);

    if (exchangeKeysJson.payback) {
      for (const payback of exchangeKeysJson.payback) {
        const denom = await this.q().getIndexed(Stores.denominations.denomPubHashIndex, payback.h_denom_pub);
        if (!denom) {
          continue;
        }
        console.log(`cashing back denom`, denom);
        const coins = await this.q().iterIndex(Stores.coins.denomPubIndex, denom.denomPub).toArray();
        for (const coin of coins) {
          this.payback(coin.coinPub);
        }
      }
    }

    return updatedExchangeInfo;
  }


  private async updateExchangeInfo(exchangeInfo: ExchangeRecord,
                                   newKeys: KeysJson): Promise<ExchangeRecord> {
    if (exchangeInfo.masterPublicKey !== newKeys.master_public_key) {
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

    for (const d of newKeys.denoms) {
      const dr = await this.denominationRecordFromKeys(exchangeInfo.baseUrl, d);
      if (!(d.denom_pub in existingDenoms)) {
        newAndUnseenDenoms[dr.denomPub] = dr;
      }
      newDenoms[dr.denomPub] = dr;
    }

    for (const oldDenomPub in existingDenoms) {
      if (!(oldDenomPub in newDenoms)) {
        const d = existingDenoms[oldDenomPub];
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
   * Get detailed balance information, sliced by exchange and by currency.
   */
  async getBalances(): Promise<WalletBalance> {
    /**
     * Add amount to a balance field, both for
     * the slicing by exchange and currency.
     */
    function addTo(balance: WalletBalance,
                   field: keyof WalletBalanceEntry,
                   amount: AmountJson,
                   exchange: string): void {
      const z = Amounts.getZero(amount.currency);
      const balanceIdentity = {available: z, paybackAmount: z, pendingIncoming: z, pendingPayment: z};
      let entryCurr = balance.byCurrency[amount.currency];
      if (!entryCurr) {
        balance.byCurrency[amount.currency] = entryCurr = { ...balanceIdentity };
      }
      let entryEx = balance.byExchange[exchange];
      if (!entryEx) {
        balance.byExchange[exchange] = entryEx = { ...balanceIdentity };
      }
      entryCurr[field] = Amounts.add(entryCurr[field], amount).amount;
      entryEx[field] = Amounts.add(entryEx[field], amount).amount;
    }

    function collectBalances(c: CoinRecord, balance: WalletBalance) {
      if (c.suspended) {
        return balance;
      }
      if (c.status === CoinStatus.Fresh) {
        addTo(balance, "available", c.currentAmount, c.exchangeBaseUrl);
        return balance;
      }
      if (c.status === CoinStatus.Dirty) {
        addTo(balance, "pendingIncoming", c.currentAmount, c.exchangeBaseUrl);
        return balance;
      }
      return balance;
    }

    function collectPendingWithdraw(r: ReserveRecord, balance: WalletBalance) {
      if (!r.timestamp_confirmed) {
        return balance;
      }
      let amount = r.current_amount;
      if (!amount) {
        amount = r.requested_amount;
      }
      amount = Amounts.add(amount, r.precoin_amount).amount;
      if (Amounts.cmp(smallestWithdraw[r.exchange_base_url], amount) < 0) {
        addTo(balance, "pendingIncoming", amount, r.exchange_base_url);
      }
      return balance;
    }

    function collectPaybacks(r: ReserveRecord, balance: WalletBalance) {
      if (!r.hasPayback) {
        return balance;
      }
      if (Amounts.cmp(smallestWithdraw[r.exchange_base_url], r.current_amount!) < 0) {
        addTo(balance, "paybackAmount", r.current_amount!, r.exchange_base_url);
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
      addTo(balance, "pendingIncoming", r.valueOutput, r.exchangeBaseUrl);

      return balance;
    }

    function collectPayments(t: PurchaseRecord, balance: WalletBalance) {
      if (t.finished) {
        return balance;
      }
      addTo(balance, "pendingIncoming", t.contractTerms.amount, t.payReq.exchange);
      return balance;
    }

    function collectSmallestWithdraw(e: JoinResult<ExchangeRecord, DenominationRecord>,
                                     sw: any) {
      let min = sw[e.left.baseUrl];
      const v = Amounts.add(e.right.value, e.right.feeWithdraw).amount;
      if (!min) {
        min = v;
      } else if (Amounts.cmp(v, min) < 0) {
        min = v;
      }
      sw[e.left.baseUrl] = min;
      return sw;
    }

    const balanceStore = {
      byCurrency: {},
      byExchange: {},
    };
    // Mapping from exchange pub to smallest
    // possible amount we can withdraw
    let smallestWithdraw: {[baseUrl: string]: AmountJson} = {};

    smallestWithdraw = await (this.q()
                                  .iter(Stores.exchanges)
                                  .indexJoin(Stores.denominations.exchangeBaseUrlIndex,
                                             (x) => x.baseUrl)
                                  .reduce(collectSmallestWithdraw, {}));

    const tx = this.q();
    tx.iter(Stores.coins)
      .reduce(collectBalances, balanceStore);
    tx.iter(Stores.refresh)
      .reduce(collectPendingRefresh, balanceStore);
    tx.iter(Stores.reserves)
      .reduce(collectPendingWithdraw, balanceStore);
    tx.iter(Stores.reserves)
      .reduce(collectPaybacks, balanceStore);
    tx.iter(Stores.purchases)
      .reduce(collectPayments, balanceStore);
    await tx.finish();
    return balanceStore;
  }


  async createRefreshSession(oldCoinPub: string): Promise<RefreshSessionRecord|undefined> {
    const coin = await this.q().get<CoinRecord>(Stores.coins, oldCoinPub);

    if (!coin) {
      throw Error("coin not found");
    }

    if (coin.currentAmount.value === 0 && coin.currentAmount.fraction === 0) {
      return undefined;
    }

    const exchange = await this.updateExchangeFromUrl(coin.exchangeBaseUrl);

    if (!exchange) {
      throw Error("db inconsistent");
    }

    const oldDenom = await this.q().get(Stores.denominations,
                                      [exchange.baseUrl, coin.denomPub]);

    if (!oldDenom) {
      throw Error("db inconsistent");
    }

    const availableDenoms: DenominationRecord[] = await (
      this.q()
          .iterIndex(Stores.denominations.exchangeBaseUrlIndex,
                     exchange.baseUrl)
          .toArray()
    );

    const availableAmount = Amounts.sub(coin.currentAmount,
                                      oldDenom.feeRefresh).amount;

    const newCoinDenoms = getWithdrawDenomList(availableAmount,
                                             availableDenoms);

    console.log("refreshing coin", coin);
    console.log("refreshing into", newCoinDenoms);

    if (newCoinDenoms.length === 0) {
      console.log(`not refreshing, available amount ${amountToPretty(availableAmount)} too small`);
      coin.status = CoinStatus.Useless;
      await this.q().put(Stores.coins, coin);
      this.notifier.notify();
      return undefined;
    }


    const refreshSession: RefreshSessionRecord = await (
      this.cryptoApi.createRefreshSession(exchange.baseUrl,
                                          3,
                                          coin,
                                          newCoinDenoms,
                                          oldDenom.feeRefresh));

    function mutateCoin(c: CoinRecord): CoinRecord {
      const r = Amounts.sub(c.currentAmount,
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
    const query = this.q();
    query.put(Stores.refresh, refreshSession, "refreshKey")
         .mutate(Stores.coins, coin.coinPub, mutateCoin);
    await query.finish();
    this.notifier.notify();

    const key = query.key("refreshKey");
    if (!key || typeof key !== "number") {
      throw Error("insert failed");
    }

    refreshSession.id = key;

    return refreshSession;
  }


  async refresh(oldCoinPub: string): Promise<void> {

    const oldRefreshSessions = await this.q().iter(Stores.refresh).toArray();
    for (const session of oldRefreshSessions) {
      console.log("got old session for", oldCoinPub, session);
      this.continueRefreshSession(session);
    }
    const coin = await this.q().get(Stores.coins, oldCoinPub);
    if (!coin) {
      console.warn("can't refresh, coin not in database");
      return;
    }
    if (coin.status === CoinStatus.Useless || coin.status === CoinStatus.Fresh) {
      return;
    }
    const refreshSession = await this.createRefreshSession(oldCoinPub);
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
      await this.refreshMelt(refreshSession);
      const r = await this.q().get<RefreshSessionRecord>(Stores.refresh, refreshSession.id);
      if (!r) {
        throw Error("refresh session does not exist anymore");
      }
      refreshSession = r;
    }

    await this.refreshReveal(refreshSession);
  }


  async refreshMelt(refreshSession: RefreshSessionRecord): Promise<void> {
    if (refreshSession.norevealIndex !== undefined) {
      console.error("won't melt again");
      return;
    }

    const coin = await this.q().get<CoinRecord>(Stores.coins,
                                              refreshSession.meltCoinPub);
    if (!coin) {
      console.error("can't melt coin, it does not exist");
      return;
    }

    const reqUrl = new URI("refresh/melt").absoluteTo(refreshSession.exchangeBaseUrl);
    const meltCoin = {
      coin_pub: coin.coinPub,
      confirm_sig: refreshSession.confirmSig,
      denom_pub: coin.denomPub,
      denom_sig: coin.denomSig,
      value_with_fee: refreshSession.valueWithFee,
    };
    const coinEvs = refreshSession.preCoinsForGammas.map((x) => x.map((y) => y.coinEv));
    const req = {
      coin_evs: coinEvs,
      melt_coin: meltCoin,
      new_denoms: refreshSession.newDenoms,
      transfer_pubs: refreshSession.transferPubs,
    };
    console.log("melt request:", req);
    const resp = await this.http.postJson(reqUrl.href(), req);

    console.log("melt request:", req);
    console.log("melt response:", resp.responseText);

    if (resp.status !== 200) {
      console.error(resp.responseText);
      throw Error("refresh failed");
    }

    const respJson = JSON.parse(resp.responseText);

    if (!respJson) {
      throw Error("exchange responded with garbage");
    }

    const norevealIndex = respJson.noreveal_index;

    if (typeof norevealIndex !== "number") {
      throw Error("invalid response");
    }

    refreshSession.norevealIndex = norevealIndex;

    await this.q().put(Stores.refresh, refreshSession).finish();
    this.notifier.notify();
  }


  async refreshReveal(refreshSession: RefreshSessionRecord): Promise<void> {
    const norevealIndex = refreshSession.norevealIndex;
    if (norevealIndex === undefined) {
      throw Error("can't reveal without melting first");
    }
    const privs = Array.from(refreshSession.transferPrivs);
    privs.splice(norevealIndex, 1);

    const req = {
      session_hash: refreshSession.hash,
      transfer_privs: privs,
    };

    const reqUrl = new URI("refresh/reveal") .absoluteTo(refreshSession.exchangeBaseUrl);
    console.log("reveal request:", req);
    const resp = await this.http.postJson(reqUrl.href(), req);

    console.log("session:", refreshSession);
    console.log("reveal response:", resp);

    if (resp.status !== 200) {
      console.log("error:  /refresh/reveal returned status " + resp.status);
      return;
    }

    const respJson = JSON.parse(resp.responseText);

    if (!respJson.ev_sigs || !Array.isArray(respJson.ev_sigs)) {
      console.log("/refresh/reveal did not contain ev_sigs");
    }

    const exchange = await this.q().get<ExchangeRecord>(Stores.exchanges,
                                                      refreshSession.exchangeBaseUrl);
    if (!exchange) {
      console.error(`exchange ${refreshSession.exchangeBaseUrl} not found`);
      return;
    }

    const coins: CoinRecord[] = [];

    for (let i = 0; i < respJson.ev_sigs.length; i++) {
      const denom = await (
        this.q()
            .get(Stores.denominations,
                 [
                   refreshSession.exchangeBaseUrl,
                   refreshSession.newDenoms[i],
                 ]));
      if (!denom) {
        console.error("denom not found");
        continue;
      }
      const pc = refreshSession.preCoinsForGammas[refreshSession.norevealIndex!][i];
      const denomSig = await this.cryptoApi.rsaUnblind(respJson.ev_sigs[i].ev_sig,
                                                     pc.blindingKey,
                                                     denom.denomPub);
      const coin: CoinRecord = {
        blindingKey: pc.blindingKey,
        coinPriv: pc.privateKey,
        coinPub: pc.publicKey,
        currentAmount: denom.value,
        denomPub: denom.denomPub,
        denomSig,
        exchangeBaseUrl: refreshSession.exchangeBaseUrl,
        reservePub: undefined,
        status: CoinStatus.Fresh,
      };

      coins.push(coin);
    }

    refreshSession.finished = true;

    await this.q()
              .putAll(Stores.coins, coins)
              .put(Stores.refresh, refreshSession)
              .finish();
    this.notifier.notify();
  }


  /**
   * Retrive the full event history for this wallet.
   */
  async getHistory(): Promise<{history: HistoryRecord[]}> {
    const history: HistoryRecord[] = [];

    // FIXME: do pagination instead of generating the full history

    const proposals = await this.q().iter<ProposalRecord>(Stores.proposals).toArray();
    for (const p of proposals) {
      history.push({
        detail: {
          contractTermsHash: p.contractTermsHash,
          merchantName: p.contractTerms.merchant.name,
        },
        timestamp: p.timestamp,
        type: "offer-contract",
      });
    }

    const purchases = await this.q().iter<PurchaseRecord>(Stores.purchases).toArray();
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
      });
      if (p.timestamp_refund) {
        const amountsPending = Object.keys(p.refundsPending).map((x) => p.refundsPending[x].refund_amount);
        const amountsDone = Object.keys(p.refundsDone).map((x) => p.refundsDone[x].refund_amount);
        const amounts: AmountJson[] = amountsPending.concat(amountsDone);
        const amount = Amounts.add(Amounts.getZero(p.contractTerms.amount.currency), ...amounts).amount;

        history.push({
          detail: {
            contractTermsHash: p.contractTermsHash,
            fulfillmentUrl: p.contractTerms.fulfillment_url,
            merchantName: p.contractTerms.merchant.name,
            refundAmount: amount,
          },
          timestamp: p.timestamp_refund,
          type: "refund",
        });
      }
    }

    const reserves: ReserveRecord[] = await this.q().iter<ReserveRecord>(Stores.reserves).toArray();
    for (const r of reserves) {
      history.push({
        detail: {
          exchangeBaseUrl: r.exchange_base_url,
          requestedAmount: r.requested_amount,
          reservePub: r.reserve_pub,
        },
        timestamp: r.created,
        type: "create-reserve",
      });
      if (r.timestamp_depleted) {
        history.push({
          detail: {
            exchangeBaseUrl: r.exchange_base_url,
            requestedAmount: r.requested_amount,
            reservePub: r.reserve_pub,
          },
          timestamp: r.timestamp_depleted,
          type: "depleted-reserve",
        });
      }
    }

    history.sort((h1, h2) => Math.sign(h1.timestamp - h2.timestamp));

    return {history};
  }

  async getDenoms(exchangeUrl: string): Promise<DenominationRecord[]> {
    const denoms = await this.q().iterIndex(Stores.denominations.exchangeBaseUrlIndex, exchangeUrl).toArray();
    return denoms;
  }

  async getProposal(proposalId: number): Promise<ProposalRecord|undefined> {
    const proposal = await this.q().get(Stores.proposals, proposalId);
    return proposal;
  }

  async getExchanges(): Promise<ExchangeRecord[]> {
    return this.q()
               .iter<ExchangeRecord>(Stores.exchanges)
               .toArray();
  }

  async getCurrencies(): Promise<CurrencyRecord[]> {
    return this.q()
               .iter<CurrencyRecord>(Stores.currencies)
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

  async hashContract(contract: ContractTerms): Promise<string> {
    return this.cryptoApi.hashString(canonicalJson(contract));
  }


  /**
   * Generate a nonce in form of an EdDSA public key.
   * Store the private key in our DB, so we can prove ownership.
   */
  async generateNonce(): Promise<string> {
    const {priv, pub} = await this.cryptoApi.createEddsaKeypair();
    await this.q()
              .put(Stores.nonces, {priv, pub})
              .finish();
    return pub;
  }

  async getCurrencyRecord(currency: string): Promise<CurrencyRecord|undefined> {
    return this.q().get(Stores.currencies, currency);
  }


  async paymentSucceeded(contractTermsHash: string, merchantSig: string): Promise<any> {
    const doPaymentSucceeded = async() => {
      const t = await this.q().get<PurchaseRecord>(Stores.purchases,
                                                    contractTermsHash);
      if (!t) {
        console.error("contract not found");
        return;
      }
      const merchantPub = t.contractTerms.merchant_pub;
      const valid = this.cryptoApi.isValidPaymentSignature(merchantSig, contractTermsHash, merchantPub);
      if (!valid) {
        console.error("merchant payment signature invalid");
        // FIXME: properly display error
        return;
      }
      t.finished = true;
      const modifiedCoins: CoinRecord[] = [];
      for (const pc of t.payReq.coins) {
        const c = await this.q().get<CoinRecord>(Stores.coins, pc.coin_pub);
        if (!c) {
          console.error("coin not found");
          return;
        }
        c.status = CoinStatus.Dirty;
        modifiedCoins.push(c);
      }

      await this.q()
                .putAll(Stores.coins, modifiedCoins)
                .put(Stores.purchases, t)
                .finish();
      for (const c of t.payReq.coins) {
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
    const reservePub = coin.reservePub;
    if (!reservePub) {
      throw Error(`Can't request payback for a refreshed coin`);
    }
    const reserve = await this.q().get(Stores.reserves, reservePub);
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
    this.notifier.notify();

    const paybackRequest = await this.cryptoApi.createPaybackRequest(coin);
    const reqUrl = new URI("payback").absoluteTo(coin.exchangeBaseUrl);
    const resp = await this.http.postJson(reqUrl.href(), paybackRequest);
    if (resp.status !== 200) {
      throw Error();
    }
    const paybackConfirmation = PaybackConfirmation.checked(JSON.parse(resp.responseText));
    if (paybackConfirmation.reserve_pub !== coin.reservePub) {
      throw Error(`Coin's reserve doesn't match reserve on payback`);
    }
    coin = await this.q().get(Stores.coins, coinPub);
    if (!coin) {
      throw Error(`Coin ${coinPub} not found, can't confirm payback`);
    }
    coin.status = CoinStatus.PaybackDone;
    await this.q().put(Stores.coins, coin);
    this.notifier.notify();
    await this.updateReserve(reservePub!);
  }


  async denominationRecordFromKeys(exchangeBaseUrl: string, denomIn: Denomination): Promise<DenominationRecord> {
    const denomPubHash = await this.cryptoApi.hashDenomPub(denomIn.denom_pub);
    const d: DenominationRecord = {
      denomPub: denomIn.denom_pub,
      denomPubHash,
      exchangeBaseUrl,
      feeDeposit: denomIn.fee_deposit,
      feeRefresh: denomIn.fee_refresh,
      feeRefund: denomIn.fee_refund,
      feeWithdraw: denomIn.fee_withdraw,
      isOffered: true,
      masterSig: denomIn.master_sig,
      stampExpireDeposit: denomIn.stamp_expire_deposit,
      stampExpireLegal: denomIn.stamp_expire_legal,
      stampExpireWithdraw: denomIn.stamp_expire_withdraw,
      stampStart: denomIn.stamp_start,
      status: DenominationStatus.Unverified,
      value: denomIn.value,
    };
    return d;
  }

  async withdrawPaybackReserve(reservePub: string): Promise<void> {
    const reserve = await this.q().get(Stores.reserves, reservePub);
    if (!reserve) {
      throw Error(`Reserve ${reservePub} does not exist`);
    }
    reserve.hasPayback = false;
    await this.q().put(Stores.reserves, reserve);
    this.depleteReserve(reserve);
  }

  async getPaybackReserves(): Promise<ReserveRecord[]> {
    return await this.q().iter(Stores.reserves).filter((r) => r.hasPayback).toArray();
  }

  /**
   * Stop ongoing processing.
   */
  stop() {
    this.timerGroup.stopCurrentAndFutureTimers();
  }

  async getSenderWireInfos(): Promise<SenderWireInfos> {
    const m: { [url: string]: Set<string> } = {};
    await this.q().iter(Stores.exchangeWireFees).map((x) => {
      const s = m[x.exchangeBaseUrl] = m[x.exchangeBaseUrl] || new Set();
      Object.keys(x.feesForType).map((k) => s.add(k));
    }).run();
    console.log(m);
    const exchangeWireTypes: { [url: string]: string[] } = {};
    Object.keys(m).map((e) => { exchangeWireTypes[e] = Array.from(m[e]); });

    const senderWiresSet = new Set();
    await this.q().iter(Stores.reserves).map((x) => {
      if (x.senderWire) {
        senderWiresSet.add(canonicalJson(x.senderWire));
      }
    }).run();
    const senderWires = Array.from(senderWiresSet).map((x) => JSON.parse(x));

    return {
      exchangeWireTypes,
      senderWires,
    };
  }

  /**
   * Trigger paying coins back into the user's account.
   */
  async returnCoins(req: ReturnCoinsRequest): Promise<void> {
    console.log("got returnCoins request", req);
    const wireType = (req.senderWire as any).type;
    console.log("wireType", wireType);
    if (!wireType || typeof wireType !== "string") {
      console.error(`wire type must be a non-empty string, not ${wireType}`);
      return;
    }
    const stampSecNow = Math.floor((new Date()).getTime() / 1000);
    const exchange = await this.q().get(Stores.exchanges, req.exchange);
    if (!exchange) {
      console.error(`Exchange ${req.exchange} not known to the wallet`);
      return;
    }
    console.log("selecting coins for return:", req);
    const cds = await this.getCoinsForReturn(req.exchange, req.amount);
    console.log(cds);

    if (!cds) {
      throw Error("coin return impossible, can't select coins");
    }

    const { priv, pub } = await this.cryptoApi.createEddsaKeypair();

    const wireHash = await this.cryptoApi.hashString(canonicalJson(req.senderWire));

    const contractTerms: ContractTerms = {
      H_wire: wireHash,
      amount: req.amount,
      auditors: [],
      exchanges: [ { master_pub: exchange.masterPublicKey, url: exchange.baseUrl } ],
      extra: {},
      fulfillment_url: "",
      locations: [],
      max_fee: req.amount,
      merchant: {},
      merchant_pub: pub,
      order_id: "none",
      pay_deadline: `/Date(${stampSecNow + 60 * 5})/`,
      pay_url: "",
      products: [],
      refund_deadline: `/Date(${stampSecNow + 60 * 5})/`,
      timestamp: `/Date(${stampSecNow})/`,
      wire_method: wireType,
    };

    const contractTermsHash = await this.cryptoApi.hashString(canonicalJson(contractTerms));

    const payCoinInfo = await this.cryptoApi.signDeposit(contractTerms, cds);

    console.log("pci", payCoinInfo);

    const coins = payCoinInfo.map((pci) => ({ coinPaySig: pci.sig }));

    const coinsReturnRecord: CoinsReturnRecord = {
      coins,
      contractTerms,
      contractTermsHash,
      exchange: exchange.baseUrl,
      merchantPriv: priv,
      wire: req.senderWire,
    };

    await this.q()
              .put(Stores.coinsReturns, coinsReturnRecord)
              .putAll(Stores.coins, payCoinInfo.map((pci) => pci.updatedCoin))
              .finish();
    this.notifier.notify();

    this.depositReturnedCoins(coinsReturnRecord);
  }

  async depositReturnedCoins(coinsReturnRecord: CoinsReturnRecord): Promise<void> {
    for (const c of coinsReturnRecord.coins) {
      if (c.depositedSig) {
        continue;
      }
      const req = {
        H_wire: coinsReturnRecord.contractTerms.H_wire,
        coin_pub: c.coinPaySig.coin_pub,
        coin_sig: c.coinPaySig.coin_sig,
        denom_pub: c.coinPaySig.denom_pub,
        f: c.coinPaySig.f,
        h_contract_terms: coinsReturnRecord.contractTermsHash,
        merchant_pub: coinsReturnRecord.contractTerms.merchant_pub,
        pay_deadline: coinsReturnRecord.contractTerms.pay_deadline,
        refund_deadline: coinsReturnRecord.contractTerms.refund_deadline,
        timestamp: coinsReturnRecord.contractTerms.timestamp,
        ub_sig: c.coinPaySig.ub_sig,
        wire: coinsReturnRecord.wire,
        wire_transfer_deadline: coinsReturnRecord.contractTerms.pay_deadline,
      };
      console.log("req", req);
      const reqUrl = (new URI("deposit")).absoluteTo(coinsReturnRecord.exchange);
      const resp = await this.http.postJson(reqUrl.href(), req);
      if (resp.status !== 200) {
        console.error("deposit failed due to status code", resp);
        continue;
      }
      const respJson = JSON.parse(resp.responseText);
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
      const currentCrr = await this.q().get(Stores.coinsReturns, coinsReturnRecord.contractTermsHash);
      if (!currentCrr) {
        console.error("database inconsistent");
        continue;
      }
      for (const nc of currentCrr.coins) {
        if (nc.coinPaySig.coin_pub === c.coinPaySig.coin_pub) {
          nc.depositedSig = respJson.sig;
        }
      }
      await this.q().put(Stores.coinsReturns, currentCrr);
      this.notifier.notify();
    }
  }

  async acceptRefund(refundPermissions: RefundPermission[]): Promise<void> {
    if (!refundPermissions.length) {
      console.warn("got empty refund list");
      return;
    }
    const hc = refundPermissions[0].h_contract_terms;
    if (!hc) {
      throw Error("h_contract_terms missing in refund permission");
    }
    const m = refundPermissions[0].merchant_pub;
    if (!hc) {
      throw Error("merchant_pub missing in refund permission");
    }
    for (const perm of refundPermissions) {
      if (perm.h_contract_terms !== hc) {
        throw Error("h_contract_terms different in refund permission");
      }
      if (perm.merchant_pub !== m) {
        throw Error("merchant_pub different in refund permission");
      }
    }

    /**
     * Add refund to purchase if not already added.
     */
    function f(t: PurchaseRecord|undefined): PurchaseRecord|undefined {
      if (!t) {
        console.error("purchase not found, not adding refunds");
        return;
      }

      t.timestamp_refund = (new Date()).getTime();

      for (const perm of refundPermissions) {
        if (!t.refundsPending[perm.merchant_sig] && !t.refundsDone[perm.merchant_sig]) {
          t.refundsPending[perm.merchant_sig] = perm;
        }
      }
      return t;
    }

    // Add the refund permissions to the purchase within a DB transaction
    await this.q().mutate(Stores.purchases, hc, f).finish();
    this.notifier.notify();

    // Start submitting it but don't wait for it here.
    this.submitRefunds(hc);
  }

  async submitRefunds(contractTermsHash: string): Promise<void> {
    const purchase = await this.q().get(Stores.purchases, contractTermsHash);
    if (!purchase) {
      console.error("not submitting refunds, contract terms not found:", contractTermsHash);
      return;
    }
    const pendingKeys = Object.keys(purchase.refundsPending);
    if (pendingKeys.length === 0) {
      return;
    }
    for (const pk of pendingKeys) {
      const perm = purchase.refundsPending[pk];
      console.log("sending refund permission", perm);
      const reqUrl = (new URI("refund")).absoluteTo(purchase.payReq.exchange);
      const resp = await this.http.postJson(reqUrl.href(), perm);
      if (resp.status !== 200) {
        console.error("refund failed", resp);
        continue;
      }

      // Transactionally mark successful refunds as done
      const transformPurchase = (t: PurchaseRecord|undefined): PurchaseRecord|undefined => {
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
      const transformCoin = (c: CoinRecord|undefined): CoinRecord|undefined => {
        if (!c) {
          console.warn("coin not found, can't apply refund");
          return;
        }
        c.status = CoinStatus.Dirty;
        c.currentAmount = Amounts.add(c.currentAmount, perm.refund_amount).amount;
        c.currentAmount = Amounts.sub(c.currentAmount, perm.refund_fee).amount;

        return c;
      };


      await this.q()
                .mutate(Stores.purchases, contractTermsHash, transformPurchase)
                .mutate(Stores.coins, perm.coin_pub, transformCoin)
                .finish();
      this.refresh(perm.coin_pub);
    }

    this.notifier.notify();
  }

  async getPurchase(contractTermsHash: string): Promise<PurchaseRecord|undefined> {
    return this.q().get(Stores.purchases, contractTermsHash);
  }

  async getFullRefundFees(refundPermissions: RefundPermission[]): Promise<AmountJson> {
    if (refundPermissions.length === 0) {
      throw Error("no refunds given");
    }
    const coin0 = await this.q().get(Stores.coins, refundPermissions[0].coin_pub);
    if (!coin0) {
      throw Error("coin not found");
    }
    let feeAcc = Amounts.getZero(refundPermissions[0].refund_amount.currency);

    const denoms = await this.q().iterIndex(Stores.denominations.exchangeBaseUrlIndex, coin0.exchangeBaseUrl).toArray();
    for (const rp of refundPermissions) {
      const coin = await this.q().get(Stores.coins, rp.coin_pub);
      if (!coin) {
        throw Error("coin not found");
      }
      const denom = await this.q().get(Stores.denominations, [coin0.exchangeBaseUrl, coin.denomPub]);
      if (!denom) {
        throw Error(`denom not found (${coin.denomPub})`);
      }
      // FIXME:  this assumes that the refund already happened.
      // When it hasn't, the refresh cost is inaccurate.  To fix this,
      // we need introduce a flag to tell if a coin was refunded or
      // refreshed normally (and what about incremental refunds?)
      const refreshCost = getTotalRefreshCost(denoms, denom, Amounts.sub(rp.refund_amount, rp.refund_fee).amount);
      feeAcc = Amounts.add(feeAcc, refreshCost, rp.refund_fee).amount;
    }
    return feeAcc;
  }

  /**
   * Get planchets for a tip.  Creates new planchets if they don't exist already
   * for this tip.  The tip is uniquely identified by the merchant's domain and the tip id.
   */
  async getTipPlanchets(merchantDomain: string, tipId: string, amount: AmountJson, deadline: number, exchangeUrl: string): Promise<TipPlanchetDetail[]> {
    let tipRecord = await this.q().get(Stores.tips, [tipId, merchantDomain]);
    if (!tipRecord) {
      await this.updateExchangeFromUrl(exchangeUrl);
      const denomsForWithdraw = await this.getVerifiedWithdrawDenomList(exchangeUrl, amount);
      const planchets = await Promise.all(denomsForWithdraw.map(d => this.cryptoApi.createTipPlanchet(d)));
      const coinPubs: string[] = planchets.map(x => x.coinPub);
      tipRecord = {
        accepted: false,
        amount,
        coinPubs,
        deadline,
        exchangeUrl,
        merchantDomain,
        planchets,
        tipId,
      };
      await this.q().put(Stores.tips, tipRecord).finish();
    }
    // Planchets in the form that the merchant expects
    const planchetDetail: TipPlanchetDetail[]= tipRecord.planchets.map((p) => ({
      denom_pub_hash: p.denomPubHash,
      coin_ev: p.coinEv,
    }));
    return planchetDetail;
  }

  /**
   * Accept a merchant's response to a tip pickup and start withdrawing the coins.
   * These coins will not appear in the wallet yet.
   */
  async processTipResponse(merchantDomain: string, tipId: string, response: TipResponse): Promise<void> {
    let tipRecord = await this.q().get(Stores.tips, [tipId, merchantDomain]);
    if (!tipRecord) {
      throw Error("tip not found");
    }
    console.log("processing tip response", response);
    if (response.reserve_sigs.length !== tipRecord.planchets.length) {
      throw Error("number of tip responses does not match requested planchets");
    }

    for (let i = 0; i < tipRecord.planchets.length; i++) {
      let planchet = tipRecord.planchets[i];
      let preCoin = {
        coinPub: planchet.coinPub,
        coinPriv: planchet.coinPriv,
        coinEv: planchet.coinEv,
        coinValue: planchet.coinValue,
        reservePub: response.reserve_pub,
        denomPub: planchet.denomPub,
        blindingKey: planchet.blindingKey,
        withdrawSig: response.reserve_sigs[i].reserve_sig,
        exchangeBaseUrl: tipRecord.exchangeUrl,
        isFromTip: true,
      };
      await this.q().put(Stores.precoins, preCoin);
      this.processPreCoin(preCoin);
    }
  }

  /**
   * Start using the coins from a tip.
   */
  async acceptTip(merchantDomain: string, tipId: string): Promise<void> {
    const tipRecord = await this.q().get(Stores.tips, [tipId, merchantDomain]);
    if (!tipRecord) {
      throw Error("tip not found");
    }
    tipRecord.accepted = true;

    // Create one transactional query, within this transaction
    // both the tip will be marked as accepted and coins
    // already withdrawn will be untainted.
    const q = this.q();

    q.put(Stores.tips, tipRecord);

    const updateCoin = (c: CoinRecord) => {
      if (c.status === CoinStatus.TainedByTip) {
        c.status = CoinStatus.Fresh;
      }
      return c;
    };

    for (const coinPub of tipRecord.coinPubs) {
      q.mutate(Stores.coins, coinPub, updateCoin);
    }

    await q.finish();
    this.notifier.notify();
  }

  async getTipStatus(merchantDomain: string, tipId: string): Promise<TipStatus> {
    const tipRecord = await this.q().get(Stores.tips, [tipId, merchantDomain]);
    if (!tipRecord) {
      throw Error("tip not found");
    }
    const rci = await this.getReserveCreationInfo(tipRecord.exchangeUrl, tipRecord.amount);
    const tipStatus: TipStatus = {
      rci,
      tip: tipRecord,
    };
    return tipStatus;
  }
}
