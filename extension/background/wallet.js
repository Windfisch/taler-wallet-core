/// <reference path="../decl/urijs/URIjs.d.ts" />
/// <reference path="../decl/chrome/chrome.d.ts" />
'use strict';
const DB_NAME = "taler";
const DB_VERSION = 1;
/**
 * Return a promise that resolves
 * to the taler wallet db.
 */
function openTalerDb() {
    return new Promise((resolve, reject) => {
        let req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = (e) => {
            reject(e);
        };
        req.onsuccess = (e) => {
            resolve(e.target.result);
        };
        req.onupgradeneeded = (event) => {
            let db = event.target.result;
            console.log("DB: upgrade needed: oldVersion = " + event.oldVersion);
            db = event.target.result;
            switch (event.oldVersion) {
                case 0:
                    db.createObjectStore("mints", { keyPath: "baseUrl" });
                    db.createObjectStore("reserves", { keyPath: "reserve_pub" });
                    db.createObjectStore("denoms", { keyPath: "denom_pub" });
                    db.createObjectStore("coins", { keyPath: "coin_pub" });
                    db.createObjectStore("withdrawals", { keyPath: "id", autoIncrement: true });
                    db.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
                    break;
            }
        };
    });
}
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
function confirmReserve(db, detail, sendResponse) {
    console.log('detail: ' + JSON.stringify(detail));
    let reservePriv = EddsaPrivateKey.create();
    let reservePub = reservePriv.getPublicKey();
    let form = new FormData();
    let now = (new Date()).toString();
    form.append(detail.field_amount, detail.amount_str);
    form.append(detail.field_reserve_pub, reservePub.stringEncode());
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
                reserve_pub: reservePub.stringEncode(),
                reserve_priv: reservePriv.stringEncode(),
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
                            .then((m) => { mint = m; return updateReserve(db, reservePub, mint); })
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
function withdraw(denom, reserve, mint) {
    let wd = {
        denom_pub: denom.denom_pub,
        reserve_pub: reserve.reserve_pub,
    };
    let reservePriv = new EddsaPrivateKey();
    reservePriv.stringDecode(reserve.reserve_priv);
    let reservePub = new EddsaPublicKey();
    reservePub.stringDecode(reserve.reserve_pub);
    let denomPub = RsaPublicKey.stringDecode(denom.denom_pub);
    let coinPriv = EddsaPrivateKey.create();
    let coinPub = coinPriv.getPublicKey();
    let blindingFactor = RsaBlindingKey.create(1024);
    let pubHash = coinPub.hash();
    let ev = rsaBlind(pubHash, blindingFactor, denomPub);
    // Signature
    let withdrawRequest = new WithdrawRequestPS();
    withdrawRequest.set("reserve_pub", reservePub);
    // ...
    var sig = eddsaSign(withdrawRequest.toPurpose(), reservePriv);
}
/**
 * Withdraw coins from a reserve until it is empty.
 */
function depleteReserve(db, reserve, mint) {
    let denoms = copy(mint.keys.denoms);
    let remaining = new Amount(reserve.current_amount);
    denoms.sort(rankDenom);
    for (let i = 0; i < 1000; i++) {
        let found = false;
        for (let d of denoms) {
            let cost = new Amount(d.value);
            cost.add(new Amount(d.fee_withdraw));
            if (remaining.cmp(cost) < 0) {
                continue;
            }
            found = true;
            console.log("Subbing " + JSON.stringify(remaining.toJson()));
            console.log("With " + JSON.stringify(cost.toJson()));
            remaining.sub(cost);
            withdraw(d, reserve, mint);
        }
        if (!found) {
            break;
        }
    }
}
function updateReserve(db, reservePub, mint) {
    let reserve;
    return new Promise((resolve, reject) => {
        let tx = db.transaction(['reserves']);
        tx.objectStore('reserves').get(reservePub.stringEncode()).onsuccess = (e) => {
            let reserve = e.target.result;
            let reqUrl = URI("reserve/status").absoluteTo(mint.baseUrl);
            reqUrl.query({ 'reserve_pub': reservePub.stringEncode() });
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
                    }
                    else {
                        let mint = {
                            baseUrl: baseUrl,
                            keys: mintKeysJson
                        };
                        let tx = db.transaction(['mints'], 'readwrite');
                        tx.objectStore('mints').put(mint);
                        tx.oncomplete = (e) => {
                            resolve(mint);
                        };
                    }
                }
                else {
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
        let store = tx.objectStore(name).openCursor().addEventListener('success', (e) => {
            let cursor = e.target.result;
            if (cursor) {
                storeDump[cursor.key] = cursor.value;
                cursor.continue();
            }
        });
    }
    return true;
}
openTalerDb().then((db) => {
    console.log("db loaded");
    chrome.runtime.onMessage.addListener(function (req, sender, onresponse) {
        let dispatch = {
            "confirm-reserve": confirmReserve,
            "dump-db": dumpDb
        };
        return dispatch[req.type](db, req.detail, onresponse);
    });
});
