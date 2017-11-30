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


/**
 * Result of an inner join.
 */
export interface JoinResult<L, R> {
  left: L;
  right: R;
}

/**
 * Result of a left outer join.
 */
export interface JoinLeftResult<L, R> {
  left: L;
  right?: R;
}


/**
 * Definition of an object store.
 */
export class Store<T> {
  constructor(public name: string,
              public storeParams?: IDBObjectStoreParameters,
              public validator?: (v: T) => T) {
  }
}


/**
 * Options for an index.
 */
export interface IndexOptions {
  /**
   * If true and the path resolves to an array, create an index entry for
   * each member of the array (instead of one index entry containing the full array).
   *
   * Defaults to false.
   */
  multiEntry?: boolean;
}


/**
 * Definition of an index.
 */
export class Index<S extends IDBValidKey, T> {
  /**
   * Name of the store that this index is associated with.
   */
  storeName: string;

  /**
   * Options to use for the index.
   */
  options: IndexOptions;

  constructor(s: Store<T>, public indexName: string, public keyPath: string | string[], options?: IndexOptions) {
    const defaultOptions = {
      multiEntry: false,
    };
    this.options = { ...defaultOptions, ...(options || {}) };
    this.storeName = s.name;
  }

  /**
   * We want to have the key type parameter in use somewhere,
   * because otherwise the compiler complains.  In iterIndex the
   * key type is pretty useful.
   */
  protected _dummyKey: S|undefined;
}

/**
 * Stream that can be filtered, reduced or joined
 * with indices.
 */
export interface QueryStream<T> {
  /**
   * Join the current query with values from an index.
   * The left side of the join is extracted via a function from the stream's
   * result, the right side of the join is the key of the index.
   */
  indexJoin<S, I extends IDBValidKey>(index: Index<I, S>, keyFn: (obj: T) => I): QueryStream<JoinResult<T, S>>;
  /**
   * Join the current query with values from an index, and keep values in the
   * current stream that don't have a match.  The left side of the join is
   * extracted via a function from the stream's result, the right side of the
   * join is the key of the index.
   */
  indexJoinLeft<S, I extends IDBValidKey>(index: Index<I, S>,
                                          keyFn: (obj: T) => I): QueryStream<JoinLeftResult<T, S>>;
  /**
   * Join the current query with values from another object store.
   * The left side of the join is extracted via a function over the current query,
   * the right side of the join is the key of the object store.
   */
  keyJoin<S, I extends IDBValidKey>(store: Store<S>, keyFn: (obj: T) => I): QueryStream<JoinResult<T, S>>;

  /**
   * Only keep elements in the result stream for which the predicate returns
   * true.
   */
  filter(f: (x: T) => boolean): QueryStream<T>;

  /**
   * Reduce the stream, resulting in a single value.
   */
  reduce<S>(f: (v: T, acc?: S) => S, start?: S): Promise<S>;

  /**
   * Map each element of the stream using a function, resulting in another
   * stream of a different type.
   */
  map<S>(f: (x: T) => S): QueryStream<S>;

  /**
   * Map each element of the stream to a potentially empty array, and collect
   * the result in a stream of the flattened arrays.
   */
  flatMap<S>(f: (x: T) => S[]): QueryStream<S>;

  /**
   * Collect the stream into an array and return a promise for it.
   */
  toArray(): Promise<T[]>;

  /**
   * Get the first value of the stream.
   */
  first(): QueryValue<T>;

  /**
   * Run the query without returning a result.
   * Useful for queries with side effects.
   */
  run(): Promise<void>;
}


/**
 * Query result that consists of at most one value.
 */
export interface QueryValue<T> {
  /**
   * Apply a function to a query value.
   */
  map<S>(f: (x: T) => S): QueryValue<S>;
  /**
   * Conditionally execute either of two queries based
   * on a property of this query value.
   *
   * Useful to properly implement complex queries within a transaction (as
   * opposed to just computing the conditional and then executing either
   * branch).  This is necessary since IndexedDB does not allow long-lived
   * transactions.
   */
  cond<R>(f: (x: T) => boolean, onTrue: (r: QueryRoot) => R, onFalse: (r: QueryRoot) => R): Promise<void>;
}


abstract class BaseQueryValue<T> implements QueryValue<T> {

  constructor(public root: QueryRoot) {
  }

  map<S>(f: (x: T) => S): QueryValue<S> {
    return new MapQueryValue<T, S>(this, f);
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
  private gotValue = false;
  private s: QueryStreamBase<T>;

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

class MapQueryValue<T, S> extends BaseQueryValue<S> {
  constructor(private v: BaseQueryValue<T>, private mapFn: (x: T) => S) {
    super(v.root);
  }

  subscribeOne(f: SubscribeOneFn): void {
    this.v.subscribeOne((v, tx) => this.mapFn(v));
  }
}


/**
 * Exception that should be thrown by client code to abort a transaction.
 */
export const AbortTransaction = Symbol("abort_transaction");

/**
 * Get an unresolved promise together with its extracted resolve / reject
 * function.
 */
export function openPromise<T>(): any {
  let resolve: ((x?: any) => void) | null = null;
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


abstract class QueryStreamBase<T> implements QueryStream<T> {
  abstract subscribe(f: (isDone: boolean,
                         value: any,
                         tx: IDBTransaction) => void): void;
  constructor(public root: QueryRoot) {
  }

  first(): QueryValue<T> {
    return new FirstQueryValue(this);
  }

  flatMap<S>(f: (x: T) => S[]): QueryStream<S> {
    return new QueryStreamFlatMap<T, S>(this, f);
  }

  map<S>(f: (x: T) => S): QueryStream<S> {
    return new QueryStreamMap(this, f);
  }

  indexJoin<S, I extends IDBValidKey>(index: Index<I, S>,
                                      keyFn: (obj: T) => I): QueryStream<JoinResult<T, S>> {
    this.root.addStoreAccess(index.storeName, false);
    return new QueryStreamIndexJoin<T, S>(this, index.storeName, index.indexName, keyFn);
  }

  indexJoinLeft<S, I extends IDBValidKey>(index: Index<I, S>,
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
    const {resolve, promise} = openPromise();
    const values: T[] = [];

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
    const {resolve, promise} = openPromise();
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

  run(): Promise<void> {
    const {resolve, promise} = openPromise();

    this.subscribe((isDone, value) => {
      if (isDone) {
        resolve();
        return;
      }
    });

    return Promise.resolve()
                  .then(() => this.root.finish())
                  .then(() => promise);
  }
}

type FilterFn = (e: any) => boolean;
type SubscribeFn = (done: boolean, value: any, tx: IDBTransaction) => void;
type SubscribeOneFn = (value: any, tx: IDBTransaction) => void;

class QueryStreamFilter<T> extends QueryStreamBase<T> {
  constructor(public s: QueryStreamBase<T>, public filterFn: FilterFn) {
    super(s.root);
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


class QueryStreamFlatMap<T, S> extends QueryStreamBase<S> {
  constructor(public s: QueryStreamBase<T>, public flatMapFn: (v: T) => S[]) {
    super(s.root);
  }

  subscribe(f: SubscribeFn) {
    this.s.subscribe((isDone, value, tx) => {
      if (isDone) {
        f(true, undefined, tx);
        return;
      }
      const values = this.flatMapFn(value);
      for (const v in values) {
        f(false, v, tx);
      }
    });
  }
}


class QueryStreamMap<S, T> extends QueryStreamBase<T> {
  constructor(public s: QueryStreamBase<S>, public mapFn: (v: S) => T) {
    super(s.root);
  }

  subscribe(f: SubscribeFn) {
    this.s.subscribe((isDone, value, tx) => {
      if (isDone) {
        f(true, undefined, tx);
        return;
      }
      const mappedValue = this.mapFn(value);
      f(false, mappedValue, tx);
    });
  }
}


class QueryStreamIndexJoin<T, S> extends QueryStreamBase<JoinResult<T, S>> {
  constructor(public s: QueryStreamBase<T>, public storeName: string, public indexName: string,
              public key: any) {
    super(s.root);
  }

  subscribe(f: SubscribeFn) {
    this.s.subscribe((isDone, value, tx) => {
      if (isDone) {
        f(true, undefined, tx);
        return;
      }
      const s = tx.objectStore(this.storeName).index(this.indexName);
      const req = s.openCursor(IDBKeyRange.only(this.key(value)));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          f(false, {left: value, right: cursor.value}, tx);
          cursor.continue();
        }
      };
    });
  }
}


class QueryStreamIndexJoinLeft<T, S> extends QueryStreamBase<JoinLeftResult<T, S>> {
  constructor(public s: QueryStreamBase<T>, public storeName: string, public indexName: string,
              public key: any) {
    super(s.root);
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
        const cursor = req.result;
        if (cursor) {
          gotMatch = true;
          f(false, {left: value, right: cursor.value}, tx);
          cursor.continue();
        } else {
          if (!gotMatch) {
            f(false, {left: value}, tx);
          }
        }
      };
    });
  }
}


class QueryStreamKeyJoin<T, S> extends QueryStreamBase<JoinResult<T, S>> {
  constructor(public s: QueryStreamBase<T>, public storeName: string,
              public key: any) {
    super(s.root);
  }

  subscribe(f: SubscribeFn) {
    this.s.subscribe((isDone, value, tx) => {
      if (isDone) {
        f(true, undefined, tx);
        return;
      }
      const s = tx.objectStore(this.storeName);
      const req = s.openCursor(IDBKeyRange.only(this.key(value)));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          f(false, {left: value, right: cursor.value}, tx);
          cursor.continue();
        } else {
          f(true, undefined, tx);
        }
      };
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

    const doIt = (tx: IDBTransaction) => {
      const {indexName = void 0, only = void 0} = this.options;
      let s: any;
      if (indexName !== void 0) {
        s = tx.objectStore(this.storeName)
              .index(this.options.indexName);
      } else {
        s = tx.objectStore(this.storeName);
      }
      let kr: IDBKeyRange | undefined;
      if (only !== undefined) {
        kr = IDBKeyRange.only(this.options.only);
      }
      const req = s.openCursor(kr);
      req.onsuccess = () => {
        const cursor: IDBCursorWithValue = req.result;
        if (cursor) {
          for (const f of this.subscribers) {
            f(false, cursor.value, tx);
          }
          cursor.continue();
        } else {
          for (const f of this.subscribers) {
            f(true, undefined, tx);
          }
        }
      };
    };

    this.root.addWork(doIt);
  }

  subscribe(f: SubscribeFn) {
    this.subscribers.push(f);
  }
}


/**
 * Root wrapper around an IndexedDB for queries with a fluent interface.
 */
export class QueryRoot {
  private work: Array<((t: IDBTransaction) => void)> = [];
  private stores = new Set();
  private kickoffPromise: Promise<void>;

  /**
   * Some operations is a write operation,
   * and we need to do a "readwrite" transaction/
   */
  private hasWrite: boolean;

  private finishScheduled: boolean;

  private finished: boolean = false;

  private keys: { [keyName: string]: IDBValidKey } = {};

  constructor(public db: IDBDatabase) {
  }

  /**
   * Get a named key that was created during the query.
   */
  key(keyName: string): IDBValidKey|undefined {
    return this.keys[keyName];
  }

  private checkFinished() {
    if (this.finished) {
      throw Error("Can't add work to query after it was started");
    }
  }

  /**
   * Get a stream of all objects in the store.
   */
  iter<T>(store: Store<T>): QueryStream<T> {
    this.checkFinished();
    this.stores.add(store.name);
    this.scheduleFinish();
    return new IterQueryStream<T>(this, store.name, {});
  }

  /**
   * Count the number of objects in a store.
   */
  count<T>(store: Store<T>): Promise<number> {
    this.checkFinished();
    const {resolve, promise} = openPromise();

    const doCount = (tx: IDBTransaction) => {
      const s = tx.objectStore(store.name);
      const req = s.count();
      req.onsuccess = () => {
        resolve(req.result);
      };
    };

    this.addWork(doCount, store.name, false);
    return Promise.resolve()
                  .then(() => this.finish())
                  .then(() => promise);

  }

  /**
   * Delete all objects in a store that match a predicate.
   */
  deleteIf<T>(store: Store<T>, predicate: (x: T, n: number) => boolean): QueryRoot {
    this.checkFinished();
    const doDeleteIf = (tx: IDBTransaction) => {
      const s = tx.objectStore(store.name);
      const req = s.openCursor();
      let n = 0;
      req.onsuccess = () => {
        const cursor: IDBCursorWithValue = req.result;
        if (cursor) {
          if (predicate(cursor.value, n++)) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    };
    this.addWork(doDeleteIf, store.name, true);
    return this;
  }

  iterIndex<S extends IDBValidKey, T>(index: Index<S, T>,
                                      only?: S): QueryStream<T> {
    this.checkFinished();
    this.stores.add(index.storeName);
    this.scheduleFinish();
    return new IterQueryStream<T>(this, index.storeName, {
      indexName: index.indexName,
      only,
    });
  }

  /**
   * Put an object into the given object store.
   * Overrides if an existing object with the same key exists
   * in the store.
   */
  put<T>(store: Store<T>, val: T, keyName?: string): QueryRoot {
    this.checkFinished();
    const doPut = (tx: IDBTransaction) => {
      const req = tx.objectStore(store.name).put(val);
      if (keyName) {
        req.onsuccess = () => {
            this.keys[keyName] = req.result;
        };
      }
    };
    this.scheduleFinish();
    this.addWork(doPut, store.name, true);
    return this;
  }


  putWithResult<T>(store: Store<T>, val: T): Promise<IDBValidKey> {
    this.checkFinished();
    const {resolve, promise} = openPromise();
    const doPutWithResult = (tx: IDBTransaction) => {
      const req = tx.objectStore(store.name).put(val);
      req.onsuccess = () => {
        resolve(req.result);
      };
      this.scheduleFinish();
    };
    this.addWork(doPutWithResult, store.name, true);
    return Promise.resolve()
                  .then(() => this.finish())
                  .then(() => promise);
  }


  /**
   * Update objects inside a transaction.
   *
   * If the mutation function throws AbortTransaction, the whole transaction will be aborted.
   * If the mutation function returns undefined or null, no modification will be made.
   */
  mutate<T>(store: Store<T>, key: any, f: (v: T|undefined) => T|undefined): QueryRoot {
    this.checkFinished();
    const doPut = (tx: IDBTransaction) => {
      const req = tx.objectStore(store.name).openCursor(IDBKeyRange.only(key));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const value = cursor.value;
          let modifiedValue: T|undefined;
          try {
            modifiedValue = f(value);
          } catch (e) {
            if (e === AbortTransaction) {
              tx.abort();
              return;
            }
            throw e;
          }
          if (modifiedValue !== undefined && modifiedValue !== null) {
            cursor.update(modifiedValue);
          }
          cursor.continue();
        }
      };
    };
    this.scheduleFinish();
    this.addWork(doPut, store.name, true);
    return this;
  }


  /**
   * Add all object from an iterable to the given object store.
   */
  putAll<T>(store: Store<T>, iterable: T[]): QueryRoot {
    this.checkFinished();
    const doPutAll = (tx: IDBTransaction) => {
      for (const obj of iterable) {
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
  getIndexed<I extends IDBValidKey, T>(index: Index<I, T>,
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
      if (this.work.length === 0) {
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
      for (const w of this.work) {
        w(tx);
      }
    });
    return this.kickoffPromise;
  }

  /**
   * Delete an object by from the given object store.
   */
  delete<T>(store: Store<T>, key: any): QueryRoot {
    this.checkFinished();
    const doDelete = (tx: IDBTransaction) => {
      tx.objectStore(store.name).delete(key);
    };
    this.scheduleFinish();
    this.addWork(doDelete, store.name, true);
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
