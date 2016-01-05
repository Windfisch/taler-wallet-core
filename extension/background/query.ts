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

/// <reference path="../decl/chrome/chrome.d.ts" />

"use strict";


function Query(db) {
  return new QueryRoot(db);
}

class QueryStream  {
  qr: QueryRoot;
  storeName;
  constructor(qr, storeName) {
    this.qr = qr;
    this.storeName = storeName;
  }
  join(indexName: string, key: any) {
    // join on the source relation's key, which may be
    // a path or a transformer function
    throw Error("Not implemented");
  }
  reduce(f, acc): Promise<any> {
    let leakedResolve;
    let p = new Promise((resolve, reject) => {
      leakedResolve = resolve;
    });
    let qr = this.qr;
    let storeName = this.storeName;

    function doReduce() {
      let req = qr.tx.objectStore(storeName).openCursor();
      req.onsuccess = (e) => {
        let cursor: IDBCursorWithValue = req.result;
        if (cursor) {
          acc = f(acc, cursor.value);
          cursor.continue();
        } else {
          leakedResolve(acc);
        }
      }
    }

    this.qr.work.push(doReduce);
    // We need this one level of indirection so that the kickoff
    // is run asynchronously.
    return Promise.resolve().then(() => this.qr.finish().then(() => p));
  }
}


class QueryRoot {
  work = [];
  db: IDBDatabase;
  tx: IDBTransaction;
  stores = new Set();
  kickoffPromise;

  constructor(db) {
    this.db = db;
  }

  iter(storeName): QueryStream {
    this.stores.add(storeName);
    return new QueryStream(this, storeName);
  }

  put(storeName, val): QueryRoot {
    this.stores.add(storeName);
    function doPut() {
      this.tx.objectStore(storeName).put(val);
    }
    this.work.push(doPut);
    return this;
  }

  putAll(storeName, iterable): QueryRoot {
    this.stores.add(storeName);
    function doPutAll() {
      for (let obj of iterable) {
        this.tx.objectStore(storeName).put(obj);
      }
    }
    this.work.push(doPutAll);
    return this;
  }

  add(storeName, val): QueryRoot {
    this.stores.add(storeName);
    function doAdd() {
      this.tx.objectStore(storeName).add(val);
    }
    this.work.push(doAdd);
    return this;
  }

  get(storeName, key): Promise<any> {
    this.stores.add(storeName);
    let leakedResolve;
    let p = new Promise((resolve, reject) => {
      leakedResolve = resolve;
    });
    if (!leakedResolve) {
      // According to ES6 spec (paragraph 25.4.3.1), this can't happen.
      throw Error("assertion failed");
    }
    function doGet() {
      let req = this.tx.objectStore(storeName).get(key);
      req.onsuccess = (r) => {
        leakedResolve(r);
      };
    }
    this.work.push(doGet);
    return p;
  }

  finish(): Promise<void> {
    if (this.kickoffPromise) {
      return this.kickoffPromise;
    }
    this.kickoffPromise = new Promise((resolve, reject) => {

      this.tx = this.db.transaction(Array.from(this.stores), "readwrite");
      this.tx.oncomplete = () => {
        resolve();
      };
      for (let w of this.work) {
        w();
      }
    });
    return this.kickoffPromise;
  }

  delete(storeName: string, key): QueryRoot {
    this.stores.add(storeName);
    function doDelete() {
      this.tx.objectStore(storeName).delete(key);
    }
    this.work.push(doDelete);
    return this;
  }
}