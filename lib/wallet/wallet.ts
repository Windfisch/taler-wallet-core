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
  CreateReserveResponse,
  IExchangeInfo,
  Denomination,
  Notifier,
  WireInfo
} from "./types";
import {HttpResponse, RequestException} from "./http";
import {Query} from "./query";
import {Checkable} from "./checkable";
import {canonicalizeBaseUrl} from "./helpers";
import {ReserveCreationInfo, Amounts} from "./types";
import {PreCoin} from "./types";
import {Reserve} from "./types";
import {CryptoApi} from "./cryptoApi";
import {Coin} from "./types";
import {PayCoinInfo} from "./types";
import {CheckRepurchaseResult} from "./types";
import {Contract} from "./types";
import {ExchangeHandle} from "./types";

"use strict";


export interface CoinWithDenom {
  coin: Coin;
  denom: Denomination;
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
export class Offer {
  @Checkable.Value(Contract)
  contract: Contract;

  @Checkable.String
  merchant_sig: string;

  @Checkable.String
  H_contract: string;

  static checked: (obj: any) => Offer;
}


interface ConfirmPayRequest {
  offer: Offer;
}

interface ExchangeCoins {
  [exchangeUrl: string]: CoinWithDenom[];
}


interface CoinPaySig {
  coin_sig: string;
  coin_pub: string;
  ub_sig: string;
  denom_pub: string;
  f: AmountJson;
}


interface Transaction {
  contractHash: string;
  contract: Contract;
  payReq: any;
  merchantSig: string;
}


export interface Badge {
  setText(s: string): void;
  setColor(c: string): void;
  startBusy(): void;
  stopBusy(): void;
}


function deepEquals(x: any, y: any): boolean {
  if (x === y) {
    return true;
  }

  if (Array.isArray(x) && x.length !== y.length) {
    return false;
  }

  var p = Object.keys(x);
  return Object.keys(y).every((i) => p.indexOf(i) !== -1) &&
    p.every((i) => deepEquals(x[i], y[i]));
}


function flatMap<T, U>(xs: T[], f: (x: T) => U[]): U[] {
  return xs.reduce((acc: U[], next: T) => [...f(next), ...acc], []);
}


function getTalerStampSec(stamp: string): number|null {
  const m = stamp.match(/\/?Date\(([0-9]*)\)\/?/);
  if (!m) {
    return null;
  }
  return parseInt(m[1]);
}


function setTimeout(f: any, t: number) {
  return chrome.extension.getBackgroundPage().setTimeout(f, t);
}


function isWithdrawableDenom(d: Denomination) {
  const now_sec = (new Date).getTime() / 1000;
  const stamp_withdraw_sec = getTalerStampSec(d.stamp_expire_withdraw);
  // Withdraw if still possible to withdraw within a minute
  if (stamp_withdraw_sec + 60 > now_sec) {
    return true;
  }
  return false;
}


interface HttpRequestLibrary {
  req(method: string,
      url: string|uri.URI,
      options?: any): Promise<HttpResponse>;

  get(url: string|uri.URI): Promise<HttpResponse>;

  postJson(url: string|uri.URI, body: any): Promise<HttpResponse>;

  postForm(url: string|uri.URI, form: any): Promise<HttpResponse>;
}


function copy(o: any) {
  return JSON.parse(JSON.stringify(o));
}

/**
 * Result of updating exisiting information
 * about an exchange with a new '/keys' response.
 */
interface KeyUpdateInfo {
  updatedExchangeInfo: IExchangeInfo;
  addedDenominations: Denomination[];
  removedDenominations: Denomination[];
}


/**
 * Get a list of denominations (with repetitions possible)
 * whose total value is as close as possible to the available
 * amount, but never larger.
 */
function getWithdrawDenomList(amountAvailable: AmountJson,
                              denoms: Denomination[]): Denomination[] {
  let remaining = Amounts.copy(amountAvailable);
  const ds: Denomination[] = [];

  denoms = denoms.filter(isWithdrawableDenom);
  denoms.sort((d1, d2) => Amounts.cmp(d2.value, d1.value));

  // This is an arbitrary number of coins
  // we can withdraw in one go.  It's not clear if this limit
  // is useful ...
  for (let i = 0; i < 1000; i++) {
    let found = false;
    for (let d of denoms) {
      let cost = Amounts.add(d.value, d.fee_withdraw).amount;
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


export class Wallet {
  private db: IDBDatabase;
  private http: HttpRequestLibrary;
  private badge: Badge;
  private notifier: Notifier;
  public cryptoApi: CryptoApi;

  /**
   * Set of identifiers for running operations.
   */
  private runningOperations: Set<string> = new Set();

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

  updateExchanges(): void {
    console.log("updating exchanges");

    Query(this.db)
      .iter("exchanges")
      .reduce((exchange: IExchangeInfo) => {
        this.updateExchangeFromUrl(exchange.baseUrl)
            .catch((e) => {
              console.error("updating exchange failed", e);
            });
      });
  }

  /**
   * Resume various pending operations that are pending
   * by looking at the database.
   */
  private resumePendingFromDb(): void {
    console.log("resuming pending operations from db");

    Query(this.db)
      .iter("reserves")
      .reduce((reserve: any) => {
        console.log("resuming reserve", reserve.reserve_pub);
        this.processReserve(reserve);
      });

    Query(this.db)
      .iter("precoins")
      .reduce((preCoin: any) => {
        console.log("resuming precoin");
        this.processPreCoin(preCoin);
      });
  }


  /**
   * Get exchanges and associated coins that are still spendable,
   * but only if the sum the coins' remaining value exceeds the payment amount.
   */
  private getPossibleExchangeCoins(paymentAmount: AmountJson,
                                   depositFeeLimit: AmountJson,
                                   allowedExchanges: ExchangeHandle[]): Promise<ExchangeCoins> {
    // Mapping from exchange base URL to list of coins together with their
    // denomination
    let m: ExchangeCoins = {};

    let x: number;

    function storeExchangeCoin(mc: any, url: string) {
      let exchange: IExchangeInfo = mc[0];
      console.log("got coin for exchange", url);
      let coin: Coin = mc[1];
      if (coin.suspended) {
        console.log("skipping suspended coin",
                    coin.denomPub,
                    "from exchange",
                    exchange.baseUrl);
        return;
      }
      let denom = exchange.active_denoms.find((e) => e.denom_pub === coin.denomPub);
      if (!denom) {
        console.warn("denom not found (database inconsistent)");
        return;
      }
      if (denom.value.currency !== paymentAmount.currency) {
        console.warn("same pubkey for different currencies");
        return;
      }
      let cd = {coin, denom};
      let x = m[url];
      if (!x) {
        m[url] = [cd];
      } else {
        x.push(cd);
      }
    }

    // Make sure that we don't look up coins
    // for the same URL twice ...
    let handledExchanges = new Set();

    let ps = flatMap(allowedExchanges, (info: ExchangeHandle) => {
      if (handledExchanges.has(info.url)) {
        return [];
      }
      handledExchanges.add(info.url);
      console.log("Checking for merchant's exchange", JSON.stringify(info));
      return [
        Query(this.db)
          .iter("exchanges", {indexName: "pubKey", only: info.master_pub})
          .indexJoin("coins", "exchangeBaseUrl", (exchange) => exchange.baseUrl)
          .reduce((x) => storeExchangeCoin(x, info.url))
      ];
    });

    return Promise.all(ps).then(() => {
      let ret: ExchangeCoins = {};

      if (Object.keys(m).length == 0) {
        console.log("not suitable exchanges found");
      }

      console.dir(m);

      // We try to find the first exchange where we have
      // enough coins to cover the paymentAmount with fees
      // under depositFeeLimit

      nextExchange:
        for (let key in m) {
          let coins = m[key];
          // Sort by ascending deposit fee
          coins.sort((o1, o2) => Amounts.cmp(o1.denom.fee_deposit,
                                             o2.denom.fee_deposit));
          let maxFee = Amounts.copy(depositFeeLimit);
          let minAmount = Amounts.copy(paymentAmount);
          let accFee = Amounts.copy(coins[0].denom.fee_deposit);
          let accAmount = Amounts.getZero(coins[0].coin.currentAmount.currency);
          let usableCoins: CoinWithDenom[] = [];
          nextCoin:
            for (let i = 0; i < coins.length; i++) {
              let coinAmount = Amounts.copy(coins[i].coin.currentAmount);
              let coinFee = coins[i].denom.fee_deposit;
              if (Amounts.cmp(coinAmount, coinFee) <= 0) {
                continue nextCoin;
              }
              accFee = Amounts.add(accFee, coinFee).amount;
              accAmount = Amounts.add(accAmount, coinAmount).amount;
              if (Amounts.cmp(accFee, maxFee) >= 0) {
                // FIXME: if the fees are too high, we have
                // to cover them ourselves ....
                console.log("too much fees");
                continue nextExchange;
              }
              usableCoins.push(coins[i]);
              if (Amounts.cmp(accAmount, minAmount) >= 0) {
                ret[key] = usableCoins;
                continue nextExchange;
              }
            }
        }
      return ret;
    });
  }


  /**
   * Record all information that is necessary to
   * pay for a contract in the wallet's database.
   */
  private async recordConfirmPay(offer: Offer,
                                 payCoinInfo: PayCoinInfo,
                                 chosenExchange: string): Promise<void> {
    let payReq: any = {};
    payReq["amount"] = offer.contract.amount;
    payReq["coins"] = payCoinInfo.map((x) => x.sig);
    payReq["H_contract"] = offer.H_contract;
    payReq["max_fee"] = offer.contract.max_fee;
    payReq["merchant_sig"] = offer.merchant_sig;
    payReq["exchange"] = URI(chosenExchange).href();
    payReq["refund_deadline"] = offer.contract.refund_deadline;
    payReq["timestamp"] = offer.contract.timestamp;
    payReq["transaction_id"] = offer.contract.transaction_id;
    let t: Transaction = {
      contractHash: offer.H_contract,
      contract: offer.contract,
      payReq: payReq,
      merchantSig: offer.merchant_sig,
    };

    console.log("pay request");
    console.dir(payReq);

    let historyEntry = {
      type: "pay",
      timestamp: (new Date).getTime(),
      detail: {
        merchantName: offer.contract.merchant.name,
        amount: offer.contract.amount,
        contractHash: offer.H_contract,
        fulfillmentUrl: offer.contract.fulfillment_url
      }
    };

    await Query(this.db)
      .put("transactions", t)
      .put("history", historyEntry)
      .putAll("coins", payCoinInfo.map((pci) => pci.updatedCoin))
      .finish();

    this.notifier.notify();
  }


  /**
   * Add a contract to the wallet and sign coins,
   * but do not send them yet.
   */
  confirmPay(offer: Offer): Promise<any> {
    console.log("executing confirmPay");

    return Query(this.db)
      .get("transactions", offer.H_contract)
      .then((transaction) => {
        if (transaction) {
          // Already payed ...
          return {};
        }
        return Promise.resolve().then(() => {
          return this.getPossibleExchangeCoins(offer.contract.amount,
                                               offer.contract.max_fee,
                                               offer.contract.exchanges)
        }).then((mcs) => {
          if (Object.keys(mcs).length == 0) {
            console.log("not confirming payment, insufficient coins");
            return {
              error: "coins-insufficient",
            };
          }
          let exchangeUrl = Object.keys(mcs)[0];

          return this.cryptoApi.signDeposit(offer, mcs[exchangeUrl])
                     .then((ds) => this.recordConfirmPay(offer,
                                                         ds,
                                                         exchangeUrl))
                     .then(() => ({}));
        });
      });
  }


  /**
   * Add a contract to the wallet and sign coins,
   * but do not send them yet.
   */
  checkPay(offer: Offer): Promise<any> {
    console.log("executing checkPay");

    // First check if we already payed for it.
    return Query(this.db)
      .get("transactions", offer.H_contract)
      .then((transaction) => {
        if (transaction) {
          return {isPayed: true};
        }

        // If not already payed, check if we could pay for it.
        return Promise.resolve().then(() => {
          return this.getPossibleExchangeCoins(offer.contract.amount,
                                               offer.contract.max_fee,
                                               offer.contract.exchanges)
        }).then((mcs) => {
          if (Object.keys(mcs).length == 0) {
            console.log("not confirming payment, insufficient coins");
            return {
              error: "coins-insufficient",
            };
          }
          return {isPayed: false};
        });

      });
  }


  /**
   * Retrieve all necessary information for looking up the contract
   * with the given hash.
   */
  executePayment(H_contract: string): Promise<any> {
    return Promise.resolve().then(() => {
      return Query(this.db)
        .get("transactions", H_contract)
        .then((t) => {
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
        });
    });
  }


  /**
   * First fetch information requred to withdraw from the reserve,
   * then deplete the reserve, withdrawing coins until it is empty.
   */
  private processReserve(reserveRecord: any, retryDelayMs: number = 250): void {
    const opId = "reserve-" + reserveRecord.reserve_pub;
    this.startOperation(opId);
    this.updateExchangeFromUrl(reserveRecord.exchange_base_url)
        .then((exchange) =>
                this.updateReserve(reserveRecord.reserve_pub, exchange)
                    .then((reserve) => this.depleteReserve(reserve,
                                                           exchange)))
        .then(() => {
          this.stopOperation(opId);
          let depleted = {
            type: "depleted-reserve",
            timestamp: (new Date).getTime(),
            detail: {
              reservePub: reserveRecord.reserve_pub,
            }
          };
          return Query(this.db).put("history", depleted).finish();
        })
        .catch((e) => {
          // Don't show progress while we're sleeping
          this.stopOperation(opId);
          // random, exponential backoff truncated at 3 minutes
          let nextDelay = Math.min(2 * retryDelayMs + retryDelayMs * Math.random(),
                                   3000 * 60);
          console.warn(`Failed to deplete reserve, trying again in ${retryDelayMs} ms`);
          setTimeout(() => this.processReserve(reserveRecord, nextDelay),
                     retryDelayMs);
        });
  }


  private processPreCoin(preCoin: any, retryDelayMs = 100): void {
    this.withdrawExecute(preCoin)
        .then((c) => this.storeCoin(c))
        .catch((e) => {
          console.error("Failed to withdraw coin from precoin, retrying in",
                        retryDelayMs,
                        "ms");
          console.error(e);
          // exponential backoff truncated at one minute
          let nextRetryDelayMs = Math.min(retryDelayMs * 2, 1000 * 60);
          setTimeout(() => this.processPreCoin(preCoin, nextRetryDelayMs),
                     retryDelayMs);
        });
  }


  /**
   * Create a reserve, but do not flag it as confirmed yet.
   */
  createReserve(req: CreateReserveRequest): Promise<CreateReserveResponse> {
    return this.cryptoApi.createEddsaKeypair().then((keypair) => {
      const now = (new Date).getTime();
      const canonExchange = canonicalizeBaseUrl(req.exchange);

      const reserveRecord = {
        reserve_pub: keypair.pub,
        reserve_priv: keypair.priv,
        exchange_base_url: canonExchange,
        created: now,
        last_query: null,
        current_amount: null,
        requested_amount: req.amount,
        confirmed: false,
      };


      const historyEntry = {
        type: "create-reserve",
        timestamp: now,
        detail: {
          requestedAmount: req.amount,
          reservePub: reserveRecord.reserve_pub,
        }
      };

      return Query(this.db)
        .put("reserves", reserveRecord)
        .put("history", historyEntry)
        .finish()
        .then(() => {
          let r: CreateReserveResponse = {
            exchange: canonExchange,
            reservePub: keypair.pub,
          };
          return r;
        });
    });
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
  confirmReserve(req: ConfirmReserveRequest): Promise<void> {
    const now = (new Date).getTime();
    const historyEntry = {
      type: "confirm-reserve",
      timestamp: now,
      detail: {
        reservePub: req.reservePub,
      }
    };
    return Query(this.db)
      .get("reserves", req.reservePub)
      .then((r) => {
        if (!r) {
          console.error("Unable to confirm reserve, not found in DB");
          return;
        }
        r.confirmed = true;
        return Query(this.db)
          .put("reserves", r)
          .put("history", historyEntry)
          .finish()
          .then(() => {
            // Do this in the background
            this.processReserve(r);
          });
      });
  }


  private withdrawExecute(pc: PreCoin): Promise<Coin> {
    return Query(this.db)
      .get("reserves", pc.reservePub)
      .then((r) => {
        let wd: any = {};
        wd.denom_pub = pc.denomPub;
        wd.reserve_pub = pc.reservePub;
        wd.reserve_sig = pc.withdrawSig;
        wd.coin_ev = pc.coinEv;
        let reqUrl = URI("reserve/withdraw").absoluteTo(r.exchange_base_url);
        return this.http.postJson(reqUrl, wd);
      })
      .then(resp => {
        if (resp.status != 200) {
          throw new RequestException({
            hint: "Withdrawal failed",
            status: resp.status
          });
        }
        let r = JSON.parse(resp.responseText);
        return this.cryptoApi.rsaUnblind(r.ev_sig, pc.blindingKey, pc.denomPub)
                   .then((denomSig) => {
                     let coin: Coin = {
                       coinPub: pc.coinPub,
                       coinPriv: pc.coinPriv,
                       denomPub: pc.denomPub,
                       denomSig: denomSig,
                       currentAmount: pc.coinValue,
                       exchangeBaseUrl: pc.exchangeBaseUrl,
                     };
                     return coin;

                   });
      });
  }

  storeCoin(coin: Coin): Promise<void> {
    console.log("storing coin", new Date());
    let historyEntry = {
      type: "withdraw",
      timestamp: (new Date).getTime(),
      detail: {
        coinPub: coin.coinPub,
      }
    };
    return Query(this.db)
      .delete("precoins", coin.coinPub)
      .add("coins", coin)
      .add("history", historyEntry)
      .finish()
      .then(() => {
        this.notifier.notify();
      });
  }


  /**
   * Withdraw one coin of the given denomination from the given reserve.
   */
  private withdraw(denom: Denomination, reserve: Reserve): Promise<void> {
    console.log("creating pre coin at", new Date());
    return this.cryptoApi
               .createPreCoin(denom, reserve)
               .then((preCoin) => {
                 return Query(this.db)
                   .put("precoins", preCoin)
                   .finish()
                   .then(() => this.processPreCoin(preCoin));
               });

  }


  /**
   * Withdraw coins from a reserve until it is empty.
   */
  private async depleteReserve(reserve: any,
                               exchange: IExchangeInfo): Promise<void> {
    let denomsAvailable: Denomination[] = copy(exchange.active_denoms);
    let denomsForWithdraw = getWithdrawDenomList(reserve.current_amount,
                                                 denomsAvailable);

    let ps = denomsForWithdraw.map((denom) => this.withdraw(denom, reserve));
    await Promise.all(ps);
  }


  /**
   * Update the information about a reserve that is stored in the wallet
   * by quering the reserve's exchange.
   */
  private updateReserve(reservePub: string,
                        exchange: IExchangeInfo): Promise<Reserve> {
    return Query(this.db)
      .get("reserves", reservePub)
      .then((reserve) => {
        let reqUrl = URI("reserve/status").absoluteTo(exchange.baseUrl);
        reqUrl.query({'reserve_pub': reservePub});
        return this.http.get(reqUrl).then(resp => {
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
            detail: {
              reservePub,
              oldAmount,
              newAmount
            }
          };
          return Query(this.db)
            .put("reserves", reserve)
            .finish()
            .then(() => reserve);
        });
      });
  }


  /**
   * Get the wire information for the exchange with the given base URL.
   */
  getWireInfo(exchangeBaseUrl: string): Promise<WireInfo> {
    exchangeBaseUrl = canonicalizeBaseUrl(exchangeBaseUrl);
    let reqUrl = URI("wire").absoluteTo(exchangeBaseUrl);
    return this.http.get(reqUrl).then((resp: HttpResponse) => {
      if (resp.status != 200) {
        throw Error("/wire request failed");
      }

      let wiJson = JSON.parse(resp.responseText);
      if (!wiJson) {
        throw Error("/wire response malformed")
      }
      return wiJson;
    });
  }

  getReserveCreationInfo(baseUrl: string,
                         amount: AmountJson): Promise<ReserveCreationInfo> {
    let p = this.updateExchangeFromUrl(baseUrl);
    return p.then((exchangeInfo: IExchangeInfo) => {
      let selectedDenoms = getWithdrawDenomList(amount,
                                                exchangeInfo.active_denoms);
      let acc = Amounts.getZero(amount.currency);
      for (let d of selectedDenoms) {
        acc = Amounts.add(acc, d.fee_withdraw).amount;
      }
      let actualCoinCost = selectedDenoms
        .map((d: Denomination) => Amounts.add(d.value,
                                              d.fee_withdraw).amount)
        .reduce((a, b) => Amounts.add(a, b).amount);
      return this.getWireInfo(baseUrl).then((wireInfo) => {
        let ret: ReserveCreationInfo = {
          exchangeInfo,
          selectedDenoms,
          wireInfo,
          withdrawFee: acc,
          overhead: Amounts.sub(amount, actualCoinCost).amount,
        };
        return ret;
      });

    });
  }


  /**
   * Update or add exchange DB entry by fetching the /keys information.
   * Optionally link the reserve entry to the new or existing
   * exchange entry in then DB.
   */
  updateExchangeFromUrl(baseUrl: string): Promise<IExchangeInfo> {
    baseUrl = canonicalizeBaseUrl(baseUrl);
    let reqUrl = URI("keys").absoluteTo(baseUrl);
    return this.http.get(reqUrl).then((resp) => {
      if (resp.status != 200) {
        throw Error("/keys request failed");
      }
      let exchangeKeysJson = KeysJson.checked(JSON.parse(resp.responseText));
      return this.updateExchangeFromJson(baseUrl, exchangeKeysJson);
    });
  }

  private async suspendCoins(exchangeInfo: IExchangeInfo): Promise<void> {
    let suspendedCoins = await Query(this.db)
      .iter("coins",
            {indexName: "exchangeBaseUrl", only: exchangeInfo.baseUrl})
      .reduce((coin: Coin, suspendedCoins: Coin[]) => {
        if (!exchangeInfo.active_denoms.find((c) => c.denom_pub == coin.denomPub)) {
          return Array.prototype.concat(suspendedCoins, [coin]);
        }
        return Array.prototype.concat(suspendedCoins);
      }, []);

    let q = Query(this.db);
    suspendedCoins.map((c) => {
      console.log("suspending coin", c);
      c.suspended = true;
      q.put("coins", c);
    });
    await q.finish();
  }


  private async updateExchangeFromJson(baseUrl: string,
                                       exchangeKeysJson: KeysJson): Promise<IExchangeInfo> {
    const updateTimeSec = getTalerStampSec(exchangeKeysJson.list_issue_date);
    if (updateTimeSec === null) {
      throw Error("invalid update time");
    }

    let r = await Query(this.db).get("exchanges", baseUrl);

    let exchangeInfo: IExchangeInfo;

    if (!r) {
      exchangeInfo = {
        baseUrl,
        all_denoms: [],
        active_denoms: [],
        last_update_time: updateTimeSec,
        masterPublicKey: exchangeKeysJson.master_public_key,
      };
      console.log("making fresh exchange");
    } else {
      if (updateTimeSec < r.last_update_time) {
        console.log("outdated /keys, not updating");
        return r
      }
      exchangeInfo = r;
      console.log("updating old exchange");
    }

    let updatedExchangeInfo = await this.updateExchangeInfo(exchangeInfo,
                                                            exchangeKeysJson);
    await this.suspendCoins(updatedExchangeInfo);

    await Query(this.db)
      .put("exchanges", updatedExchangeInfo)
      .finish();

    return updatedExchangeInfo;
  }


  private updateExchangeInfo(exchangeInfo: IExchangeInfo,
                             newKeys: KeysJson): Promise<IExchangeInfo> {

    if (exchangeInfo.masterPublicKey != newKeys.master_public_key) {
      throw Error("public keys do not match");
    }

    exchangeInfo.active_denoms = [];

    let ps = newKeys.denoms.map((newDenom) => {
      // did we find the new denom in the list of all (old) denoms?
      let found = false;
      for (let oldDenom of exchangeInfo.all_denoms) {
        if (oldDenom.denom_pub === newDenom.denom_pub) {
          let a: any = Object.assign({}, oldDenom);
          let b: any = Object.assign({}, newDenom);
          // pub hash is only there for convenience in the wallet
          delete a["pub_hash"];
          delete b["pub_hash"];
          if (!deepEquals(a, b)) {
            console.error("denomination parameters were modified, old/new:");
            console.dir(a);
            console.dir(b);
            // FIXME: report to auditors
          }
          found = true;
          break;
        }
      }

      if (found) {
        exchangeInfo.active_denoms.push(newDenom);
        // No need to check signatures
        return Promise.resolve();
      }

      return this.cryptoApi
                 .isValidDenom(newDenom, exchangeInfo.masterPublicKey)
                 .then((valid) => {
                   if (!valid) {
                     console.error("invalid denomination",
                                   newDenom,
                                   "with key",
                                   exchangeInfo.masterPublicKey);
                     // FIXME: report to auditors
                   }
                   return this.cryptoApi.hashRsaPub(newDenom.denom_pub);
                 })
                 .then((h) => {
                   exchangeInfo.active_denoms.push(newDenom);
                   exchangeInfo.all_denoms.push(newDenom);
                 });
    });

    return Promise.all(ps).then(() => exchangeInfo);
  }


  /**
   * Retrieve a mapping from currency name to the amount
   * that is currenctly available for spending in the wallet.
   */
  async getBalances(): Promise<any> {
    function collectBalances(c: Coin, byCurrency: any) {
      if (c.suspended) {
        return byCurrency;
      }
      let acc: AmountJson = byCurrency[c.currentAmount.currency];
      if (!acc) {
        acc = Amounts.getZero(c.currentAmount.currency);
      }
      byCurrency[c.currentAmount.currency] = Amounts.add(c.currentAmount,
                                                         acc).amount;
      return byCurrency;
    }

    let byCurrency = await Query(this.db)
      .iter("coins")
      .reduce(collectBalances, {});

    return {balances: byCurrency};
  }


  /**
   * Retrive the full event history for this wallet.
   */
  async getHistory(): Promise<any> {
    function collect(x: any, acc: any) {
      acc.push(x);
      return acc;
    }

    let history = await
      Query(this.db)
        .iter("history", {indexName: "timestamp"})
        .reduce(collect, []);

    return {history};
  }

  /**
   * Check if there's an equivalent contract we've already purchased.
   */
  async checkRepurchase(contract: Contract): Promise<CheckRepurchaseResult> {
    if (!contract.repurchase_correlation_id) {
      console.log("no repurchase: no correlation id");
      return {isRepurchase: false};
    }
    let result: Transaction = await Query(this.db)
      .getIndexed("transactions",
                  "repurchase",
                  [contract.merchant_pub, contract.repurchase_correlation_id]);

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
}