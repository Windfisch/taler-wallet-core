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


/**
 * Database query abstractions.
 * @module Query
 * @author Florian Dold
 */

"use strict";


export function Query(db) {
  return new QueryRoot(db);
}

/**
 * Stream that can be filtered, reduced or joined
 * with indices.
 */
export interface QueryStream<T> {
  indexJoin<S>(storeName: string,
               indexName: string,
               keyFn: (obj: any) => any): QueryStream<[T,S]>;
  filter(f: (any) => boolean): QueryStream<T>;
  reduce<S>(f: (v: T, acc: S) => S, start?: S): Promise<S>;
  flatMap(f: (T) => T[]): QueryStream<T>;
}


/**
 * Get an unresolved promise together with its extracted resolve / reject
 * function.
 *
 * @returns {{resolve: any, reject: any, promise: Promise<T>}}
 */
function openPromise<T>() {
  let resolve, reject;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {resolve, reject, promise};
}


abstract class QueryStreamBase<T> implements QueryStream<T> {
  abstract subscribe(f: (isDone: boolean,
                         value: any,
                         tx: IDBTransaction) => void);

  root: QueryRoot;

  constructor(root: QueryRoot) {
    this.root = root;
  }

  flatMap(f: (T) => T[]): QueryStream<T> {
    return new QueryStreamFlatMap(this, f);
  }

  indexJoin<S>(storeName: string,
               indexName: string,
               key: any): QueryStream<[T,S]> {
    this.root.addWork(null, storeName, false);
    return new QueryStreamIndexJoin(this, storeName, indexName, key);
  }

  filter(f: (any) => boolean): QueryStream<T> {
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

    return Promise.resolve()
                  .then(() => this.root.finish())
                  .then(() => p);
  }
}


class QueryStreamFilter<T> extends QueryStreamBase<T> {
  s: QueryStreamBase<T>;
  filterFn;

  constructor(s: QueryStreamBase<T>, filterFn) {
    super(s.root);
    this.s = s;
    this.filterFn = filterFn;
  }

  subscribe(f) {
    this.s.subscribe((isDone, value, tx) => {
      if (isDone) {
        f(true, undefined, tx);
        return;
      }
      if (this.filterFn(value)) {
        f(false, value, tx);
      }
    });
  }
}


class QueryStreamFlatMap<T> extends QueryStreamBase<T> {
  s: QueryStreamBase<T>;
  flatMapFn;

  constructor(s: QueryStreamBase<T>, flatMapFn) {
    super(s.root);
    this.s = s;
    this.flatMap = flatMapFn;
  }

  subscribe(f) {
    this.s.subscribe((isDone, value, tx) => {
      if (isDone) {
        f(true, undefined, tx);
        return;
      }
      let values = this.flatMapFn(value);
      for (let v in values) {
        f(false, value, tx)
      }
    });
  }
}


class QueryStreamIndexJoin<T> extends QueryStreamBase<T> {
  s: QueryStreamBase<T>;
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
    this.s.subscribe((isDone, value, tx) => {
      if (isDone) {
        f(true, undefined, tx);
        return;
      }
      console.log("joining on", this.key(value));
      let s = tx.objectStore(this.storeName).index(this.indexName);
      let req = s.openCursor(IDBKeyRange.only(this.key(value)));
      req.onsuccess = () => {
        let cursor = req.result;
        if (cursor) {
          f(false, [value, cursor.value], tx);
          cursor.continue();
        } else {
          f(true, undefined, tx);
        }
      }
    });
  }
}


class IterQueryStream<T> extends QueryStreamBase<T> {
  private storeName;
  private options;
  private subscribers;

  constructor(qr, storeName, options) {
    super(qr);
    this.options = options;
    this.storeName = storeName;
    this.subscribers = [];

    let doIt = (tx) => {
      const {indexName = void 0, only = void 0} = this.options;
      let s;
      if (indexName !== void 0) {
        s = tx.objectStore(this.storeName)
              .index(this.options.indexName);
      } else {
        s = tx.objectStore(this.storeName);
      }
      let kr = undefined;
      if (only !== void 0) {
        kr = IDBKeyRange.only(this.options.only);
      }
      let req = s.openCursor(kr);
      req.onsuccess = (e) => {
        let cursor: IDBCursorWithValue = req.result;
        if (cursor) {
          for (let f of this.subscribers) {
            f(false, cursor.value, tx);
          }
          cursor.continue();
        } else {
          for (let f of this.subscribers) {
            f(true, undefined, tx);
          }
        }
      }
    };

    this.root.addWork(doIt, null, false);
  }

  subscribe(f) {
    this.subscribers.push(f);
  }
}


class QueryRoot {
  private work = [];
  private db: IDBDatabase;
  private stores = new Set();
  private kickoffPromise;

  /**
   * Some operations is a write operation,
   * and we need to do a "readwrite" transaction/
   */
  private hasWrite;

  constructor(db) {
    this.db = db;
  }

  iter<T>(storeName, {only = void 0, indexName = void 0} = {}): QueryStream<T> {
    this.stores.add(storeName);
    return new IterQueryStream(this, storeName, {only, indexName});
  }

  /**
   * Put an object into the given object store.
   * Overrides if an existing object with the same key exists
   * in the store.
   */
  put(storeName, val): QueryRoot {
    let doPut = (tx: IDBTransaction) => {
      tx.objectStore(storeName).put(val);
    };
    this.addWork(doPut, storeName, true);
    return this;
  }


  /**
   * Add all object from an iterable to the given object store.
   * Fails if the object's key is already present
   * in the object store.
   */
  putAll(storeName, iterable): QueryRoot {
    const doPutAll = (tx: IDBTransaction) => {
      for (const obj of iterable) {
        tx.objectStore(storeName).put(obj);
      }
    };
    this.addWork(doPutAll, storeName, true);
    return this;
  }

  /**
   * Add an object to the given object store.
   * Fails if the object's key is already present
   * in the object store.
   */
  add(storeName, val): QueryRoot {
    const doAdd = (tx: IDBTransaction) => {
      tx.objectStore(storeName).add(val);
    };
    this.addWork(doAdd, storeName, true);
    return this;
  }

  /**
   * Get one object from a store by its key.
   */
  get(storeName, key): Promise<any> {
    if (key === void 0) {
      throw Error("key must not be undefined");
    }

    const {resolve, promise} = openPromise();

    const doGet = (tx) => {
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = (r) => {
        resolve(req.result);
      };
    };

    this.addWork(doGet, storeName, false);
    return Promise.resolve()
                  .then(() => this.finish())
                  .then(() => promise);
  }

  /**
   * Get one object from a store by its key.
   */
  getIndexed(storeName, indexName, key): Promise<any> {
    if (key === void 0) {
      throw Error("key must not be undefined");
    }

    const {resolve, promise} = openPromise();

    const doGetIndexed = (tx) => {
      const req = tx.objectStore(storeName).index(indexName).get(key);
      req.onsuccess = (r) => {
        resolve(req.result);
      };
    };

    this.addWork(doGetIndexed, storeName, false);
    return Promise.resolve()
                  .then(() => this.finish())
                  .then(() => promise);
  }

  /**
   * Finish the query, and start the query in the first place if necessary.
   */
  finish(): Promise<void> {
    if (this.kickoffPromise) {
      return this.kickoffPromise;
    }
    this.kickoffPromise = new Promise((resolve, reject) => {
      if (this.work.length == 0) {
        resolve();
        return;
      }
      const mode = this.hasWrite ? "readwrite" : "readonly";
      const tx = this.db.transaction(Array.from(this.stores), mode);
      tx.oncomplete = () => {
        resolve();
      };
      for (let w of this.work) {
        w(tx);
      }
    });
    return this.kickoffPromise;
  }

  /**
   * Delete an object by from the given object store.
   */
  delete(storeName: string, key): QueryRoot {
    const doDelete = (tx) => {
      tx.objectStore(storeName).delete(key);
    };
    this.addWork(doDelete, storeName, true);
    return this;
  }

  /**
   * Low-level function to add a task to the internal work queue.
   */
  addWork(workFn: (IDBTransaction) => void,
          storeName: string,
          isWrite: boolean) {
    if (storeName) {
      this.stores.add(storeName);
    }
    if (isWrite) {
      this.hasWrite = true;
    }
    if (workFn) {
      this.work.push(workFn);
    }
  }
}