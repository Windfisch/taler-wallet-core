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
'use strict';
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
    return x.href();
}
function signDeposit(db, offer, cds) {
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
        }
        else {
            coinSpend = new Amount(cd.coin.currentAmount);
        }
        amountSpent.add(coinSpend);
        amountRemaining.sub(coinSpend);
        let newAmount = new Amount(cd.coin.currentAmount);
        newAmount.sub(coinSpend);
        cd.coin.currentAmount = newAmount.toJson();
        let args = {
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
        let coinSig = eddsaSign(d.toPurpose(), EddsaPrivateKey.fromCrock(cd.coin.coinPriv))
            .toCrock();
        let s = {
            coin_sig: coinSig,
            coin_pub: cd.coin.coinPub,
            ub_sig: cd.coin.denomSig,
            denom_pub: cd.coin.denomPub,
            f: coinSpend.toJson(),
        };
        ret.push({ sig: s, updatedCoin: cd.coin });
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
function getPossibleMintCoins(db, paymentAmount, depositFeeLimit, allowedMints) {
    return new Promise((resolve, reject) => {
        let m = {};
        let found = false;
        let tx = db.transaction(["mints", "coins"]);
        // First pass: Get all coins from acceptable mints.
        for (let info of allowedMints) {
            let req_mints = tx.objectStore("mints")
                .index("pubKey")
                .get(info.master_pub);
            req_mints.onsuccess = (e) => {
                let mint = req_mints.result;
                if (!mint) {
                    // We don't have that mint ...
                    return;
                }
                let req_coins = tx.objectStore("coins")
                    .index("mintBaseUrl")
                    .openCursor(IDBKeyRange.only(mint.baseUrl));
                req_coins.onsuccess = (e) => {
                    let cursor = req_coins.result;
                    if (!cursor) {
                        return;
                    }
                    let value = cursor.value;
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
                    }
                    else {
                        x.push(cd);
                    }
                    cursor.continue();
                };
            };
        }
        tx.oncomplete = (e) => {
            let ret = {};
            nextMint: for (let key in m) {
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
                let usableCoins = [];
                nextCoin: for (let i = 0; i < coins.length; i++) {
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
            resolve(ret);
        };
        tx.onerror = (e) => {
            reject();
        };
    });
}
function executePay(db, offer, payCoinInfo, merchantBaseUrl, chosenMint) {
    let payReq = {};
    payReq["H_wire"] = offer.contract.H_wire;
    payReq["H_contract"] = offer.H_contract;
    payReq["transaction_id"] = offer.contract.transaction_id;
    payReq["refund_deadline"] = offer.contract.refund_deadline;
    payReq["mint"] = URI(chosenMint).href();
    payReq["coins"] = payCoinInfo.map((x) => x.sig);
    payReq["timestamp"] = offer.contract.timestamp;
    let payUrl = URI(offer.pay_url).absoluteTo(merchantBaseUrl);
    let t = {
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
function confirmPay(db, detail, sendResponse) {
    let offer = detail.offer;
    getPossibleMintCoins(db, offer.contract.amount, offer.contract.max_fee, offer.contract.mints)
        .then((mcs) => {
        if (Object.keys(mcs).length == 0) {
            sendResponse({ error: "Not enough coins." });
            // FIXME: does not work like expected here ...
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
function doPayment(db, detail, sendResponse) {
    let H_contract = detail.H_contract;
    Query(db)
        .get("transactions", H_contract)
        .then((r) => {
        if (!r) {
            sendResponse({ success: false, error: "contract not found" });
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
function rankDenom(denom1, denom2) {
    // Slow ... we should find a better way than to convert it evert time.
    let v1 = new Amount(denom1.value);
    let v2 = new Amount(denom2.value);
    return (-1) * v1.cmp(v2);
}
function withdrawPrepare(db, denom, reserve) {
    let reservePriv = new EddsaPrivateKey();
    reservePriv.loadCrock(reserve.reserve_priv);
    let reservePub = new EddsaPublicKey();
    reservePub.loadCrock(reserve.reserve_pub);
    let denomPub = RsaPublicKey.fromCrock(denom.denom_pub);
    let coinPriv = EddsaPrivateKey.create();
    let coinPub = coinPriv.getPublicKey();
    let blindingFactor = RsaBlindingKey.create(1024);
    let pubHash = coinPub.hash();
    let ev = rsaBlind(pubHash, blindingFactor, denomPub);
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
    let preCoin = {
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
function withdrawExecute(db, pc) {
    return Query(db)
        .get("reserves", pc.reservePub)
        .then((r) => {
        let wd = {};
        wd.denom_pub = pc.denomPub;
        wd.reserve_pub = pc.reservePub;
        wd.reserve_sig = pc.withdrawSig;
        wd.coin_ev = pc.coinEv;
        let reqUrl = URI("reserve/withdraw").absoluteTo(r.mint_base_url);
        return httpPost(reqUrl, wd);
    })
        .then(resp => {
        if (resp.status != 200) {
            throw new RequestException({
                hint: "Withdrawal failed",
                status: resp.status
            });
        }
        let r = JSON.parse(resp.responseText);
        let denomSig = rsaUnblind(RsaSignature.fromCrock(r.ev_sig), RsaBlindingKey.fromCrock(pc.blindingKey), RsaPublicKey.fromCrock(pc.denomPub));
        let coin = {
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
    function countNonEmpty(n, c) {
        if (c.currentAmount.fraction != 0 || c.currentAmount.value != 0) {
            return n + 1;
        }
        return n;
    }
    function doBadge(n) {
        chrome.browserAction.setBadgeText({ text: "" + n });
        chrome.browserAction.setBadgeBackgroundColor({ color: "#0F0" });
    }
    Query(db)
        .iter("coins")
        .reduce(countNonEmpty, 0)
        .then(doBadge);
}
function storeCoin(db, coin) {
    Query(db)
        .delete("precoins", coin.coinPub)
        .add("coins", coin)
        .finish()
        .then(() => {
        updateBadge(db);
    });
}
function withdraw(db, denom, reserve) {
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
    function next() {
        if (workList.length == 0) {
            return;
        }
        let d = workList.pop();
        withdraw(db, d, reserve)
            .then(() => next());
    }
    next();
}
function updateReserve(db, reservePub, mint) {
    let reservePubStr = reservePub.toCrock();
    return Query(db)
        .get("reserves", reservePubStr)
        .then((reserve) => {
        let reqUrl = URI("reserve/status").absoluteTo(mint.baseUrl);
        reqUrl.query({ 'reserve_pub': reservePubStr });
        return httpGet(reqUrl).then(resp => {
            if (resp.status != 200) {
                throw Error();
            }
            let reserveInfo = JSON.parse(resp.responseText);
            if (!reserveInfo) {
                throw Error();
            }
            reserve.current_amount = reserveInfo.balance;
            let q = Query(db);
            return q.put("reserves", reserve).finish().then(() => reserve);
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
            throw new RequestException({ url: reqUrl, hint: "keys invalid" });
        }
        let mint = {
            baseUrl: baseUrl,
            keys: mintKeysJson
        };
        return Query(db).put("mints", mint).finish().then(() => mint);
    });
}
function dumpDb(db, detail, sendResponse) {
    let dump = {
        name: db.name,
        version: db.version,
        stores: {}
    };
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
    chrome.browserAction.setBadgeText({ text: "" });
    console.log("reset done");
    // Response is synchronous
    return false;
}
function balances(db, detail, sendResponse) {
    function collectBalances(c, byCurrency) {
        let acc = byCurrency[c.currentAmount.currency];
        if (!acc) {
            acc = Amount.getZero(c.currentAmount.currency).toJson();
        }
        let am = new Amount(c.currentAmount);
        am.add(new Amount(acc));
        byCurrency[c.currentAmount.currency] = am.toJson();
    }
    Query(db)
        .iter("coins")
        .reduce(collectBalances, {})
        .then(sendResponse);
    return true;
}
function wxMain() {
    chrome.browserAction.setBadgeText({ text: "" });
    openTalerDb().then((db) => {
        updateBadge(db);
        chrome.runtime.onMessage.addListener(function (req, sender, onresponse) {
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
            console.error(format("Request type {1} unknown, req {0}", JSON.stringify(req), req.type));
            return false;
        });
    });
}
wxMain();
