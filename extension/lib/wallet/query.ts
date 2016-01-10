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
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
 */

/// <reference path="../decl/urijs/URIjs.d.ts" />


/**
 * Database query abstractions.
 * @module Query
 * @author Florian Dold
 */

"use strict";


export function Query(db) {
  return new QueryRoot(db);
}


abstract class QueryStreamBase {
  abstract subscribe(f: (isDone: boolean, value: any) => void);

  root: QueryRoot;

  constructor(root: QueryRoot) {
    this.root = root;
  }

  indexJoin(storeName: string, indexName: string, key: any): QueryStreamBase {
    // join on the source relation's key, which may be
    // a path or a transformer function
    this.root.stores.add(storeName);
    return new QueryStreamIndexJoin(this, storeName, indexName, key);
  }

  filter(f: (any) => boolean): QueryStreamBase {
    return new QueryStreamFilter(this, f);
  }

  reduce(f, acc?): Promise<any> {
    let leakedResolve;
    let p = new Promise((resolve, reject) => {
      leakedResolve = resolve;
    });

    this.subscribe((isDone, value) => {
      if (isDone) {
        leakedResolve(acc);
        return;
      }
      acc = f(value, acc);
    });

    return Promise.resolve().then(() => this.root.finish().then(() => p));
  }
}


class QueryStreamFilter extends QueryStreamBase {
  s: QueryStreamBase;
  filterFn;

  constructor(s: QueryStreamBase, filterFn) {
    super(s.root);
    this.s = s;
    this.filterFn = filterFn;
  }

  subscribe(f) {
    this.s.subscribe((isDone, value) => {
      if (isDone) {
        f(true, undefined);
        return;
      }
      if (this.filterFn(value)) {
        f(false, value)
      }
    });
  }
}


class QueryStreamIndexJoin extends QueryStreamBase {
  s: QueryStreamBase;
  storeName;
  key;
  indexName;

  constructor(s, storeName: string, indexName: string, key: any) {
    super(s.root);
    this.s = s;
    this.storeName = storeName;
    this.key = key;
    this.indexName = indexName;
  }

  subscribe(f) {
    this.s.subscribe((isDone, value) => {
      if (isDone) {
        f(true, undefined);
        return;
      }
      let s = this.root.tx.objectStore(this.storeName).index(this.indexName);
      let req = s.openCursor(IDBKeyRange.only(this.key(value)));
      req.onsuccess = () => {
        let cursor = req.result;
        if (cursor) {
          f(false, [value, cursor.value]);
          cursor.continue();
        } else {
          f(true, undefined);
        }
      }
    });
  }

}


class IterQueryStream extends QueryStreamBase {
  private qr: QueryRoot;
  private storeName;
  private options;

  constructor(qr, storeName, options?) {
    super(qr);
    this.qr = qr;
    this.options = options;
    this.storeName = storeName;
  }

  subscribe(f) {
    function doIt() {
      let s;
      if (this.options && this.options.indexName) {
        s = this.qr.tx.objectStore(this.storeName)
                .index(this.options.indexName);
      } else {
        s = this.qr.tx.objectStore(this.storeName);
      }
      let kr = undefined;
      if (this.options && ("only" in this.options)) {
        kr = IDBKeyRange.only(this.options.only);
      }
      let req = s.openCursor(kr);
      req.onsuccess = (e) => {
        let cursor: IDBCursorWithValue = req.result;
        if (cursor) {
          f(false, cursor.value);
          cursor.continue();
        } else {
          f(true, undefined);
        }
      }
    }

    this.qr.work.push(doIt.bind(this));
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

  iter(storeName): QueryStreamBase {
    this.stores.add(storeName);
    return new IterQueryStream(this, storeName);
  }

  iterOnly(storeName, key): QueryStreamBase {
    this.stores.add(storeName);
    return new IterQueryStream(this, storeName, {only: key});
  }

  iterIndex(storeName, indexName, key) {
    this.stores.add(storeName);
    return new IterQueryStream(this, storeName, {indexName: indexName});
  }

  put(storeName, val): QueryRoot {
    this.stores.add(storeName);
    function doPut() {
      this.tx.objectStore(storeName).put(val);
    }

    this.work.push(doPut.bind(this));
    return this;
  }

  putAll(storeName, iterable): QueryRoot {
    this.stores.add(storeName);
    function doPutAll() {
      for (let obj of iterable) {
        this.tx.objectStore(storeName).put(obj);
      }
    }

    this.work.push(doPutAll.bind(this));
    return this;
  }

  add(storeName, val): QueryRoot {
    this.stores.add(storeName);
    function doAdd() {
      this.tx.objectStore(storeName).add(val);
    }

    this.work.push(doAdd.bind(this));
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
        leakedResolve(req.result);
      };
    }

    this.work.push(doGet.bind(this));
    return Promise.resolve().then(() => {
      return this.finish().then(() => p);
    });
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

    this.work.push(doDelete.bind(this));
    return this;
  }
}