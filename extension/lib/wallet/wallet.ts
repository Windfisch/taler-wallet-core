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
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
 */

/**
 * High-level wallet operations that should be indepentent from the underlying
 * browser extension interface.
 * @module Wallet
 * @author Florian Dold
 */

import * as native from "./emscriptif";
import {AmountJson, CreateReserveResponse, IMintInfo, Denomination, Notifier} from "./types";
import {HttpResponse, RequestException} from "./http";
import {Query} from "./query";
import {Checkable} from "./checkable";
import {canonicalizeBaseUrl} from "./helpers";
import {ReserveCreationInfo} from "./types";
import {PreCoin} from "./types";
import {Reserve} from "./types";

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


export interface Coin {
  coinPub: string;
  coinPriv: string;
  denomPub: string;
  denomSig: string;
  currentAmount: AmountJson;
  mintBaseUrl: string;
}


class MintInfo implements IMintInfo {
  baseUrl: string;
  masterPublicKey: string;
  denoms: Denomination[];

  constructor(obj: {baseUrl: string} & any) {
    this.baseUrl = obj.baseUrl;

    if (obj.denoms) {
      this.denoms = Array.from(<Denomination[]>obj.denoms);
    } else {
      this.denoms = [];
    }

    if (typeof obj.masterPublicKey === "string") {
      this.masterPublicKey = obj.masterPublicKey;
    }
  }

  static fresh(baseUrl: string): MintInfo {
    return new MintInfo({baseUrl});
  }

  /**
   * Merge new key information into the mint info.
   * If the new key information is invalid (missing fields,
   * invalid signatures), an exception is thrown, but the
   * mint info is updated with the new information up until
   * the first error.
   */
  mergeKeys(newKeys: KeysJson, wallet: Wallet): Promise<void> {
    if (!this.masterPublicKey) {
      this.masterPublicKey = newKeys.master_public_key;
    }

    if (this.masterPublicKey != newKeys.master_public_key) {
      throw Error("public keys do not match");
    }

    let ps = newKeys.denoms.map((newDenom) => {
      let found = false;
      for (let oldDenom of this.denoms) {
        if (oldDenom.denom_pub === newDenom.denom_pub) {
          let a = Object.assign({}, oldDenom);
          let b = Object.assign({}, newDenom);
          // pub hash is only there for convenience in the wallet
          delete a["pub_hash"];
          delete b["pub_hash"];
          if (!deepEquals(a, b)) {
            console.log("old/new:");
            console.dir(a);
            console.dir(b);
            throw Error("denomination modified");
          }
          found = true;
          break;
        }
      }

      if (found) {
        return Promise.resolve();
      }

      return wallet.isValidDenom(newDenom, this.masterPublicKey)
                   .then((valid) => {
                     if (!valid) {
                       throw Error("signature on denomination invalid");
                     }

                     let d: Denomination = Object.assign({}, newDenom);
                     d.pub_hash = native.RsaPublicKey.fromCrock(d.denom_pub)
                                        .encode()
                                        .hash()
                                        .toCrock();
                     this.denoms.push(d);

                   });
    });

    return Promise.all(ps).then(() => void 0);
  }
}


@Checkable.Class
export class CreateReserveRequest {
  /**
   * The initial amount for the reserve.
   */
  @Checkable.Value(AmountJson)
  amount: AmountJson;

  /**
   * Mint URL where the bank should create the reserve.
   */
  @Checkable.String
  mint: string;

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
export class MintHandle {
  @Checkable.String
  master_pub: string;

  @Checkable.String
  url: string;

  static checked: (obj: any) => MintHandle;
}


@Checkable.Class
export class Contract {
  @Checkable.String
  H_wire: string;

  @Checkable.Value(AmountJson)
  amount: AmountJson;

  @Checkable.List(Checkable.AnyObject)
  auditors: any[];

  @Checkable.String
  expiry: string;

  @Checkable.Any
  locations: any;

  @Checkable.Value(AmountJson)
  max_fee: AmountJson;

  @Checkable.Any
  merchant: any;

  @Checkable.String
  merchant_pub: string;

  @Checkable.List(Checkable.Value(MintHandle))
  mints: MintHandle[];

  @Checkable.List(Checkable.AnyObject)
  products: any[];

  @Checkable.String
  refund_deadline: string;

  @Checkable.String
  timestamp: string;

  @Checkable.Number
  transaction_id: number;

  @Checkable.String
  fulfillment_url: string;

  @Checkable.Optional(Checkable.String)
  repurchase_correlation_id: string;

  static checked: (obj: any) => Contract;
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

interface MintCoins {
  [mintUrl: string]: CoinWithDenom[];
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
  contract: any;
  payReq: any;
}


export interface Badge {
  setText(s: string): void;
  setColor(c: string): void;
}

type PayCoinInfo = Array<{ updatedCoin: Coin, sig: CoinPaySig }>;


function deepEquals(x, y) {
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


function getTalerStampSec(stamp: string) {
  const m = stamp.match(/\/?Date\(([0-9]*)\)\/?/);
  if (!m) {
    return null;
  }
  return parseInt(m[1]);
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

  postJson(url: string|uri.URI, body): Promise<HttpResponse>;

  postForm(url: string|uri.URI, form): Promise<HttpResponse>;
}


function copy(o) {
  return JSON.parse(JSON.stringify(o));
}


/**
 * Rank two denomination by how desireable it is to withdraw them,
 * based on their fees and value.
 */
function rankDenom(denom1: any, denom2: any) {
  // Slow ... we should find a better way than to convert it evert time.
  let v1 = new native.Amount(denom1.value);
  let v2 = new native.Amount(denom2.value);
  return (-1) * v1.cmp(v2);
}


/**
 * Get a list of denominations (with repetitions possible)
 * whose total value is as close as possible to the available
 * amount, but never larger.
 */
function getWithdrawDenomList(amountAvailable: AmountJson,
                              denoms: Denomination[]): Denomination[] {
  let remaining = new native.Amount(amountAvailable);
  let ds: Denomination[] = [];

  denoms = denoms.filter(isWithdrawableDenom);
  denoms.sort(rankDenom);

  // This is an arbitrary number of coins
  // we can withdraw in one go.  It's not clear if this limit
  // is useful ...
  for (let i = 0; i < 1000; i++) {
    let found = false;
    for (let d of denoms) {
      let cost = new native.Amount(d.value);
      cost.add(new native.Amount(d.fee_withdraw));
      if (remaining.cmp(cost) < 0) {
        continue;
      }
      found = true;
      remaining.sub(cost);
      ds.push(d);
    }
    if (!found) {
      console.log("did not find coins for remaining ", remaining.toJson());
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
  private cryptoWorker: Worker;
  private nextRpcId: number = 1;
  private rpcRegistry = {};


  constructor(db: IDBDatabase,
              http: HttpRequestLibrary,
              badge: Badge,
              notifier: Notifier) {
    this.db = db;
    this.http = http;
    this.badge = badge;
    this.notifier = notifier;
    this.cryptoWorker = new Worker("/lib/wallet/cryptoWorker.js");

    this.cryptoWorker.onmessage = (msg: MessageEvent) => {
      let id = msg.data.id;
      if (typeof id !== "number") {
        console.error("rpc id must be number");
        return;
      }
      if (!this.rpcRegistry[id]) {
        console.error(`RPC with id ${id} has no registry entry`);
        return;
      }
      let {resolve, reject} = this.rpcRegistry[id];
      resolve(msg.data.result);
    }
  }


  /**
   * Generate updated coins (to store in the database)
   * and deposit permissions for each given coin.
   */
  private static signDeposit(offer: Offer,
                             cds: CoinWithDenom[]): PayCoinInfo {
    let ret = [];
    let amountSpent = native.Amount.getZero(cds[0].coin.currentAmount.currency);
    let amountRemaining = new native.Amount(offer.contract.amount);
    cds = copy(cds);
    for (let cd of cds) {
      let coinSpend;

      if (amountRemaining.value == 0 && amountRemaining.fraction == 0) {
        break;
      }

      if (amountRemaining.cmp(new native.Amount(cd.coin.currentAmount)) < 0) {
        coinSpend = new native.Amount(amountRemaining.toJson());
      } else {
        coinSpend = new native.Amount(cd.coin.currentAmount);
      }

      amountSpent.add(coinSpend);
      amountRemaining.sub(coinSpend);

      let newAmount = new native.Amount(cd.coin.currentAmount);
      newAmount.sub(coinSpend);
      cd.coin.currentAmount = newAmount.toJson();

      let d = new native.DepositRequestPS({
        h_contract: native.HashCode.fromCrock(offer.H_contract),
        h_wire: native.HashCode.fromCrock(offer.contract.H_wire),
        amount_with_fee: coinSpend.toNbo(),
        coin_pub: native.EddsaPublicKey.fromCrock(cd.coin.coinPub),
        deposit_fee: new native.Amount(cd.denom.fee_deposit).toNbo(),
        merchant: native.EddsaPublicKey.fromCrock(offer.contract.merchant_pub),
        refund_deadline: native.AbsoluteTimeNbo.fromTalerString(offer.contract.refund_deadline),
        timestamp: native.AbsoluteTimeNbo.fromTalerString(offer.contract.timestamp),
        transaction_id: native.UInt64.fromNumber(offer.contract.transaction_id),
      });

      let coinSig = native.eddsaSign(d.toPurpose(),
                                     native.EddsaPrivateKey.fromCrock(cd.coin.coinPriv))
                          .toCrock();

      let s: CoinPaySig = {
        coin_sig: coinSig,
        coin_pub: cd.coin.coinPub,
        ub_sig: cd.coin.denomSig,
        denom_pub: cd.coin.denomPub,
        f: coinSpend.toJson(),
      };
      ret.push({sig: s, updatedCoin: cd.coin});
    }
    return ret;
  }


  /**
   * Get mints and associated coins that are still spendable,
   * but only if the sum the coins' remaining value exceeds the payment amount.
   */
  private getPossibleMintCoins(paymentAmount: AmountJson,
                               depositFeeLimit: AmountJson,
                               allowedMints: MintHandle[]): Promise<MintCoins> {
    // Mapping from mint base URL to list of coins together with their
    // denomination
    let m: MintCoins = {};

    function storeMintCoin(mc) {
      let mint: IMintInfo = mc[0];
      let coin: Coin = mc[1];
      let cd = {
        coin: coin,
        denom: mint.denoms.find((e) => e.denom_pub === coin.denomPub)
      };
      if (!cd.denom) {
        throw Error("denom not found (database inconsistent)");
      }
      if (cd.denom.value.currency !== paymentAmount.currency) {
        console.warn("same pubkey for different currencies");
        return;
      }
      let x = m[mint.baseUrl];
      if (!x) {
        m[mint.baseUrl] = [cd];
      } else {
        x.push(cd);
      }
    }

    let ps = allowedMints.map((info) => {
      console.log("Checking for merchant's mint", JSON.stringify(info));
      return Query(this.db)
        .iter("mints", {indexName: "pubKey", only: info.master_pub})
        .indexJoin("coins", "mintBaseUrl", (mint) => mint.baseUrl)
        .reduce(storeMintCoin);
    });

    return Promise.all(ps).then(() => {
      let ret: MintCoins = {};

      if (Object.keys(m).length == 0) {
        console.log("not suitable mints found");
      }

      console.dir(m);

      // We try to find the first mint where we have
      // enough coins to cover the paymentAmount with fees
      // under depositFeeLimit

      nextMint:
        for (let key in m) {
          let coins = m[key].map((x) => ({
            a: new native.Amount(x.denom.fee_deposit),
            c: x
          }));
          // Sort by ascending deposit fee
          coins.sort((o1, o2) => o1.a.cmp(o2.a));
          let maxFee = new native.Amount(depositFeeLimit);
          let minAmount = new native.Amount(paymentAmount);
          let accFee = new native.Amount(coins[0].c.denom.fee_deposit);
          let accAmount = native.Amount.getZero(coins[0].c.coin.currentAmount.currency);
          let usableCoins: CoinWithDenom[] = [];
          nextCoin:
            for (let i = 0; i < coins.length; i++) {
              let coinAmount = new native.Amount(coins[i].c.coin.currentAmount);
              let coinFee = coins[i].a;
              if (coinAmount.cmp(coinFee) <= 0) {
                continue nextCoin;
              }
              accFee.add(coinFee);
              accAmount.add(coinAmount);
              if (accFee.cmp(maxFee) >= 0) {
                // FIXME: if the fees are too high, we have
                // to cover them ourselves ....
                console.log("too much fees");
                continue nextMint;
              }
              usableCoins.push(coins[i].c);
              if (accAmount.cmp(minAmount) >= 0) {
                ret[key] = usableCoins;
                continue nextMint;
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
  private recordConfirmPay(offer: Offer,
                           payCoinInfo: PayCoinInfo,
                           chosenMint: string): Promise<void> {
    let payReq = {};
    payReq["amount"] = offer.contract.amount;
    payReq["coins"] = payCoinInfo.map((x) => x.sig);
    payReq["H_contract"] = offer.H_contract;
    payReq["max_fee"] = offer.contract.max_fee;
    payReq["merchant_sig"] = offer.merchant_sig;
    payReq["mint"] = URI(chosenMint).href();
    payReq["refund_deadline"] = offer.contract.refund_deadline;
    payReq["timestamp"] = offer.contract.timestamp;
    payReq["transaction_id"] = offer.contract.transaction_id;
    let t: Transaction = {
      contractHash: offer.H_contract,
      contract: offer.contract,
      payReq: payReq,
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

    return Query(this.db)
      .put("transactions", t)
      .put("history", historyEntry)
      .putAll("coins", payCoinInfo.map((pci) => pci.updatedCoin))
      .finish()
      .then(() => {
        this.notifier.notify();
      });
  }


  /**
   * Add a contract to the wallet and sign coins,
   * but do not send them yet.
   */
  confirmPay(offer: Offer): Promise<any> {
    console.log("executing confirmPay");
    return Promise.resolve().then(() => {
      return this.getPossibleMintCoins(offer.contract.amount,
                                       offer.contract.max_fee,
                                       offer.contract.mints)
    }).then((mcs) => {
      if (Object.keys(mcs).length == 0) {
        console.log("not confirming payment, insufficient coins");
        return {
          error: "coins-insufficient",
        };
      }
      console.log("about to record ...");
      let mintUrl = Object.keys(mcs)[0];
      let ds = Wallet.signDeposit(offer, mcs[mintUrl]);
      return this.recordConfirmPay(offer, ds, mintUrl)
                 .then((() => ({})));
    });
  }


  /**
   * Retrieve all necessary information for looking up the contract
   * with the given hash.
   */
  executePayment(H_contract): Promise<any> {
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
  private initReserve(reserveRecord) {
    this.updateMintFromUrl(reserveRecord.mint_base_url)
        .then((mint) =>
                this.updateReserve(reserveRecord.reserve_pub, mint)
                    .then((reserve) => this.depleteReserve(reserve,
                                                           mint)))
        .then(() => {
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
          console.error("Failed to deplete reserve");
          console.error(e);
        });
  }


  /**
   * Create a reserve, but do not flag it as confirmed yet.
   */
  createReserve(req: CreateReserveRequest): Promise<CreateReserveResponse> {
    const reservePriv = native.EddsaPrivateKey.create();
    const reservePub = reservePriv.getPublicKey();

    const now = (new Date).getTime();
    const canonMint = canonicalizeBaseUrl(req.mint);

    const reserveRecord = {
      reserve_pub: reservePub.toCrock(),
      reserve_priv: reservePriv.toCrock(),
      mint_base_url: canonMint,
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
          mint: canonMint,
          reservePub: reservePub.toCrock(),
        };
        return r;
      });
  }


  /**
   * Mark an existing reserve as confirmed.  The wallet will start trying
   * to withdraw from that reserve.  This may not immediately succeed,
   * since the mint might not know about the reserve yet, even though the
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
        r.confirmed = true;
        return Query(this.db)
          .put("reserves", r)
          .put("history", historyEntry)
          .finish()
          .then(() => {
            // Do this in the background
            this.initReserve(r);
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
        let reqUrl = URI("reserve/withdraw").absoluteTo(r.mint_base_url);
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
        let denomSig = native.rsaUnblind(native.RsaSignature.fromCrock(r.ev_sig),
                                         native.RsaBlindingKey.fromCrock(pc.blindingKey),
                                         native.RsaPublicKey.fromCrock(pc.denomPub));
        let coin: Coin = {
          coinPub: pc.coinPub,
          coinPriv: pc.coinPriv,
          denomPub: pc.denomPub,
          denomSig: denomSig.encode().toCrock(),
          currentAmount: pc.coinValue,
          mintBaseUrl: pc.mintBaseUrl,
        };
        return coin;
      });
  }

  storeCoin(coin: Coin): Promise<void> {
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
   * Withdraw one coins of the given denomination from the given reserve.
   */
  private withdraw(denom: Denomination, reserve: Reserve): Promise<void> {
    console.log("creating pre coin at", new Date());
    return this.createPreCoin(denom, reserve)
               .then((preCoin) => {
                 return Query(this.db)
                   .put("precoins", preCoin)
                   .finish()
                   .then(() => this.withdrawExecute(preCoin))
                   .then((c) => this.storeCoin(c));
               });

  }


  /**
   * Withdraw coins from a reserve until it is empty.
   */
  private depleteReserve(reserve, mint: MintInfo): Promise<void> {
    let denomsAvailable: Denomination[] = copy(mint.denoms);
    let denomsForWithdraw = getWithdrawDenomList(reserve.current_amount,
                                                 denomsAvailable);

    let ps = denomsForWithdraw.map((denom) => {
      console.log("withdrawing", JSON.stringify(denom));
      // Do the withdraw asynchronously, so crypto is interleaved
      // with requests
      return this.withdraw(denom, reserve);
    });

    return Promise.all(ps).then(() => void 0);
  }


  /**
   * Update the information about a reserve that is stored in the wallet
   * by quering the reserve's mint.
   */
  private updateReserve(reservePub: string, mint: MintInfo): Promise<Reserve> {
    return Query(this.db)
      .get("reserves", reservePub)
      .then((reserve) => {
        let reqUrl = URI("reserve/status").absoluteTo(mint.baseUrl);
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


  getReserveCreationInfo(baseUrl: string,
                         amount: AmountJson): Promise<ReserveCreationInfo> {
    return this.updateMintFromUrl(baseUrl)
               .then((mintInfo: IMintInfo) => {
                 let selectedDenoms = getWithdrawDenomList(amount,
                                                           mintInfo.denoms);

                 let acc = native.Amount.getZero(amount.currency);
                 for (let d of selectedDenoms) {
                   acc.add(new native.Amount(d.fee_withdraw));
                 }
                 let ret: ReserveCreationInfo = {
                   mintInfo,
                   selectedDenoms,
                   withdrawFee: acc.toJson(),
                 };
                 return ret;
               });
  }


  /**
   * Update or add mint DB entry by fetching the /keys information.
   * Optionally link the reserve entry to the new or existing
   * mint entry in then DB.
   */
  updateMintFromUrl(baseUrl): Promise<MintInfo> {
    baseUrl = canonicalizeBaseUrl(baseUrl);
    let reqUrl = URI("keys").absoluteTo(baseUrl);
    return this.http.get(reqUrl).then((resp) => {
      if (resp.status != 200) {
        throw Error("/keys request failed");
      }
      let mintKeysJson = KeysJson.checked(JSON.parse(resp.responseText));

      return Query(this.db).get("mints", baseUrl).then((r) => {
        let mintInfo;

        console.log("got mints result");
        console.dir(r);

        if (!r) {
          mintInfo = MintInfo.fresh(baseUrl);
          console.log("making fresh mint");
        } else {
          mintInfo = new MintInfo(r);
          console.log("using old mint");
        }

        return mintInfo.mergeKeys(mintKeysJson, this)
                       .then(() => {
                         return Query(this.db)
                           .put("mints", mintInfo)
                           .finish()
                           .then(() => mintInfo);
                       });

      });
    });
  }


  /**
   * Retrieve a mapping from currency name to the amount
   * that is currenctly available for spending in the wallet.
   */
  getBalances(): Promise<any> {
    function collectBalances(c: Coin, byCurrency) {
      let acc: AmountJson = byCurrency[c.currentAmount.currency];
      if (!acc) {
        acc = native.Amount.getZero(c.currentAmount.currency).toJson();
      }
      let am = new native.Amount(c.currentAmount);
      am.add(new native.Amount(acc));
      byCurrency[c.currentAmount.currency] = am.toJson();
      return byCurrency;
    }

    return Query(this.db)
      .iter("coins")
      .reduce(collectBalances, {});
  }


  /**
   * Retrive the full event history for this wallet.
   */
  getHistory(): Promise<any[]> {
    function collect(x, acc) {
      acc.push(x);
      return acc;
    }

    return Query(this.db)
      .iter("history", {indexName: "timestamp"})
      .reduce(collect, [])
  }

  registerRpcId(resolve, reject): number {
    let id = this.nextRpcId++;
    this.rpcRegistry[id] = {resolve, reject};
    return id;
  }

  private doRpc<T>(methodName: string, ...args): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let msg = {
        operation: methodName,
        id: this.registerRpcId(resolve, reject),
        args: args,
      };
      this.cryptoWorker.postMessage(msg);
    });
  }


  createPreCoin(denom: Denomination, reserve: Reserve): Promise<PreCoin> {
    return this.doRpc("createPreCoin", denom, reserve);
  }

  isValidDenom(denom: Denomination,
               masterPub: string): Promise<boolean> {
    return this.doRpc("isValidDenom", denom, masterPub);
  }
}