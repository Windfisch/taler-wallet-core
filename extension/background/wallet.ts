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

/// <reference path="../decl/urijs/URIjs.d.ts" />
/// <reference path="../decl/chrome/chrome.d.ts" />
'use strict';


interface AmountJson {
  value: number;
  fraction: number;
  currency: string;
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


interface ConfirmPayRequest {
  merchantPageUrl: string;
  offer: Offer;
}

interface MintCoins {
  [mintUrl: string]: Db.CoinWithDenom[];
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
  amount: AmountJson;
  auditors: string[];
  expiry: string,
  locations: string[];
  max_fee: AmountJson;
  merchant: any;
  merchant_pub: string;
  mints: MintInfo[];
  products: string[];
  refund_deadline: string;
  timestamp: string;
  transaction_id: number;
}


interface CoinPaySig {
  coin_sig: string;
  coin_pub: string;
  ub_sig: string;
  denom_pub: string;
  f: AmountJson;
}


type PayCoinInfo = Array<{ updatedCoin: Db.Coin, sig: CoinPaySig }>;


function signDeposit(db: IDBDatabase,
                     offer: Offer,
                     cds: Db.CoinWithDenom[]): PayCoinInfo {
  let ret = [];
  let amountSpent = Amount.getZero(cds[0].coin.currentAmount.currency);
  let amountRemaining = new Amount(offer.contract.amount);
  cds = copy(cds);
  for (let cd of cds) {
    let coinSpend;

    console.log("amount remaining:", amountRemaining.toJson());

    if (amountRemaining.value == 0 && amountRemaining.fraction == 0) {
      console.log("full amount spent");
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

    console.log("Deposit request #" + ret.length);
    console.log("DepositRequestPS: \n", d.toJson());
    console.log("DepositRequestPS sig: \n", d.toPurpose().hexdump());

    let coinSig = eddsaSign(d.toPurpose(),
                            EddsaPrivateKey.fromCrock(cd.coin.coinPriv))
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

interface MintInfo {
  master_pub: string;
  url: string;
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
                              paymentAmount: AmountJson,
                              depositFeeLimit: AmountJson,
                              allowedMints: MintInfo[]): Promise<MintCoins> {
  return new Promise((resolve, reject) => {
    let m: MintCoins = {};
    let found = false;
    let tx = db.transaction(["mints", "coins"]);
    // First pass: Get all coins from acceptable mints.
    for (let info of allowedMints) {
      let req_mints = tx.objectStore("mints")
                        .index("pubKey")
                        .get(info.master_pub);
      req_mints.onsuccess = (e) => {
        let mint: Db.Mint = req_mints.result;
        if (!mint) {
          // We don't have that mint ...
          return;
        }
        let req_coins = tx.objectStore("coins")
                          .index("mintBaseUrl")
                          .openCursor(IDBKeyRange.only(mint.baseUrl));
        req_coins.onsuccess = (e) => {
          let cursor: IDBCursorWithValue = req_coins.result;
          if (!cursor) {
            return;
          }
          let value: Db.Coin = cursor.value;
          let cd = {
            coin: cursor.value,
            denom: mint.keys.denoms.find((e) => e.denom_pub === value.denomPub)
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
          cursor.continue();
        }
      }
    }

    tx.oncomplete = (e) => {
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
          console.log(format("mint {0}: acc {1} is not enough for {2}",
                             key,
                             JSON.stringify(accAmount.toJson()),
                             JSON.stringify(minAmount.toJson())));
        }
      resolve(ret);
    };

    tx.onerror = (e) => {
      reject();
    }
  });
}


interface Transaction {
  contractHash: string;
  contract: any;
  payUrl: string;
  payReq: any;
}


function executePay(db,
                    offer: Offer,
                    payCoinInfo: PayCoinInfo,
                    merchantBaseUrl: string,
                    chosenMint: string) {
  return new Promise((resolve, reject) => {
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
    let tx = db.transaction(["transactions", "coins"], "readwrite");
    tx.objectStore('transactions').put(t);
    for (let c of payCoinInfo) {
      tx.objectStore("coins").put(c.updatedCoin);
    }
    tx.oncomplete = (e) => {
      updateBadge(db);
      resolve();
    };
  });
}


function confirmPay(db, detail: ConfirmPayRequest, sendResponse) {
  console.log("confirmPay", JSON.stringify(detail));
  let tx = db.transaction(['transactions'], 'readwrite');
  let trans = {
    contractHash: detail.offer.H_contract,
    contract: detail.offer.contract,
    sig: detail.offer
  };

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
      return executePay(db, offer, ds, detail.merchantPageUrl, mintUrl);
    })
    .then(() => {
      sendResponse({
                     success: true,
                   });
    });
  return true;
}


function doPayment(db, detail, sendResponse) {
  let H_contract = detail.H_contract;
  let req = db.transaction(['transactions'])
              .objectStore("transactions")
              .get(H_contract);
  console.log("executing contract", H_contract);
  req.onsuccess = (e) => {
    console.log("got db response for existing contract");
    if (!req.result) {
      sendResponse({success: false, error: "contract not found"});
      return;
    }
    sendResponse({
                   success: true,
                   payUrl: req.result.payUrl,
                   payReq: req.result.payReq
                 });
  };
  return true;
}


function confirmReserve(db, detail, sendResponse) {
  let reservePriv = EddsaPrivateKey.create();
  let reservePub = reservePriv.getPublicKey();
  let form = new FormData();
  let now = (new Date()).toString();
  form.append(detail.field_amount, detail.amount_str);
  form.append(detail.field_reserve_pub, reservePub.toCrock());
  form.append(detail.field_mint, detail.mint);
  // XXX: set bank-specified fields.
  let myRequest = new XMLHttpRequest();
  console.log("making request to " + detail.post_url);
  myRequest.open('post', detail.post_url);
  myRequest.send(form);
  let mintBaseUrl = canonicalizeBaseUrl(detail.mint);
  myRequest.addEventListener('readystatechange', (e) => {
    if (myRequest.readyState == XMLHttpRequest.DONE) {
      // TODO: extract as interface
      let resp = {
        status: myRequest.status,
        text: myRequest.responseText,
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
      // XXX: insert into db.
      switch (myRequest.status) {
        case 200:
          resp.success = true;
          // We can't show the page directly, so
          // we show some generic page from the wallet.
          resp.backlink = chrome.extension.getURL("pages/reserve-success.html");
          let tx = db.transaction(['reserves'], 'readwrite');
          tx.objectStore('reserves').add(reserveRecord);
          tx.addEventListener('complete', (e) => {
            console.log('tx complete, pk was ' + reserveRecord.reserve_pub);
            sendResponse(resp);
            var mint;
            updateMintFromUrl(db, reserveRecord.mint_base_url)
              .then((m) => {
                mint = m;
                return updateReserve(db, reservePub, mint);
              })
              .then((reserve) => depleteReserve(db, reserve, mint));
          });
          break;
        default:
          resp.success = false;
          sendResponse(resp);
      }
    }
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


interface Reserve {
  mint_base_url: string
  reserve_priv: string;
  reserve_pub: string;
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

  console.log("about to sign");
  var sig = eddsaSign(withdrawRequest.toPurpose(), reservePriv);
  console.log("signed");

  console.log("crypto done, doing request");

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

  console.log("storing precoin", JSON.stringify(preCoin));

  let tx = db.transaction(['precoins'], 'readwrite');
  tx.objectStore('precoins').add(preCoin);
  return new Promise((resolve, reject) => {
    tx.oncomplete = (e) => {
      resolve(preCoin);
    }
  });
}


function dbGet(db, store: string, key: any): Promise<any> {
  let tx = db.transaction([store]);
  let req = tx.objectStore(store).get(key);
  return new Promise((resolve, reject) => {
    req.onsuccess = (e) => resolve(req.result);
  });
}


function withdrawExecute(db, pc: Db.PreCoin): Promise<Db.Coin> {
  return dbGet(db, 'reserves', pc.reservePub)
    .then((r) => new Promise((resolve, reject) => {
      console.log("loading precoin", JSON.stringify(pc));
      let wd: any = {};
      wd.denom_pub = pc.denomPub;
      wd.reserve_pub = pc.reservePub;
      wd.reserve_sig = pc.withdrawSig;
      wd.coin_ev = pc.coinEv;
      let reqUrl = URI("reserve/withdraw").absoluteTo(r.mint_base_url);
      let myRequest = new XMLHttpRequest();
      console.log("making request to " + reqUrl.href());
      myRequest.open('post', reqUrl.href());
      myRequest.setRequestHeader("Content-Type",
                                 "application/json;charset=UTF-8");
      myRequest.send(JSON.stringify(wd));
      myRequest.addEventListener('readystatechange', (e) => {
        if (myRequest.readyState == XMLHttpRequest.DONE) {
          if (myRequest.status != 200) {
            console.log("Withdrawal failed, status ", myRequest.status);
            reject();
            return;
          }
          console.log("Withdrawal successful");
          console.log(myRequest.responseText);
          let resp = JSON.parse(myRequest.responseText);
          let denomSig = rsaUnblind(RsaSignature.fromCrock(resp.ev_sig),
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
          console.log("unblinded coin");
          resolve(coin);
        } else {
          console.log("ready state change to", myRequest.status);
        }
      });
    }));
}


function updateBadge(db) {
  let tx = db.transaction(['coins'], 'readwrite');
  let req = tx.objectStore('coins').openCursor();
  let n = 0;
  req.onsuccess = (e) => {
    let cursor = req.result;
    if (cursor) {
      let c: Db.Coin = cursor.value;
      if (c.currentAmount.fraction != 0 || c.currentAmount.value != 0) {
        n++;
      }
      cursor.continue();
    } else {
      chrome.browserAction.setBadgeText({text: "" + n});
      chrome.browserAction.setBadgeBackgroundColor({color: "#0F0"});
    }
  }
}


function storeCoin(db, coin: Db.Coin) {
  let tx = db.transaction(['coins', 'precoins'], 'readwrite');
  tx.objectStore('precoins').delete(coin.coinPub);
  tx.objectStore('coins').add(coin);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = (e) => {
      resolve();
      updateBadge(db);
    }
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
function depleteReserve(db, reserve, mint) {
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


function updateReserve(db, reservePub: EddsaPublicKey, mint) {
  let reserve;
  return new Promise((resolve, reject) => {
    let tx = db.transaction(['reserves']);
    tx.objectStore('reserves').get(reservePub.toCrock()).onsuccess = (e) => {
      let reserve = e.target.result;
      let reqUrl = URI("reserve/status").absoluteTo(mint.baseUrl);
      reqUrl.query({'reserve_pub': reservePub.toCrock()});
      let myRequest = new XMLHttpRequest();
      console.log("making request to " + reqUrl.href());
      myRequest.open('get', reqUrl.href());
      myRequest.send();
      myRequest.addEventListener('readystatechange', (e) => {
        if (myRequest.readyState == XMLHttpRequest.DONE) {
          if (myRequest.status != 200) {
            reject();
            return;
          }
          let reserveInfo = JSON.parse(myRequest.responseText);
          console.log("got response " + JSON.stringify(reserveInfo));
          reserve.current_amount = reserveInfo.balance;
          let tx = db.transaction(['reserves'], 'readwrite');
          console.log("putting updated reserve " + JSON.stringify(reserve));
          tx.objectStore('reserves').put(reserve);
          tx.oncomplete = (e) => {
            resolve(reserve);
          };
        }
      });
    };
  });

}


/**
 * Update or add mint DB entry by fetching the /keys information.
 * Optionally link the reserve entry to the new or existing
 * mint entry in then DB.
 */
function updateMintFromUrl(db, baseUrl) {
  console.log("base url is " + baseUrl);
  let reqUrl = URI("keys").absoluteTo(baseUrl);
  let myRequest = new XMLHttpRequest();
  myRequest.open('get', reqUrl.href());
  myRequest.send();
  return new Promise((resolve, reject) => {
    myRequest.addEventListener('readystatechange', (e) => {
      console.log("state change to " + myRequest.readyState);
      if (myRequest.readyState == XMLHttpRequest.DONE) {
        if (myRequest.status == 200) {
          console.log("got /keys");
          let mintKeysJson = JSON.parse(myRequest.responseText);
          if (!mintKeysJson) {
            console.log("keys invalid");
            reject();
          } else {
            let mint: Db.Mint = {
              baseUrl: baseUrl,
              keys: mintKeysJson
            };
            let tx = db.transaction(['mints', 'denoms'], 'readwrite');
            tx.objectStore('mints').put(mint);
            for (let d of mintKeysJson.denoms) {
              // TODO: verify and complete
              let di = {
                denomPub: d.denom_pub,
                value: d.value
              };
              tx.objectStore('denoms').put(di);
            }
            tx.oncomplete = (e) => {
              resolve(mint);
            };
          }
        } else {
          console.log("/keys request failed with status " + myRequest.status);
          // XXX: also write last error to DB to show in the UI
          reject();
        }
      }
    });
  });
}


function dumpDb(db, detail, sendResponse) {
  let dump = {
    name: db.name,
    version: db.version,
    stores: {}
  };
  console.log("stores: " + JSON.stringify(db.objectStoreNames));
  let tx = db.transaction(db.objectStoreNames);
  tx.addEventListener('complete', (e) => {
    sendResponse(dump);
  });
  for (let i = 0; i < db.objectStoreNames.length; i++) {
    let name = db.objectStoreNames[i];
    let storeDump = {};
    dump.stores[name] = storeDump;
    let store = tx.objectStore(name)
                  .openCursor()
                  .addEventListener('success', (e) => {
                    let cursor = e.target.result;
                    if (cursor) {
                      storeDump[cursor.key] = cursor.value;
                      cursor.continue();
                    }
                  });
  }
  return true;
}


// Just for debugging.
function reset(db, detail, sendResponse) {
  let tx = db.transaction(db.objectStoreNames, 'readwrite');
  for (let i = 0; i < db.objectStoreNames.length; i++) {
    tx.objectStore(db.objectStoreNames[i]).clear();
  }
  indexedDB.deleteDatabase(DB_NAME);
  chrome.browserAction.setBadgeText({text: ""});
  console.log("reset done");
  return false;
}


function balances(db, detail, sendResponse) {
  let byCurrency = {};
  let tx = db.transaction(['coins', 'denoms']);
  let req = tx.objectStore('coins').openCursor();
  req.onsuccess = (e) => {
    let cursor = req.result;
    if (cursor) {
      let c: Db.Coin = cursor.value;
      tx.objectStore('denoms').get(c.denomPub).onsuccess = (e2) => {
        let d = e2.target.result;
        let acc = byCurrency[d.value.currency];
        if (!acc) {
          acc = Amount.getZero(c.currentAmount.currency);
        }
        let am = new Amount(c.currentAmount);
        am.add(new Amount(acc));
        byCurrency[d.value.currency] = am.toJson();
        console.log("counting", byCurrency[d.value.currency]);
      };
      cursor.continue();
    } else {
      sendResponse(byCurrency);
    }
  };
  return true;
}

chrome.browserAction.setBadgeText({text: ""});

openTalerDb().then((db) => {
  console.log("db loaded");
  updateBadge(db);
  chrome.runtime.onMessage.addListener(
    function(req, sender, onresponse) {
      let dispatch = {
        "confirm-reserve": confirmReserve,
        "confirm-pay": confirmPay,
        "dump-db": dumpDb,
        "balances": balances,
        "execute-payment": doPayment,
        "reset": reset
      };
      if (req.type in dispatch) {
        return dispatch[req.type](db, req.detail, onresponse);
      }
      console.error(format("Request type {1} unknown, req {0}",
                           JSON.stringify(req),
                           req.type));
      return false;
    });
});
