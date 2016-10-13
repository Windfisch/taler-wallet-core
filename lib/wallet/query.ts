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


/**
 * Database query abstractions.
 * @module Query
 * @author Florian Dold
 */

"use strict";


/**
 * Stream that can be filtered, reduced or joined
 * with indices.
 */
export interface QueryStream<T> {
  indexJoin<S>(storeName: string,
    indexName: string,
    keyFn: (obj: any) => any): QueryStream<[T, S]>;
  filter(f: (x: any) => boolean): QueryStream<T>;
  reduce<S>(f: (v: T, acc: S) => S, start?: S): Promise<S>;
  flatMap(f: (x: T) => T[]): QueryStream<T>;
  toArray(): Promise<T[]>;
}


/**
 * Get an unresolved promise together with its extracted resolve / reject
 * function.
 */
function openPromise<T>() {
  let resolve: ((value?: T | PromiseLike<T>) => void) | null = null;
  let reject: ((reason?: any) => void) | null = null;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  if (!(resolve && reject)) {
    // Never happens, unless JS implementation is broken
    throw Error();
  }
  return { resolve, reject, promise };
}


abstract class QueryStreamBase<T> implements QueryStream<T> {
  abstract subscribe(f: (isDone: boolean,
    value: any,
    tx: IDBTransaction) => void): void;

  root: QueryRoot;

  constructor(root: QueryRoot) {
    this.root = root;
  }

  flatMap(f: (x: T) => T[]): QueryStream<T> {
    return new QueryStreamFlatMap(this, f);
  }

  indexJoin<S>(storeName: string,
    indexName: string,
    key: any): QueryStream<[T, S]> {
    this.root.addStoreAccess(storeName, false);
    return new QueryStreamIndexJoin(this, storeName, indexName, key);
  }

  filter(f: (x: any) => boolean): QueryStream<T> {
    return new QueryStreamFilter(this, f);
  }

  toArray(): Promise<T[]> {
    let {resolve, promise} = openPromise();
    let values: T[] = [];

    this.subscribe((isDone, value) => {
      if (isDone) {
        resolve(values);
        return;
      }
      values.push(value);
    });

    return Promise.resolve()
      .then(() => this.root.finish())
      .then(() => promise);
  }

  reduce<A>(f: (x: any, acc?: A) => A, init?: A): Promise<any> {
    let {resolve, promise} = openPromise();
    let acc = init;

    this.subscribe((isDone, value) => {
      if (isDone) {
        resolve(acc);
        return;
      }
      acc = f(value, acc);
    });

    return Promise.resolve()
      .then(() => this.root.finish())
      .then(() => promise);
  }
}

type FilterFn = (e: any) => boolean;
type SubscribeFn = (done: boolean, value: any, tx: IDBTransaction) => void;

interface FlatMapFn<T> {
  (v: T): T[];
}

class QueryStreamFilter<T> extends QueryStreamBase<T> {
  s: QueryStreamBase<T>;
  filterFn: FilterFn;

  constructor(s: QueryStreamBase<T>, filterFn: FilterFn) {
    super(s.root);
    this.s = s;
    this.filterFn = filterFn;
  }

  subscribe(f: SubscribeFn) {
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
  flatMapFn: (v: T) => T[];

  constructor(s: QueryStreamBase<T>, flatMapFn: (v: T) => T[]) {
    super(s.root);
    this.s = s;
    this.flatMapFn = flatMapFn;
  }

  subscribe(f: SubscribeFn) {
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


class QueryStreamIndexJoin<T, S> extends QueryStreamBase<[T, S]> {
  s: QueryStreamBase<T>;
  storeName: string;
  key: any;
  indexName: string;

  constructor(s: QueryStreamBase<T>, storeName: string, indexName: string, key: any) {
    super(s.root);
    this.s = s;
    this.storeName = storeName;
    this.key = key;
    this.indexName = indexName;
  }

  subscribe(f: SubscribeFn) {
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
  private storeName: string;
  private options: any;
  private subscribers: SubscribeFn[];

  constructor(qr: QueryRoot, storeName: string, options: any) {
    super(qr);
    this.options = options;
    this.storeName = storeName;
    this.subscribers = [];

    let doIt = (tx: IDBTransaction) => {
      const {indexName = void 0, only = void 0} = this.options;
      let s: any;
      if (indexName !== void 0) {
        s = tx.objectStore(this.storeName)
          .index(this.options.indexName);
      } else {
        s = tx.objectStore(this.storeName);
      }
      let kr: IDBKeyRange | undefined = undefined;
      if (only !== undefined) {
        kr = IDBKeyRange.only(this.options.only);
      }
      let req = s.openCursor(kr);
      req.onsuccess = () => {
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

    this.root.addWork(doIt);
  }

  subscribe(f: SubscribeFn) {
    this.subscribers.push(f);
  }
}


export class QueryRoot {
  private work: ((t: IDBTransaction) => void)[] = [];
  private db: IDBDatabase;
  private stores = new Set();
  private kickoffPromise: Promise<void>;

  /**
   * Some operations is a write operation,
   * and we need to do a "readwrite" transaction/
   */
  private hasWrite: boolean;

  constructor(db: IDBDatabase) {
    this.db = db;
  }

  iter<T>(storeName: string,
    {only = <string | undefined>undefined, indexName = <string | undefined>undefined} = {}): QueryStream<T> {
    this.stores.add(storeName);
    return new IterQueryStream(this, storeName, { only, indexName });
  }

  /**
   * Put an object into the given object store.
   * Overrides if an existing object with the same key exists
   * in the store.
   */
  put(storeName: string, val: any): QueryRoot {
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
  putAll(storeName: string, iterable: any[]): QueryRoot {
    const doPutAll = (tx: IDBTransaction) => {
      for (let obj of iterable) {
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
  add(storeName: string, val: any): QueryRoot {
    const doAdd = (tx: IDBTransaction) => {
      tx.objectStore(storeName).add(val);
    };
    this.addWork(doAdd, storeName, true);
    return this;
  }

  /**
   * Get one object from a store by its key.
   */
  get<T>(storeName: any, key: any): Promise<T|undefined> {
    if (key === void 0) {
      throw Error("key must not be undefined");
    }

    const {resolve, promise} = openPromise();

    const doGet = (tx: IDBTransaction) => {
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => {
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
  getIndexed(storeName: string, indexName: string, key: any): Promise<any> {
    if (key === void 0) {
      throw Error("key must not be undefined");
    }

    const {resolve, promise} = openPromise();

    const doGetIndexed = (tx: IDBTransaction) => {
      const req = tx.objectStore(storeName).index(indexName).get(key);
      req.onsuccess = () => {
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
    this.kickoffPromise = new Promise<void>((resolve, reject) => {
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
  delete(storeName: string, key: any): QueryRoot {
    const doDelete = (tx: IDBTransaction) => {
      tx.objectStore(storeName).delete(key);
    };
    this.addWork(doDelete, storeName, true);
    return this;
  }

  /**
   * Low-level function to add a task to the internal work queue.
   */
  addWork(workFn: (t: IDBTransaction) => void,
    storeName?: string,
    isWrite?: boolean) {
    this.work.push(workFn);
    if (storeName) {
      this.addStoreAccess(storeName, isWrite);
    }
  }

  addStoreAccess(storeName: string, isWrite?: boolean) {
    if (storeName) {
      this.stores.add(storeName);
    }
    if (isWrite) {
      this.hasWrite = true;
    }
  }
}
