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


/// <reference path="../decl/urijs/URIjs.d.ts" />
/// <reference path="../decl/chrome/chrome.d.ts" />
"use strict";

@Checkable.Class
class AmountJson {
  @Checkable.Number
  value: number;

  @Checkable.Number
  fraction: number;

  @Checkable.String
  currency: string;

  static check: (v: any) => AmountJson;
}


@Checkable.Class
class CoinPaySig {
  @Checkable.String
  coin_sig: string;

  @Checkable.String
  coin_pub: string;

  @Checkable.String
  ub_sig: string;

  @Checkable.String
  denom_pub: string;

  @Checkable.Value(AmountJson)
  f: AmountJson;

  static check: (v: any) => CoinPaySig;
}

interface AmountJson_interface {
  value: number;
  fraction: number
  currency: string;
}

interface ConfirmPayRequest {
  merchantPageUrl: string;
  offer: Offer;
}

interface MintCoins {
  [mintUrl: string]: Db.CoinWithDenom[];
}


interface MintInfo {
  master_pub: string;
  url: string;
}

interface Offer {
  contract: Contract;
  sig: string;
  H_contract: string;
  pay_url: string;
  exec_url: string;
}

interface Contract {
  H_wire: string;
  amount: AmountJson_interface;
  auditors: string[];
  expiry: string,
  locations: string[];
  max_fee: AmountJson_interface;
  merchant: any;
  merchant_pub: string;
  mints: MintInfo[];
  products: string[];
  refund_deadline: string;
  timestamp: string;
  transaction_id: number;
}


interface CoinPaySig_interface {
  coin_sig: string;
  coin_pub: string;
  ub_sig: string;
  denom_pub: string;
  f: AmountJson_interface;
}


interface Transaction {
  contractHash: string;
  contract: any;
  payUrl: string;
  payReq: any;
}


interface Reserve {
  mint_base_url: string
  reserve_priv: string;
  reserve_pub: string;
}


type PayCoinInfo = Array<{ updatedCoin: Db.Coin, sig: CoinPaySig_interface }>;


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


function signDeposit(db: IDBDatabase,
                     offer: Offer,
                     cds: Db.CoinWithDenom[]): PayCoinInfo {
  let ret = [];
  let amountSpent = Amount.getZero(cds[0].coin.currentAmount.currency);
  let amountRemaining = new Amount(offer.contract.amount);
  cds = copy(cds);
  for (let cd of cds) {
    let coinSpend;

    if (amountRemaining.value == 0 && amountRemaining.fraction == 0) {
      break;
    }

    if (amountRemaining.cmp(new Amount(cd.coin.currentAmount)) < 0) {
      coinSpend = new Amount(amountRemaining.toJson());
    } else {
      coinSpend = new Amount(cd.coin.currentAmount);
    }

    amountSpent.add(coinSpend);
    amountRemaining.sub(coinSpend);

    let newAmount = new Amount(cd.coin.currentAmount);
    newAmount.sub(coinSpend);
    cd.coin.currentAmount = newAmount.toJson();

    let args: DepositRequestPS_Args = {
      h_contract: HashCode.fromCrock(offer.H_contract),
      h_wire: HashCode.fromCrock(offer.contract.H_wire),
      amount_with_fee: coinSpend.toNbo(),
      coin_pub: EddsaPublicKey.fromCrock(cd.coin.coinPub),
      deposit_fee: new Amount(cd.denom.fee_deposit).toNbo(),
      merchant: EddsaPublicKey.fromCrock(offer.contract.merchant_pub),
      refund_deadline: AbsoluteTimeNbo.fromTalerString(offer.contract.refund_deadline),
      timestamp: AbsoluteTimeNbo.fromTalerString(offer.contract.timestamp),
      transaction_id: UInt64.fromNumber(offer.contract.transaction_id),
    };

    let d = new DepositRequestPS(args);

    let coinSig = eddsaSign(d.toPurpose(),
                            EddsaPrivateKey.fromCrock(cd.coin.coinPriv))
      .toCrock();

    let s: CoinPaySig_interface = {
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
 * @param db
 * @param paymentAmount
 * @param depositFeeLimit
 * @param allowedMints
 */
function getPossibleMintCoins(db: IDBDatabase,
                              paymentAmount: AmountJson_interface,
                              depositFeeLimit: AmountJson_interface,
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
    return Query(db)
      .iterIndex("mints", "pubKey", info.master_pub)
      .indexJoin("coins", "mintBaseUrl", (mint) => mint.baseUrl)
      .reduce(storeMintCoin);
  });

  return Promise.all(ps).then(() => {
    let ret: MintCoins = {};

    nextMint:
      for (let key in m) {
        let coins = m[key].map((x) => ({
          a: new Amount(x.denom.fee_deposit),
          c: x
        }));
        // Sort by ascending deposit fee
        coins.sort((o1, o2) => o1.a.cmp(o2.a));
        let maxFee = new Amount(depositFeeLimit);
        let minAmount = new Amount(paymentAmount);
        let accFee = new Amount(coins[0].c.denom.fee_deposit);
        let accAmount = Amount.getZero(coins[0].c.coin.currentAmount.currency);
        let usableCoins: Db.CoinWithDenom[] = [];
        nextCoin:
          for (let i = 0; i < coins.length; i++) {
            let coinAmount = new Amount(coins[i].c.coin.currentAmount);
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


function executePay(db,
                    offer: Offer,
                    payCoinInfo: PayCoinInfo,
                    merchantBaseUrl: string,
                    chosenMint: string): Promise<void> {
  let payReq = {};
  payReq["H_wire"] = offer.contract.H_wire;
  payReq["H_contract"] = offer.H_contract;
  payReq["transaction_id"] = offer.contract.transaction_id;
  payReq["refund_deadline"] = offer.contract.refund_deadline;
  payReq["mint"] = URI(chosenMint).href();
  payReq["coins"] = payCoinInfo.map((x) => x.sig);
  payReq["timestamp"] = offer.contract.timestamp;
  let payUrl = URI(offer.pay_url).absoluteTo(merchantBaseUrl);
  let t: Transaction = {
    contractHash: offer.H_contract,
    contract: offer.contract,
    payUrl: payUrl.href(),
    payReq: payReq
  };

  return Query(db)
    .put("transactions", t)
    .putAll("coins", payCoinInfo.map((pci) => pci.updatedCoin))
    .finish();
}


function confirmPayHandler(db, detail: ConfirmPayRequest, sendResponse) {
  let offer: Offer = detail.offer;
  getPossibleMintCoins(db,
                       offer.contract.amount,
                       offer.contract.max_fee,
                       offer.contract.mints)
    .then((mcs) => {
      if (Object.keys(mcs).length == 0) {
        sendResponse({error: "Not enough coins."});
        return;
      }
      let mintUrl = Object.keys(mcs)[0];
      let ds = signDeposit(db, offer, mcs[mintUrl]);
      return executePay(db, offer, ds, detail.merchantPageUrl, mintUrl)
        .then(() => {
          sendResponse({
                         success: true,
                       });
        });
    });
  return true;
}


function doPaymentHandler(db, detail, sendResponse) {
  let H_contract = detail.H_contract;
  Query(db)
    .get("transactions", H_contract)
    .then((r) => {
      if (!r) {
        sendResponse({success: false, error: "contract not found"});
        return;
      }
      sendResponse({
                     success: true,
                     payUrl: r.payUrl,
                     payReq: r.payReq
                   });
    });
  // async sendResponse
  return true;
}


function confirmReserveHandler(db, detail, sendResponse) {
  let reservePriv = EddsaPrivateKey.create();
  let reservePub = reservePriv.getPublicKey();
  let form = new FormData();
  let now = (new Date()).toString();
  form.append(detail.field_amount, detail.amount_str);
  form.append(detail.field_reserve_pub, reservePub.toCrock());
  form.append(detail.field_mint, detail.mint);
  // XXX: set bank-specified fields.
  let mintBaseUrl = canonicalizeBaseUrl(detail.mint);
  httpPostForm(detail.post_url, form)
    .then((hresp) => {
      // TODO: extract as interface
      let resp = {
        status: hresp.status,
        text: hresp.responseText,
        success: undefined,
        backlink: undefined
      };
      let reserveRecord = {
        reserve_pub: reservePub.toCrock(),
        reserve_priv: reservePriv.toCrock(),
        mint_base_url: mintBaseUrl,
        created: now,
        last_query: null,
        current_amount: null,
        // XXX: set to actual amount
        initial_amount: null
      };

      if (hresp.status != 200) {
        resp.success = false;
        return resp;
      }

      resp.success = true;
      // We can't show the page directly, so
      // we show some generic page from the wallet.
      // TODO: this should not be webextensions-specific
      resp.backlink = chrome.extension.getURL("pages/reserve-success.html");
      return Query(db)
        .put("reserves", reserveRecord)
        .finish()
        .then(() => {
          // Do this in the background
          updateMintFromUrl(db, reserveRecord.mint_base_url)
            .then((mint) =>
              updateReserve(db, reservePub, mint)
                .then((reserve) => depleteReserve(db, reserve, mint))
            );
          return resp;
        });
    })
    .then((resp) => {
      sendResponse(resp);
    });

  // Allow async response
  return true;
}


function copy(o) {
  return JSON.parse(JSON.stringify(o));
}


function rankDenom(denom1: any, denom2: any) {
  // Slow ... we should find a better way than to convert it evert time.
  let v1 = new Amount(denom1.value);
  let v2 = new Amount(denom2.value);
  return (-1) * v1.cmp(v2);
}


function withdrawPrepare(db: IDBDatabase,
                         denom: Db.Denomination,
                         reserve: Reserve): Promise<Db.PreCoin> {
  let reservePriv = new EddsaPrivateKey();
  reservePriv.loadCrock(reserve.reserve_priv);
  let reservePub = new EddsaPublicKey();
  reservePub.loadCrock(reserve.reserve_pub);
  let denomPub = RsaPublicKey.fromCrock(denom.denom_pub);
  let coinPriv = EddsaPrivateKey.create();
  let coinPub = coinPriv.getPublicKey();
  let blindingFactor = RsaBlindingKey.create(1024);
  let pubHash: HashCode = coinPub.hash();
  let ev: ByteArray = rsaBlind(pubHash, blindingFactor, denomPub);

  if (!denom.fee_withdraw) {
    throw Error("Field fee_withdraw missing");
  }

  let amountWithFee = new Amount(denom.value);
  amountWithFee.add(new Amount(denom.fee_withdraw));
  let withdrawFee = new Amount(denom.fee_withdraw);

  // Signature
  let withdrawRequest = new WithdrawRequestPS({
    reserve_pub: reservePub,
    amount_with_fee: amountWithFee.toNbo(),
    withdraw_fee: withdrawFee.toNbo(),
    h_denomination_pub: denomPub.encode().hash(),
    h_coin_envelope: ev.hash()
  });

  var sig = eddsaSign(withdrawRequest.toPurpose(), reservePriv);

  let preCoin: Db.PreCoin = {
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

  return Query(db).put("precoins", preCoin).finish().then(() => preCoin);
}


function withdrawExecute(db, pc: Db.PreCoin): Promise<Db.Coin> {
  return Query(db)
    .get("reserves", pc.reservePub)
    .then((r) => {
      let wd: any = {};
      wd.denom_pub = pc.denomPub;
      wd.reserve_pub = pc.reservePub;
      wd.reserve_sig = pc.withdrawSig;
      wd.coin_ev = pc.coinEv;
      let reqUrl = URI("reserve/withdraw").absoluteTo(r.mint_base_url);
      return httpPostJson(reqUrl, wd);
    })
    .then(resp => {
      if (resp.status != 200) {
        throw new RequestException({
          hint: "Withdrawal failed",
          status: resp.status
        });
      }
      let r = JSON.parse(resp.responseText);
      let denomSig = rsaUnblind(RsaSignature.fromCrock(r.ev_sig),
                                RsaBlindingKey.fromCrock(pc.blindingKey),
                                RsaPublicKey.fromCrock(pc.denomPub));
      let coin: Db.Coin = {
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


function updateBadge(db) {
  function countNonEmpty(c, n) {
    if (c.currentAmount.fraction != 0 || c.currentAmount.value != 0) {
      return n + 1;
    }
    return n;
  }

  function doBadge(n) {
    chrome.browserAction.setBadgeText({text: "" + n});
    chrome.browserAction.setBadgeBackgroundColor({color: "#0F0"});
  }

  Query(db)
    .iter("coins")
    .reduce(countNonEmpty, 0)
    .then(doBadge);
}


function storeCoin(db, coin: Db.Coin) {
  Query(db)
    .delete("precoins", coin.coinPub)
    .add("coins", coin)
    .finish()
    .then(() => {
      updateBadge(db);
    });
}


function withdraw(db, denom, reserve): Promise<void> {
  return withdrawPrepare(db, denom, reserve)
    .then((pc) => withdrawExecute(db, pc))
    .then((c) => storeCoin(db, c));
}


/**
 * Withdraw coins from a reserve until it is empty.
 */
function depleteReserve(db, reserve, mint): void {
  let denoms = copy(mint.keys.denoms);
  let remaining = new Amount(reserve.current_amount);
  denoms.sort(rankDenom);
  let workList = [];
  for (let i = 0; i < 1000; i++) {
    let found = false;
    for (let d of denoms) {
      let cost = new Amount(d.value);
      cost.add(new Amount(d.fee_withdraw));
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

  // Do the request one by one.
  function next(): void {
    if (workList.length == 0) {
      return;
    }
    let d = workList.pop();
    withdraw(db, d, reserve)
      .then(() => next());
  }

  next();
}


function updateReserve(db: IDBDatabase,
                       reservePub: EddsaPublicKey,
                       mint): Promise<Reserve> {
  let reservePubStr = reservePub.toCrock();
  return Query(db)
    .get("reserves", reservePubStr)
    .then((reserve) => {
      let reqUrl = URI("reserve/status").absoluteTo(mint.baseUrl);
      reqUrl.query({'reserve_pub': reservePubStr});
      return httpGet(reqUrl).then(resp => {
        if (resp.status != 200) {
          throw Error();
        }
        let reserveInfo = JSON.parse(resp.responseText);
        if (!reserveInfo) {
          throw Error();
        }
        reserve.current_amount = reserveInfo.balance;
        return Query(db)
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
function updateMintFromUrl(db, baseUrl) {
  let reqUrl = URI("keys").absoluteTo(baseUrl);
  return httpGet(reqUrl).then((resp) => {
    if (resp.status != 200) {
      throw Error("/keys request failed");
    }
    let mintKeysJson = JSON.parse(resp.responseText);
    if (!mintKeysJson) {
      throw new RequestException({url: reqUrl, hint: "keys invalid"});
    }
    let mint: Db.Mint = {
      baseUrl: baseUrl,
      keys: mintKeysJson
    };
    return Query(db).put("mints", mint).finish().then(() => mint);
  });
}


function getBalances(db): Promise<any> {
  function collectBalances(c: Db.Coin, byCurrency) {
    let acc: AmountJson_interface = byCurrency[c.currentAmount.currency];
    if (!acc) {
      acc = Amount.getZero(c.currentAmount.currency).toJson();
    }
    let am = new Amount(c.currentAmount);
    am.add(new Amount(acc));
    byCurrency[c.currentAmount.currency] = am.toJson();
    return byCurrency;
  }

  return Query(db)
    .iter("coins")
    .reduce(collectBalances, {});
}
