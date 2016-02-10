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
import {HttpResponse, RequestException} from "./http";
import {Query} from "./query";
import {Checkable} from "./checkable";

"use strict";


export interface Mint {
  baseUrl: string;
  keys: Keys
}

export interface CoinWithDenom {
  coin: Coin;
  denom: Denomination;
}

export interface Keys {
  denoms: Denomination[];
}

export interface Denomination {
  value: AmountJson;
  denom_pub: string;
  fee_withdraw: AmountJson;
  fee_deposit: AmountJson;
  stamp_expire_withdraw: string;
}

export interface PreCoin {
  coinPub: string;
  coinPriv: string;
  reservePub: string;
  denomPub: string;
  blindingKey: string;
  withdrawSig: string;
  coinEv: string;
  mintBaseUrl: string;
  coinValue: AmountJson;
}

export interface Coin {
  coinPub: string;
  coinPriv: string;
  denomPub: string;
  denomSig: string;
  currentAmount: AmountJson;
  mintBaseUrl: string;
}


@Checkable.Class
export class AmountJson {
  @Checkable.Number
  value: number;

  @Checkable.Number
  fraction: number;

  @Checkable.String
  currency: string;

  static checked: (obj: any) => AmountJson;
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
export class CreateReserveResponse {
  /**
   * Mint URL where the bank should create the reserve.
   * The URL is canonicalized in the response.
   */
  @Checkable.String
  mint: string;

  @Checkable.String
  reservePub: string;

  static checked: (obj: any) => CreateReserveResponse;
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
export class MintInfo {
  @Checkable.String
  master_pub: string;

  @Checkable.String
  url: string;

  static checked: (obj: any) => MintInfo;
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

  @Checkable.List(Checkable.Value(MintInfo))
  mints: MintInfo[];

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

  static checked: (obj: any) => Contract;
}


@Checkable.Class
export class  Offer {
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


interface Reserve {
  mint_base_url: string
  reserve_priv: string;
  reserve_pub: string;
}


export interface Badge {
  setText(s: string): void;
  setColor(c: string): void;
}

type PayCoinInfo = Array<{ updatedCoin: Coin, sig: CoinPaySig }>;


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


/**
 * See http://api.taler.net/wallet.html#general
 */
function canonicalizeBaseUrl(url) {
  let x = new URI(url);
  if (!x.protocol()) {
    x.protocol("https");
  }
  x.path(x.path() + "/").normalizePath();
  x.fragment();
  x.query();
  return x.href()
}


function parsePrettyAmount(pretty: string): AmountJson {
  const res = /([0-9]+)(.[0-9]+)?\s*(\w+)/.exec(pretty);
  if (!res) {
    return null;
  }
  return {
    value: parseInt(res[1], 10),
    fraction: res[2] ? (parseFloat(`0.${res[2]}`) * 1e-6) : 0,
    currency: res[3]
  }
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


function rankDenom(denom1: any, denom2: any) {
  // Slow ... we should find a better way than to convert it evert time.
  let v1 = new native.Amount(denom1.value);
  let v2 = new native.Amount(denom2.value);
  return (-1) * v1.cmp(v2);
}


export class Wallet {
  private db: IDBDatabase;
  private http: HttpRequestLibrary;
  private badge: Badge;

  constructor(db: IDBDatabase, http: HttpRequestLibrary, badge: Badge) {
    this.db = db;
    this.http = http;
    this.badge = badge;
  }

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

      let args: native.DepositRequestPS_Args = {
        h_contract: native.HashCode.fromCrock(offer.H_contract),
        h_wire: native.HashCode.fromCrock(offer.contract.H_wire),
        amount_with_fee: coinSpend.toNbo(),
        coin_pub: native.EddsaPublicKey.fromCrock(cd.coin.coinPub),
        deposit_fee: new native.Amount(cd.denom.fee_deposit).toNbo(),
        merchant: native.EddsaPublicKey.fromCrock(offer.contract.merchant_pub),
        refund_deadline: native.AbsoluteTimeNbo.fromTalerString(offer.contract.refund_deadline),
        timestamp: native.AbsoluteTimeNbo.fromTalerString(offer.contract.timestamp),
        transaction_id: native.UInt64.fromNumber(offer.contract.transaction_id),
      };

      let d = new native.DepositRequestPS(args);

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
   * @param paymentAmount
   * @param depositFeeLimit
   * @param allowedMints
   */
  private getPossibleMintCoins(paymentAmount: AmountJson,
                               depositFeeLimit: AmountJson,
                               allowedMints: MintInfo[]): Promise<MintCoins> {


    let m: MintCoins = {};

    function storeMintCoin(mc) {
      let mint = mc[0];
      let coin = mc[1];
      let cd = {
        coin: coin,
        denom: mint.keys.denoms.find((e) => e.denom_pub === coin.denomPub)
      };
      if (!cd.denom) {
        throw Error("denom not found (database inconsistent)");
      }
      let x = m[mint.baseUrl];
      if (!x) {
        m[mint.baseUrl] = [cd];
      } else {
        x.push(cd);
      }
    }

    let ps = allowedMints.map((info) => {
      return Query(this.db)
        .iter("mints", {indexName: "pubKey", only: info.master_pub})
        .indexJoin("coins", "mintBaseUrl", (mint) => mint.baseUrl)
        .reduce(storeMintCoin);
    });

    return Promise.all(ps).then(() => {
      let ret: MintCoins = {};

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
      .finish();
  }


  /**
   * Add a contract to the wallet and sign coins,
   * but do not send them yet.
   */
  confirmPay(offer: Offer): Promise<any> {
    return Promise.resolve().then(() => {
      return this.getPossibleMintCoins(offer.contract.amount,
                                       offer.contract.max_fee,
                                       offer.contract.mints)
    }).then((mcs) => {
      if (Object.keys(mcs).length == 0) {
        return {
          error: "coins-insufficient",
        };
      }
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
          console.error("Failed to deplete reserve", e.stack);
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


  private withdrawPrepare(denom: Denomination,
                          reserve: Reserve): Promise<PreCoin> {
    let reservePriv = new native.EddsaPrivateKey();
    reservePriv.loadCrock(reserve.reserve_priv);
    let reservePub = new native.EddsaPublicKey();
    reservePub.loadCrock(reserve.reserve_pub);
    let denomPub = native.RsaPublicKey.fromCrock(denom.denom_pub);
    let coinPriv = native.EddsaPrivateKey.create();
    let coinPub = coinPriv.getPublicKey();
    let blindingFactor = native.RsaBlindingKey.create(1024);
    let pubHash: native.HashCode = coinPub.hash();
    let ev: native.ByteArray = native.rsaBlind(pubHash,
                                               blindingFactor,
                                               denomPub);

    if (!denom.fee_withdraw) {
      throw Error("Field fee_withdraw missing");
    }

    let amountWithFee = new native.Amount(denom.value);
    amountWithFee.add(new native.Amount(denom.fee_withdraw));
    let withdrawFee = new native.Amount(denom.fee_withdraw);

    // Signature
    let withdrawRequest = new native.WithdrawRequestPS({
      reserve_pub: reservePub,
      amount_with_fee: amountWithFee.toNbo(),
      withdraw_fee: withdrawFee.toNbo(),
      h_denomination_pub: denomPub.encode().hash(),
      h_coin_envelope: ev.hash()
    });

    var sig = native.eddsaSign(withdrawRequest.toPurpose(), reservePriv);

    let preCoin: PreCoin = {
      reservePub: reservePub.toCrock(),
      blindingKey: blindingFactor.toCrock(),
      coinPub: coinPub.toCrock(),
      coinPriv: coinPriv.toCrock(),
      denomPub: denomPub.encode().toCrock(),
      mintBaseUrl: reserve.mint_base_url,
      withdrawSig: sig.toCrock(),
      coinEv: ev.toCrock(),
      coinValue: denom.value
    };

    return Query(this.db).put("precoins", preCoin).finish().then(() => preCoin);
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


  updateBadge() {
    function countNonEmpty(c, n) {
      if (c.currentAmount.fraction != 0 || c.currentAmount.value != 0) {
        return n + 1;
      }
      return n;
    }

    function doBadge(n) {
      this.badge.setText(n.toString());
      this.badge.setColor("#0F0");
    }

    Query(this.db)
      .iter("coins")
      .reduce(countNonEmpty, 0)
      .then(doBadge.bind(this));
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
        this.updateBadge();
      });
  }


  private withdraw(denom, reserve): Promise<void> {
    return this.withdrawPrepare(denom, reserve)
               .then((pc) => this.withdrawExecute(pc))
               .then((c) => this.storeCoin(c));
  }


  /**
   * Withdraw coins from a reserve until it is empty.
   */
  private depleteReserve(reserve, mint: Mint): Promise<void> {
    let denoms: Denomination[] = copy(mint.keys.denoms);
    let remaining = new native.Amount(reserve.current_amount);

    denoms = denoms.filter(isWithdrawableDenom);

    denoms.sort(rankDenom);
    let workList = [];
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
        workList.push(d);
      }
      if (!found) {
        console.log("did not find coins for remaining ", remaining.toJson());
        break;
      }
    }

    return new Promise<void>((resolve, reject) => {
      // Do the request one by one.
      let next = () => {
        if (workList.length == 0) {
          resolve();
          return;
        }
        let d = workList.pop();
        console.log("withdrawing", JSON.stringify(d));
        this.withdraw(d, reserve)
            .then(() => next())
            .catch((e) => {
              console.log("Failed to withdraw coin", e.stack);
              reject();
            });
      };

      // Asynchronous recursion
      next();
    });
  }


  private updateReserve(reservePub: string, mint): Promise<Reserve> {
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


  /**
   * Update or add mint DB entry by fetching the /keys information.
   * Optionally link the reserve entry to the new or existing
   * mint entry in then DB.
   */
  private updateMintFromUrl(baseUrl): Promise<Mint> {
    let reqUrl = URI("keys").absoluteTo(baseUrl);
    return this.http.get(reqUrl).then((resp) => {
      if (resp.status != 200) {
        throw Error("/keys request failed");
      }
      let mintKeysJson = JSON.parse(resp.responseText);
      if (!mintKeysJson) {
        throw new RequestException({url: reqUrl, hint: "keys invalid"});
      }
      let mint: Mint = {
        baseUrl: baseUrl,
        keys: mintKeysJson
      };
      return Query(this.db).put("mints", mint).finish().then(() => mint);
    });
  }


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


  getHistory() {
    function collect(x, acc) {
      acc.push(x);
      return acc;
    }

    return Query(this.db)
      .iter("history", {indexName: "timestamp"})
      .reduce(collect, [])
  }
}