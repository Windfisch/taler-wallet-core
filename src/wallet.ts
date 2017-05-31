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
import {
  AbortTransaction,
  Index,
  JoinLeftResult,
  JoinResult,
  QueryRoot,
  Store,
} from "./query";
import {
  AmountJson,
  Amounts,
  Auditor,
  CheckPayResult,
  CoinPaySig,
  CoinRecord,
  CoinStatus,
  ConfirmPayResult,
  Contract,
  CreateReserveResponse,
  CurrencyRecord,
  Denomination,
  DenominationRecord,
  DenominationStatus,
  ExchangeHandle,
  ExchangeRecord,
  ExchangeWireFeesRecord,
  HistoryLevel,
  HistoryRecord,
  Notifier,
  ProposalRecord,
  PayCoinInfo,
  PaybackConfirmation,
  PreCoinRecord,
  RefreshSessionRecord,
  ReserveCreationInfo,
  ReserveRecord,
  WalletBalance,
  WalletBalanceEntry,
  WireFee,
  WireInfo,
} from "./types";
import URI = require("urijs");


/**
 * Named tuple of coin and denomination.
 */
export interface CoinWithDenom {
  /**
   * A coin.  Must have the same denomination public key as the associated
   * denomination.
   */
  coin: CoinRecord;
  /**
   * An associated denomination.
   */
  denom: DenominationRecord;
}


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
  @Checkable.Any
  auditors: any[];

  /**
   * Timestamp when this response was issued.
   */
  @Checkable.String
  list_issue_date: string;

  /**
   * List of paybacks for compromised denominations.
   */
  @Checkable.List(Checkable.Value(Payback))
  payback?: Payback[];

  /**
   * Short-lived signing keys used to sign online
   * responses.
   */
  @Checkable.Any
  signkeys: any;

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
 * Request to mark a reserve as confirmed.
 */
@Checkable.Class()
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

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => CreateReserveRequest;
}


/**
 * Request to mark a reserve as confirmed.
 */
@Checkable.Class()
export class ConfirmReserveRequest {
  /**
   * Public key of then reserve that should be marked
   * as confirmed.
   */
  @Checkable.String
  reservePub: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => ConfirmReserveRequest;
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


const builtinCurrencies: CurrencyRecord[] = [
  {
    auditors: [
      {
        auditorPub: "XN9KMN5G2KGPCAN0E89MM5HE8FV4WBWA9KDTMTDR817MWBCYA7H0",
        baseUrl: "https://auditor.demo.taler.net/",
        expirationStamp: (new Date(2027, 1)).getTime(),
      },
    ],
    exchanges: [],
    fractionalDigits: 2,
    name: "KUDOS",
  },
  {
    auditors: [
    ],
    exchanges: [
      { baseUrl: "https://exchange.test.taler.net/", priority: 0 },
    ],
    fractionalDigits: 2,
    name: "PUDOS",
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


/**
 * Result of selecting coins, contains the exchange, and selected
 * coins with their denomination.
 */
export type CoinSelectionResult = {exchangeUrl: string, cds: CoinWithDenom[]}|undefined;

/**
 * Select coins for a payment under the merchant's constraints.
 */
export function selectPayCoins(cds: CoinWithDenom[], paymentAmount: AmountJson,
                               depositFeeLimit: AmountJson): CoinWithDenom[]|undefined {
  if (cds.length === 0) {
    return undefined;
  }
  // Sort by ascending deposit fee
  cds.sort((o1, o2) => Amounts.cmp(o1.denom.feeDeposit,
                                   o2.denom.feeDeposit));
  const currency = cds[0].denom.value.currency;
  const cdsResult: CoinWithDenom[] = [];
  let accFee: AmountJson = Amounts.getZero(currency);
  let accAmount: AmountJson = Amounts.getZero(currency);
  let isBelowFee = false;
  let coversAmount = false;
  let coversAmountWithFee = false;
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

    pubKeyIndex = new Index<string, ExchangeRecord>(this, "pubKey", "masterPublicKey");
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
    denomPubIndex = new Index<string, CoinRecord>(this, "denomPub", "denomPub");
  }

  class HistoryStore extends Store<HistoryRecord> {
    constructor() {
      super("history", {
        autoIncrement: true,
        keyPath: "id",
      });
    }

    timestampIndex = new Index<number, HistoryRecord>(this, "timestamp", "timestamp");
  }

  class ProposalsStore extends Store<ProposalRecord> {
    constructor() {
      super("proposals", {
        autoIncrement: true,
        keyPath: "id",
      });
    }
  }

  class TransactionsStore extends Store<TransactionRecord> {
    constructor() {
      super("transactions", {keyPath: "contractHash"});
    }

    fulfillmentUrlIndex = new Index<string, TransactionRecord>(this, "fulfillment_url", "contract.fulfillment_url");
    orderIdIndex = new Index<string, TransactionRecord>(this, "order_id", "contract.order_id");
  }

  class DenominationsStore extends Store<DenominationRecord> {
    constructor() {
      // cast needed because of bug in type annotations
      super("denominations",
            {keyPath: ["exchangeBaseUrl", "denomPub"] as any as IDBKeyPath});
    }

    denomPubHashIndex = new Index<string, DenominationRecord>(this, "denomPubHash", "denomPubHash");
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

  export const coins = new CoinsStore();
  export const config = new ConfigStore();
  export const currencies = new CurrenciesStore();
  export const denominations = new DenominationsStore();
  export const exchangeWireFees = new ExchangeWireFeesStore();
  export const exchanges = new ExchangeStore();
  export const history = new HistoryStore();
  export const nonces = new NonceStore();
  export const precoins = new Store<PreCoinRecord>("precoins", {keyPath: "coinPub"});
  export const proposals = new ProposalsStore();
  export const refresh = new Store<RefreshSessionRecord>("refresh", {keyPath: "meltCoinPub"});
  export const reserves = new Store<ReserveRecord>("reserves", {keyPath: "reserve_pub"});
  export const transactions = new TransactionsStore();
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
  private db: IDBDatabase;
  private http: HttpRequestLibrary;
  private badge: Badge;
  private notifier: Notifier;
  private cryptoApi: CryptoApi;
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


  /**
   * Get exchanges and associated coins that are still spendable,
   * but only if the sum the coins' remaining value exceeds the payment amount.
   */
  private async getCoinsForPayment(args: CoinsForPaymentArgs): Promise<CoinSelectionResult> {
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
          remainingAmount = Amounts.add(amortizedWireFee, remainingAmount).amount;
        }
      }

      const res = selectPayCoins(cds, remainingAmount, depositFeeLimit);
      if (res) {
        return {
          cds: res,
          exchangeUrl: exchange.baseUrl,
        };
      }
    }
    return undefined;
  }


  /**
   * Record all information that is necessary to
   * pay for a contract in the wallet's database.
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
    const t: TransactionRecord = {
      contract: proposal.contractTerms,
      contractHash: proposal.contractTermsHash,
      finished: false,
      merchantSig: proposal.merchantSig,
      payReq,
    };

    const historyEntry: HistoryRecord = {
      detail: {
        amount: proposal.contractTerms.amount,
        contractHash: proposal.contractTermsHash,
        fulfillmentUrl: proposal.contractTerms.fulfillment_url,
        merchantName: proposal.contractTerms.merchant.name,
      },
      level: HistoryLevel.User,
      subjectId: `contract-${proposal.contractTermsHash}`,
      timestamp: (new Date()).getTime(),
      type: "pay",
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
    const proposal = await this.q().get(Stores.proposals, proposalId);

    if (!proposal) {
      throw Error(`proposal with id ${proposalId} not found`);
    }

    const transaction = await this.q().get(Stores.transactions, proposal.contractTermsHash);

    if (transaction) {
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

    const ds = await this.cryptoApi.signDeposit(proposal, cds);
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
    const transaction = await this.q().get(Stores.transactions, proposal.contractTermsHash);
    if (transaction) {
      return "insufficient-balance";
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
      return "insufficient-balance";
    }
    return "payment-possible";
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
      };
    }
    console.log("query for payment succeeded:", t);
    const resp = {
      H_contract: t.contractHash,
      contract: t.contract,
      payReq: t.payReq,
      success: true,
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
      const reserve = await this.updateReserve(reserveRecord.reserve_pub);
      const n = await this.depleteReserve(reserve);

      if (n !== 0) {
        const depleted: HistoryRecord = {
          detail: {
            currentAmount: reserveRecord.current_amount,
            exchangeBaseUrl: reserveRecord.exchange_base_url,
            requestedAmount: reserveRecord.requested_amount,
            reservePub: reserveRecord.reserve_pub,
          },
          level: HistoryLevel.User,
          subjectId: `reserve-progress-${reserveRecord.reserve_pub}`,
          timestamp: (new Date()).getTime(),
          type: "depleted-reserve",
        };
        await this.q().put(Stores.history, depleted).finish();
      }
    } catch (e) {
      // random, exponential backoff truncated at 3 minutes
      const nextDelay = Math.min(2 * retryDelayMs + retryDelayMs * Math.random(), 3000 * 60);
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

        const x = Amounts.sub(r.precoin_amount, preCoin.coinValue, denom.feeWithdraw);
        if (x.saturated) {
          console.error("database inconsistent");
          throw AbortTransaction;
        }
        r.precoin_amount = x.amount;
        return r;
      };

      const historyEntry: HistoryRecord = {
        detail: {
          coinPub: coin.coinPub,
        },
        level: HistoryLevel.Expert,
        timestamp: (new Date()).getTime(),
        type: "withdraw",
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
      const nextRetryDelayMs = Math.min(retryDelayMs * 2, 5 * 60 * 1000);
      setTimeout(() => this.processPreCoin(preCoin, nextRetryDelayMs),
                 retryDelayMs);

      const currentThrottle = this.processPreCoinThrottle[preCoin.exchangeBaseUrl] || 0;
      this.processPreCoinThrottle[preCoin.exchangeBaseUrl] = currentThrottle + 1;
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
    const keypair = await this.cryptoApi.createEddsaKeypair();
    const now = (new Date()).getTime();
    const canonExchange = canonicalizeBaseUrl(req.exchange);

    const reserveRecord: ReserveRecord = {
      confirmed: false,
      created: now,
      current_amount: null,
      exchange_base_url: canonExchange,
      hasPayback: false,
      last_query: null,
      precoin_amount: Amounts.getZero(req.amount.currency),
      requested_amount: req.amount,
      reserve_priv: keypair.priv,
      reserve_pub: keypair.pub,
    };

    const historyEntry = {
      detail: {
        requestedAmount: req.amount,
        reservePub: reserveRecord.reserve_pub,
      },
      level: HistoryLevel.Expert,
      subjectId: `reserve-progress-${reserveRecord.reserve_pub}`,
      timestamp: now,
      type: "create-reserve",
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
      currencyRecord.exchanges.push({baseUrl: req.exchange, priority: 0});
    }

    await this.q()
              .put(Stores.currencies, currencyRecord)
              .put(Stores.reserves, reserveRecord)
              .put(Stores.history, historyEntry)
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
    const historyEntry: HistoryRecord = {
      detail: {
        exchangeBaseUrl: reserve.exchange_base_url,
        requestedAmount: reserve.requested_amount,
        reservePub: req.reservePub,
      },
      level: HistoryLevel.User,
      subjectId: `reserve-progress-${reserve.reserve_pub}`,
      timestamp: now,
      type: "confirm-reserve",
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
    const reserve = await this.q().get<ReserveRecord>(Stores.reserves,
                                                    pc.reservePub);

    if (!reserve) {
      throw Error("db inconsistent");
    }

    const wd: any = {};
    wd.denom_pub = pc.denomPub;
    wd.reserve_pub = pc.reservePub;
    wd.reserve_sig = pc.withdrawSig;
    wd.coin_ev = pc.coinEv;
    const reqUrl = (new URI("reserve/withdraw")).absoluteTo(reserve.exchange_base_url);
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
   */
  private async depleteReserve(reserve: ReserveRecord): Promise<number> {
    console.log("depleting reserve");
    if (!reserve.current_amount) {
      throw Error("can't withdraw when amount is unknown");
    }
    const withdrawAmount = reserve.current_amount;
    if (!withdrawAmount) {
      throw Error("can't withdraw when amount is unknown");
    }
    const denomsForWithdraw = await this.getVerifiedWithdrawDenomList(reserve.exchange_base_url, withdrawAmount);

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
    return ps.length;
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
    const oldAmount = reserve.current_amount;
    const newAmount = reserveInfo.balance;
    reserve.current_amount = reserveInfo.balance;
    const historyEntry = {
      detail: {
        newAmount,
        oldAmount,
        requestedAmount: reserve.requested_amount,
        reservePub,
      },
      level: HistoryLevel.Developer,
      subjectId: `reserve-progress-${reserve.reserve_pub}`,
      timestamp: (new Date()).getTime(),
      type: "reserve-update",
    };
    await this.q()
              .put(Stores.reserves, reserve)
              .put(Stores.history, historyEntry)
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
        if (trustedExchange.baseUrl === exchangeInfo.baseUrl) {
          isTrusted = true;
          break;
        }
      }
      for (const trustedAuditor of currencyRecord.auditors) {
        for (const exchangeAuditor of exchangeInfo.auditors) {
          if (trustedAuditor.baseUrl === exchangeAuditor.url) {
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

    const ret: ReserveCreationInfo = {
      earliestDepositExpiration,
      exchangeInfo,
      isAudited,
      isTrusted,
      overhead: Amounts.sub(amount, actualCoinCost).amount,
      selectedDenoms,
      wireFees,
      wireInfo,
      withdrawFee: acc,
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
   * Retrieve a mapping from currency name to the amount
   * that is currenctly available for spending in the wallet.
   */
  async getBalances(): Promise<WalletBalance> {
    function ensureEntry(balance: WalletBalance, currency: string) {
      let entry: WalletBalanceEntry|undefined = balance[currency];
      const z = Amounts.getZero(currency);
      if (!entry) {
        balance[currency] = entry = {
          available: z,
          paybackAmount: z,
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
      if (!(c.status === CoinStatus.Dirty || c.status === CoinStatus.Fresh)) {
        return balance;
      }
      const currency = c.currentAmount.currency;
      const entry = ensureEntry(balance, currency);
      entry.available = Amounts.add(entry.available, c.currentAmount).amount;
      return balance;
    }

    function collectPendingWithdraw(r: ReserveRecord, balance: WalletBalance) {
      if (!r.confirmed) {
        return balance;
      }
      const entry = ensureEntry(balance, r.requested_amount.currency);
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
      const entry = ensureEntry(balance, r.requested_amount.currency);
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
      const entry = ensureEntry(balance, r.valueWithFee.currency);
      entry.pendingIncoming = Amounts.add(entry.pendingIncoming,
                                          r.valueOutput).amount;

      return balance;
    }

    function collectPayments(t: TransactionRecord, balance: WalletBalance) {
      if (t.finished) {
        return balance;
      }
      const entry = ensureEntry(balance, t.contract.amount.currency);
      entry.pendingPayment = Amounts.add(entry.pendingPayment,
                                         t.contract.amount).amount;

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

    const balance = {};
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
    await this.q()
              .put(Stores.refresh, refreshSession)
              .mutate(Stores.coins, coin.coinPub, mutateCoin)
              .finish();

    return refreshSession;
  }


  async refresh(oldCoinPub: string): Promise<void> {
    let refreshSession: RefreshSessionRecord|undefined;
    const oldSession = await this.q().get(Stores.refresh, oldCoinPub);
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
      const coinPub = refreshSession.meltCoinPub;
      await this.refreshMelt(refreshSession);
      const r = await this.q().get<RefreshSessionRecord>(Stores.refresh, coinPub);
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
  }


  /**
   * Retrive the full event history for this wallet.
   */
  async getHistory(): Promise<{history: HistoryRecord[]}> {
    function collect(x: any, acc: any) {
      acc.push(x);
      return acc;
    }

    const history = await (
      this.q()
          .iterIndex(Stores.history.timestampIndex)
          .reduce(collect, []));

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
    const {priv, pub} = await this.cryptoApi.createEddsaKeypair();
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
      const t = await this.q().get<TransactionRecord>(Stores.transactions,
                                                    contractHash);
      if (!t) {
        console.error("contract not found");
        return;
      }
      const merchantPub = t.contract.merchant_pub;
      const valid = this.cryptoApi.isValidPaymentSignature(merchantSig, contractHash, merchantPub);
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
                .put(Stores.transactions, t)
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

}
