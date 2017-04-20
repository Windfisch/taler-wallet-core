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


export interface JoinResult<L,R> {
  left: L;
  right: R;
}

export interface JoinLeftResult<L,R> {
  left: L;
  right?: R;
}


export class Store<T> {
  name: string;
  validator?: (v: T) => T;
  storeParams?: IDBObjectStoreParameters;

  constructor(name: string, storeParams?: IDBObjectStoreParameters,
              validator?: (v: T) => T) {
    this.name = name;
    this.validator = validator;
    this.storeParams = storeParams;
  }
}

export class Index<S extends IDBValidKey,T> {
  indexName: string;
  storeName: string;
  keyPath: string | string[];

  constructor(s: Store<T>, indexName: string, keyPath: string | string[]) {
    this.storeName = s.name;
    this.indexName = indexName;
    this.keyPath = keyPath;
  }
}

/**
 * Stream that can be filtered, reduced or joined
 * with indices.
 */
export interface QueryStream<T> {
  indexJoin<S,I extends IDBValidKey>(index: Index<I,S>,
                                     keyFn: (obj: T) => I): QueryStream<JoinResult<T, S>>;
  indexJoinLeft<S,I extends IDBValidKey>(index: Index<I,S>,
                                     keyFn: (obj: T) => I): QueryStream<JoinLeftResult<T, S>>;
  keyJoin<S,I extends IDBValidKey>(store: Store<S>,
                                   keyFn: (obj: T) => I): QueryStream<JoinResult<T,S>>;
  filter(f: (T: any) => boolean): QueryStream<T>;
  reduce<S>(f: (v: T, acc: S) => S, start?: S): Promise<S>;
  map<S>(f: (x:T) => S): QueryStream<S>;
  flatMap<S>(f: (x: T) => S[]): QueryStream<S>;
  toArray(): Promise<T[]>;
  first(): QueryValue<T>;

  then(onfulfill: any, onreject: any): any;
}


/**
 * Query result that consists of at most one value.
 */
export interface QueryValue<T> {
  map<S>(f: (x: T) => S): QueryValue<S>;
  cond<R>(f: (x: T) => boolean, onTrue: (r: QueryRoot) => R, onFalse: (r: QueryRoot) => R): Promise<void>;
}


abstract class BaseQueryValue<T> implements QueryValue<T> {
  root: QueryRoot;

  constructor(root: QueryRoot) {
    this.root = root;
  }

  map<S>(f: (x: T) => S): QueryValue<S> {
    return new MapQueryValue<T,S>(this, f);
  }

  cond<R>(f: (x: T) => boolean, onTrue: (r: QueryRoot) => R, onFalse: (r: QueryRoot) => R): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.subscribeOne((v, tx) => {
        if (f(v)) {
          onTrue(new QueryRoot(this.root.db));
        } else {
          onFalse(new QueryRoot(this.root.db));
        }
      });
      resolve();
    });
  }

  abstract subscribeOne(f: SubscribeOneFn): void;
}

class FirstQueryValue<T> extends BaseQueryValue<T> {
  gotValue = false;
  s: QueryStreamBase<T>;
  constructor(stream: QueryStreamBase<T>) {
    super(stream.root);
    this.s = stream;
  }

  subscribeOne(f: SubscribeOneFn): void {
    this.s.subscribe((isDone, value, tx) => {
      if (this.gotValue) {
        return;
      }
      if (isDone) {
          f(undefined, tx);
      } else {
        f(value, tx);
      }
      this.gotValue = true;
    });
  }
}

class MapQueryValue<T,S> extends BaseQueryValue<S> {
  mapFn: (x: T) => S;
  v: BaseQueryValue<T>;

  constructor(v: BaseQueryValue<T>, mapFn: (x: T) => S) {
    super(v.root);
    this.v = v;
    this.mapFn = mapFn;
  }

  subscribeOne(f: SubscribeOneFn): void {
    this.v.subscribeOne((v, tx) => this.mapFn(v));
  }
}


export let AbortTransaction = Symbol("abort_transaction");

/**
 * Get an unresolved promise together with its extracted resolve / reject
 * function.
 */
export function openPromise<T>(): any {
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
  return {resolve, reject, promise};
}


abstract class QueryStreamBase<T> implements QueryStream<T>, PromiseLike<void> {
  abstract subscribe(f: (isDone: boolean,
                         value: any,
                         tx: IDBTransaction) => void): void;

  root: QueryRoot;

  constructor(root: QueryRoot) {
    this.root = root;
  }

  first(): QueryValue<T> {
    return new FirstQueryValue(this);
  }

  then<R>(onfulfilled: (value: void) => R | PromiseLike<R>, onrejected: (reason: any) => R | PromiseLike<R>): PromiseLike<R>  {
    return this.root.then(onfulfilled, onrejected);
  }

  flatMap<S>(f: (x: T) => S[]): QueryStream<S> {
    return new QueryStreamFlatMap<T,S>(this, f);
  }

  map<S>(f: (x: T) => S): QueryStream<S> {
    return new QueryStreamMap(this, f);
  }

  indexJoin<S,I extends IDBValidKey>(index: Index<I,S>,
                                     keyFn: (obj: T) => I): QueryStream<JoinResult<T, S>> {
    this.root.addStoreAccess(index.storeName, false);
    return new QueryStreamIndexJoin<T, S>(this, index.storeName, index.indexName, keyFn);
  }

  indexJoinLeft<S,I extends IDBValidKey>(index: Index<I,S>,
                                     keyFn: (obj: T) => I): QueryStream<JoinLeftResult<T, S>> {
    this.root.addStoreAccess(index.storeName, false);
    return new QueryStreamIndexJoinLeft<T, S>(this, index.storeName, index.indexName, keyFn);
  }

  keyJoin<S, I extends IDBValidKey>(store: Store<S>,
                                    keyFn: (obj: T) => I): QueryStream<JoinResult<T, S>> {
    this.root.addStoreAccess(store.name, false);
    return new QueryStreamKeyJoin<T, S>(this, store.name, keyFn);
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
type SubscribeOneFn = (value: any, tx: IDBTransaction) => void;

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


class QueryStreamFlatMap<T,S> extends QueryStreamBase<S> {
  s: QueryStreamBase<T>;
  flatMapFn: (v: T) => S[];

  constructor(s: QueryStreamBase<T>, flatMapFn: (v: T) => S[]) {
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


class QueryStreamMap<S,T> extends QueryStreamBase<T> {
  s: QueryStreamBase<S>;
  mapFn: (v: S) => T;

  constructor(s: QueryStreamBase<S>, mapFn: (v: S) => T) {
    super(s.root);
    this.s = s;
    this.mapFn = mapFn;
  }

  subscribe(f: SubscribeFn) {
    this.s.subscribe((isDone, value, tx) => {
      if (isDone) {
        f(true, undefined, tx);
        return;
      }
      let mappedValue = this.mapFn(value);
      f(false, mappedValue, tx);
    });
  }
}


class QueryStreamIndexJoin<T, S> extends QueryStreamBase<JoinResult<T, S>> {
  s: QueryStreamBase<T>;
  storeName: string;
  key: any;
  indexName: string;

  constructor(s: QueryStreamBase<T>, storeName: string, indexName: string,
              key: any) {
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
      let s = tx.objectStore(this.storeName).index(this.indexName);
      let req = s.openCursor(IDBKeyRange.only(this.key(value)));
      req.onsuccess = () => {
        let cursor = req.result;
        if (cursor) {
          f(false, {left: value, right: cursor.value}, tx);
          cursor.continue();
        }
      }
    });
  }
}


class QueryStreamIndexJoinLeft<T, S> extends QueryStreamBase<JoinLeftResult<T, S>> {
  s: QueryStreamBase<T>;
  storeName: string;
  key: any;
  indexName: string;

  constructor(s: QueryStreamBase<T>, storeName: string, indexName: string,
              key: any) {
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
      const s = tx.objectStore(this.storeName).index(this.indexName);
      const req = s.openCursor(IDBKeyRange.only(this.key(value)));
      let gotMatch = false;
      req.onsuccess = () => {
        let cursor = req.result;
        if (cursor) {
          gotMatch = true;
          f(false, {left: value, right: cursor.value}, tx);
          cursor.continue();
        } else {
          if (!gotMatch) {
            f(false, {left: value}, tx);
          }
        }
      }
    });
  }
}


class QueryStreamKeyJoin<T, S> extends QueryStreamBase<JoinResult<T, S>> {
  s: QueryStreamBase<T>;
  storeName: string;
  key: any;

  constructor(s: QueryStreamBase<T>, storeName: string,
              key: any) {
    super(s.root);
    this.s = s;
    this.storeName = storeName;
    this.key = key;
  }

  subscribe(f: SubscribeFn) {
    this.s.subscribe((isDone, value, tx) => {
      if (isDone) {
        f(true, undefined, tx);
        return;
      }
      let s = tx.objectStore(this.storeName);
      let req = s.openCursor(IDBKeyRange.only(this.key(value)));
      req.onsuccess = () => {
        let cursor = req.result;
        if (cursor) {
          f(false, {left:value, right: cursor.value}, tx);
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


export class QueryRoot implements PromiseLike<void> {
  private work: ((t: IDBTransaction) => void)[] = [];
  db: IDBDatabase;
  private stores = new Set();
  private kickoffPromise: Promise<void>;

  /**
   * Some operations is a write operation,
   * and we need to do a "readwrite" transaction/
   */
  private hasWrite: boolean;

  private finishScheduled: boolean;

  private finished: boolean = false;

  constructor(db: IDBDatabase) {
    this.db = db;
  }

  then<R>(onfulfilled: (value: void) => R | PromiseLike<R>, onrejected: (reason: any) => R | PromiseLike<R>): PromiseLike<R> {
    return this.finish().then(onfulfilled, onrejected);
  }

  checkFinished() {
    if (this.finished) {
      throw Error("Can't add work to query after it was started");
    }
  }

  iter<T>(store: Store<T>): QueryStream<T> {
    this.checkFinished();
    this.stores.add(store.name);
    this.scheduleFinish();
    return new IterQueryStream<T>(this, store.name, {});
  }

  count<T>(store: Store<T>): Promise<number> {
    this.checkFinished();
    const {resolve, promise} = openPromise();

    const doCount = (tx: IDBTransaction) => {
      const s = tx.objectStore(store.name);
      const req = s.count();
      req.onsuccess = () => {
        resolve(req.result);
      };
    }

    this.addWork(doCount, store.name, false);
    return Promise.resolve()
                  .then(() => this.finish())
                  .then(() => promise);

  }

  deleteIf<T>(store: Store<T>, predicate: (x: T, n: number) => boolean): QueryRoot {
    this.checkFinished();
    const doDeleteIf = (tx: IDBTransaction) => {
      const s = tx.objectStore(store.name);
      const req = s.openCursor();
      let n = 0;
      req.onsuccess = () => {
        let cursor: IDBCursorWithValue = req.result;
        if (cursor) {
          if (predicate(cursor.value, n++)) {
            cursor.delete();
          }
          cursor.continue();
        } 
      }
    };
    this.addWork(doDeleteIf, store.name, true);
    return this;
  }

  iterIndex<S extends IDBValidKey,T>(index: Index<S,T>,
                                     only?: S): QueryStream<T> {
    this.checkFinished();
    this.stores.add(index.storeName);
    this.scheduleFinish();
    return new IterQueryStream<T>(this, index.storeName, {
      only,
      indexName: index.indexName
    });
  }

  /**
   * Put an object into the given object store.
   * Overrides if an existing object with the same key exists
   * in the store.
   */
  put<T>(store: Store<T>, val: T): QueryRoot {
    this.checkFinished();
    let doPut = (tx: IDBTransaction) => {
      tx.objectStore(store.name).put(val);
    };
    this.scheduleFinish();
    this.addWork(doPut, store.name, true);
    return this;
  }


  putWithResult<T>(store: Store<T>, val: T): Promise<IDBValidKey> {
    this.checkFinished();
    const {resolve, promise} = openPromise();
    let doPutWithResult = (tx: IDBTransaction) => {
      let req = tx.objectStore(store.name).put(val);
      req.onsuccess = () => {
        resolve(req.result);
      }
      this.scheduleFinish();
    };
    this.addWork(doPutWithResult, store.name, true);
    return Promise.resolve()
                  .then(() => this.finish())
                  .then(() => promise);
  }


  mutate<T>(store: Store<T>, key: any, f: (v: T) => T): QueryRoot {
    this.checkFinished();
    let doPut = (tx: IDBTransaction) => {
      let reqGet = tx.objectStore(store.name).get(key);
      reqGet.onsuccess = () => {
        let r = reqGet.result;
        let m: T;
        try {
          m = f(r);
        } catch (e) {
          if (e == AbortTransaction) {
            tx.abort();
            return;
          }
          throw e;
        }

        tx.objectStore(store.name).put(m);
      }
    };
    this.scheduleFinish();
    this.addWork(doPut, store.name, true);
    return this;
  }


  /**
   * Add all object from an iterable to the given object store.
   * Fails if the object's key is already present
   * in the object store.
   */
  putAll<T>(store: Store<T>, iterable: T[]): QueryRoot {
    this.checkFinished();
    const doPutAll = (tx: IDBTransaction) => {
      for (let obj of iterable) {
        tx.objectStore(store.name).put(obj);
      }
    };
    this.scheduleFinish();
    this.addWork(doPutAll, store.name, true);
    return this;
  }

  /**
   * Add an object to the given object store.
   * Fails if the object's key is already present
   * in the object store.
   */
  add<T>(store: Store<T>, val: T): QueryRoot {
    this.checkFinished();
    const doAdd = (tx: IDBTransaction) => {
      tx.objectStore(store.name).add(val);
    };
    this.scheduleFinish();
    this.addWork(doAdd, store.name, true);
    return this;
  }

  /**
   * Get one object from a store by its key.
   */
  get<T>(store: Store<T>, key: any): Promise<T|undefined> {
    this.checkFinished();
    if (key === void 0) {
      throw Error("key must not be undefined");
    }

    const {resolve, promise} = openPromise();

    const doGet = (tx: IDBTransaction) => {
      const req = tx.objectStore(store.name).get(key);
      req.onsuccess = () => {
        resolve(req.result);
      };
    };

    this.addWork(doGet, store.name, false);
    return Promise.resolve()
                  .then(() => this.finish())
                  .then(() => promise);
  }

  /**
   * Get one object from a store by its key.
   */
  getIndexed<I extends IDBValidKey,T>(index: Index<I,T>,
                                      key: I): Promise<T|undefined> {
    this.checkFinished();
    if (key === void 0) {
      throw Error("key must not be undefined");
    }

    const {resolve, promise} = openPromise<void>();

    const doGetIndexed = (tx: IDBTransaction) => {
      const req = tx.objectStore(index.storeName)
                    .index(index.indexName)
                    .get(key);
      req.onsuccess = () => {
        resolve(req.result);
      };
    };

    this.addWork(doGetIndexed, index.storeName, false);
    return Promise.resolve()
                  .then(() => this.finish())
                  .then(() => promise);
  }

  private scheduleFinish() {
    if (!this.finishScheduled) {
      Promise.resolve().then(() => this.finish());
      this.finishScheduled = true;
    }
  }

  /**
   * Finish the query, and start the query in the first place if necessary.
   */
  finish(): Promise<void> {
    if (this.kickoffPromise) {
      return this.kickoffPromise;
    }
    this.kickoffPromise = new Promise<void>((resolve, reject) => {
      // At this point, we can't add any more work
      this.finished = true;
      if (this.work.length == 0) {
        resolve();
        return;
      }
      const mode = this.hasWrite ? "readwrite" : "readonly";
      const tx = this.db.transaction(Array.from(this.stores), mode);
      tx.oncomplete = () => {
        resolve();
      };
      tx.onabort = () => {
        reject(Error("transaction aborted"));
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
    this.checkFinished();
    const doDelete = (tx: IDBTransaction) => {
      tx.objectStore(storeName).delete(key);
    };
    this.scheduleFinish();
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
