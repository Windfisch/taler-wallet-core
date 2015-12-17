"use strict";
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
            resolve(req.result);
        };
        req.onupgradeneeded = (e) => {
            let db = req.result;
            console.log("DB: upgrade needed: oldVersion = " + e.oldVersion);
            switch (e.oldVersion) {
                case 0:
                    let mints = db.createObjectStore("mints", { keyPath: "baseUrl" });
                    mints.createIndex("pubKey", "keys.master_public_key");
                    db.createObjectStore("reserves", { keyPath: "reserve_pub" });
                    db.createObjectStore("denoms", { keyPath: "denomPub" });
                    let coins = db.createObjectStore("coins", { keyPath: "coinPub" });
                    coins.createIndex("mintBaseUrl", "mintBaseUrl");
                    db.createObjectStore("transactions", { keyPath: "contractHash" });
                    db.createObjectStore("precoins", { keyPath: "coinPub", autoIncrement: true });
                    break;
            }
        };
    });
}
