/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

"use strict";
import Dictionary = _.Dictionary;

/**
 * Declarations and helpers for
 * things that are stored in the wallet's
 * database.
 * @module Db
 * @author Florian Dold
 */

const DB_NAME = "taler";
const DB_VERSION = 7;

/**
 * Return a promise that resolves
 * to the taler wallet db.
 */
export function openTalerDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = (e) => {
      reject(e);
    };
    req.onsuccess = (e) => {
      resolve(req.result);
    };
    req.onupgradeneeded = (e) => {
      const db = req.result;
      console.log("DB: upgrade needed: oldVersion = " + e.oldVersion);
      switch (e.oldVersion) {
        case 0: // DB does not exist yet
          const exchanges = db.createObjectStore("exchanges",
                                                 {keyPath: "baseUrl"});
          exchanges.createIndex("pubKey", "masterPublicKey");
          db.createObjectStore("reserves", {keyPath: "reserve_pub"});
          const coins = db.createObjectStore("coins", {keyPath: "coinPub"});
          coins.createIndex("exchangeBaseUrl", "exchangeBaseUrl");
          const transactions = db.createObjectStore("transactions",
                                                    {keyPath: "contractHash"});
          transactions.createIndex("repurchase",
                                   [
                                     "contract.merchant_pub",
                                     "contract.repurchase_correlation_id"
                                   ]);

          db.createObjectStore("precoins",
                               {keyPath: "coinPub", autoIncrement: true});
          const history = db.createObjectStore("history",
                                               {
                                                 keyPath: "id",
                                                 autoIncrement: true
                                               });
          history.createIndex("timestamp", "timestamp");
          break;
        default:
          if (e.oldVersion != DB_VERSION) {
            window.alert("Incompatible wallet dababase version, please reset" +
                         " db.");
            chrome.browserAction.setBadgeText({text: "R!"});
            chrome.browserAction.setBadgeBackgroundColor({color: "#F00"});
            throw Error("incompatible DB");
          }
          break;
      }
    };
  });
}


export function exportDb(db: IDBDatabase): Promise<any> {
  let dump = {
    name: db.name,
    version: db.version,
    stores: {} as Dictionary<any>,
  };

  return new Promise((resolve, reject) => {

    let tx = db.transaction(Array.from(db.objectStoreNames));
    tx.addEventListener("complete", () => {
      resolve(dump);
    });
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      let name = db.objectStoreNames[i];
      let storeDump = {} as Dictionary<any>;
      dump.stores[name] = storeDump;
      let store = tx.objectStore(name)
                    .openCursor()
                    .addEventListener("success", (e: Event) => {
                      let cursor = (e.target as any).result;
                      if (cursor) {
                        storeDump[cursor.key] = cursor.value;
                        cursor.continue();
                      }
                    });
    }
  });
}

export function deleteDb() {
  indexedDB.deleteDatabase(DB_NAME);
}