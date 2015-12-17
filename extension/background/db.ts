"use strict";
/**
 * Declarations and helpers for
 * things that are stored in the wallet's
 * database.
 */



namespace Db {
  export interface Mint {
    baseUrl: string;
    keys: Keys
  }

  export interface CoinWithDenom {
    coin: Coin;
    denom: Denomination;
  }

  export interface Keys {
    denoms: { [key: string]: Denomination };
  }

  export interface Denomination {
    value: AmountJson;
    denom_pub: string;
    fee_withdraw: AmountJson;
    fee_deposit: AmountJson;
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
  }


}


const DB_NAME = "taler";
const DB_VERSION = 1;

/**
 * Return a promise that resolves
 * to the taler wallet db.
 */
function openTalerDb(): Promise<IDBDatabase> {
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
      console.log ("DB: upgrade needed: oldVersion = " + e.oldVersion);
      switch (e.oldVersion) {
        case 0: // DB does not exist yet
          let mints = db.createObjectStore("mints", { keyPath: "baseUrl" });
          mints.createIndex("pubKey", "keys.master_public_key");
          db.createObjectStore("reserves", { keyPath: "reserve_pub"});
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
