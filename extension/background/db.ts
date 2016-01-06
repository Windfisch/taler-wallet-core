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

"use strict";

/**
 * Declarations and helpers for
 * things that are stored in the wallet's
 * database.
 * @module Db
 * @author Florian Dold
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
    denoms: Denomination[];
  }

  export interface Denomination {
    value: AmountJson_interface;
    denom_pub: string;
    fee_withdraw: AmountJson_interface;
    fee_deposit: AmountJson_interface;
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
    coinValue: AmountJson_interface;
  }

  export interface Coin {
    coinPub: string;
    coinPriv: string;
    denomPub: string;
    denomSig: string;
    currentAmount: AmountJson_interface;
    mintBaseUrl: string;
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
      console.log("DB: upgrade needed: oldVersion = " + e.oldVersion);
      switch (e.oldVersion) {
        case 0: // DB does not exist yet
          let mints = db.createObjectStore("mints", {keyPath: "baseUrl"});
          mints.createIndex("pubKey", "keys.master_public_key");
          db.createObjectStore("reserves", {keyPath: "reserve_pub"});
          db.createObjectStore("denoms", {keyPath: "denomPub"});
          let coins = db.createObjectStore("coins", {keyPath: "coinPub"});
          coins.createIndex("mintBaseUrl", "mintBaseUrl");
          db.createObjectStore("transactions", {keyPath: "contractHash"});
          db.createObjectStore("precoins",
                               {keyPath: "coinPub", autoIncrement: true});
          db.createObjectStore("history", {keyPath: "id", autoIncrement: true});
          break;
      }
    };
  });
}


function exportDb(db): Promise<any> {
  let dump = {
    name: db.name,
    version: db.version,
    stores: {}
  };

  return new Promise((resolve, reject) => {

    let tx = db.transaction(db.objectStoreNames);
    tx.addEventListener("complete", (e) => {
      resolve(dump);
    });
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      let name = db.objectStoreNames[i];
      let storeDump = {};
      dump.stores[name] = storeDump;
      let store = tx.objectStore(name)
                    .openCursor()
                    .addEventListener("success", (e) => {
                      let cursor = e.target.result;
                      if (cursor) {
                        storeDump[cursor.key] = cursor.value;
                        cursor.continue();
                      }
                    });
    }
  });
}
