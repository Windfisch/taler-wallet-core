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
 * Imports.
 */
import { openPromise } from "./promiseUtils";

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
  constructor(
    public name: string,
    public storeParams?: IDBObjectStoreParameters,
    public validator?: (v: T) => T,
  ) {}
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

function requestToPromise(req: IDBRequest): Promise<any> {
  const stack = Error("Failed request was started here.");
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      console.log("error in DB request", req.error);
      reject(req.error);
      console.log("Request failed:", stack);
    };
  });
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  const stack = Error("Failed transaction was started here.");
  return new Promise((resolve, reject) => {
    tx.onabort = () => {
      reject(TransactionAbort);
    };
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      console.error("Transaction failed:", stack);
      reject(tx.error);
    };
  });
}

export async function oneShotGet<T>(
  db: IDBDatabase,
  store: Store<T>,
  key: any,
): Promise<T | undefined> {
  const tx = db.transaction([store.name], "readonly");
  const req = tx.objectStore(store.name).get(key);
  const v = await requestToPromise(req);
  await transactionToPromise(tx);
  return v;
}

export async function oneShotGetIndexed<S extends IDBValidKey, T>(
  db: IDBDatabase,
  index: Index<S, T>,
  key: any,
): Promise<T | undefined> {
  const tx = db.transaction([index.storeName], "readonly");
  const req = tx
    .objectStore(index.storeName)
    .index(index.indexName)
    .get(key);
  const v = await requestToPromise(req);
  await transactionToPromise(tx);
  return v;
}

export async function oneShotPut<T>(
  db: IDBDatabase,
  store: Store<T>,
  value: T,
  key?: any,
): Promise<any> {
  const tx = db.transaction([store.name], "readwrite");
  const req = tx.objectStore(store.name).put(value, key);
  const v = await requestToPromise(req);
  await transactionToPromise(tx);
  return v;
}

function applyMutation<T>(
  req: IDBRequest,
  f: (x: T) => T | undefined,
): Promise<void> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const val = cursor.value;
        const modVal = f(val);
        if (modVal !== undefined && modVal !== null) {
          const req2: IDBRequest = cursor.update(modVal);
          req2.onerror = () => {
            reject(req2.error);
          };
          req2.onsuccess = () => {
            cursor.continue();
          };
        } else {
          cursor.continue();
        }
      } else {
        resolve();
      }
    };
    req.onerror = () => {
      reject(req.error);
    };
  });
}

export async function oneShotMutate<T>(
  db: IDBDatabase,
  store: Store<T>,
  key: any,
  f: (x: T) => T | undefined,
): Promise<void> {
  const tx = db.transaction([store.name], "readwrite");
  const req = tx.objectStore(store.name).openCursor(key);
  await applyMutation(req, f);
  await transactionToPromise(tx);
}

type CursorResult<T> = CursorEmptyResult<T> | CursorValueResult<T>;

interface CursorEmptyResult<T> {
  hasValue: false;
}

interface CursorValueResult<T> {
  hasValue: true;
  value: T;
}

class ResultStream<T> {
  private currentPromise: Promise<void>;
  private gotCursorEnd: boolean = false;
  private awaitingResult: boolean = false;

  constructor(private req: IDBRequest) {
    this.awaitingResult = true;
    let p = openPromise<void>();
    this.currentPromise = p.promise;
    req.onsuccess = () => {
      if (!this.awaitingResult) {
        throw Error("BUG: invariant violated");
      }
      const cursor = req.result;
      if (cursor) {
        this.awaitingResult = false;
        p.resolve();
        p = openPromise<void>();
        this.currentPromise = p.promise;
      } else {
        this.gotCursorEnd = true;
        p.resolve();
      }
    };
    req.onerror = () => {
      p.reject(req.error);
    };
  }

  async toArray(): Promise<T[]> {
    const arr: T[] = [];
    while (true) {
      const x = await this.next();
      if (x.hasValue) {
        arr.push(x.value);
      } else {
        break;
      }
    }
    return arr;
  }

  async map<R>(f: (x: T) => R): Promise<R[]> {
    const arr: R[] = [];
    while (true) {
      const x = await this.next();
      if (x.hasValue) {
        arr.push(f(x.value));
      } else {
        break;
      }
    }
    return arr;
  }

  async forEach(f: (x: T) => void): Promise<void> {
    while (true) {
      const x = await this.next();
      if (x.hasValue) {
        f(x.value);
      } else {
        break;
      }
    }
  }

  async filter(f: (x: T) => boolean): Promise<T[]> {
    const arr: T[] = [];
    while (true) {
      const x = await this.next();
      if (x.hasValue) {
        if (f(x.value)) {
          arr.push(x.value);
        }
      } else {
        break;
      }
    }
    return arr;
  }

  async next(): Promise<CursorResult<T>> {
    if (this.gotCursorEnd) {
      return { hasValue: false };
    }
    if (!this.awaitingResult) {
      const cursor = this.req.result;
      if (!cursor) {
        throw Error("assertion failed");
      }
      this.awaitingResult = true;
      cursor.continue();
    }
    await this.currentPromise;
    if (this.gotCursorEnd) {
      return { hasValue: false };
    }
    const cursor = this.req.result;
    if (!cursor) {
      throw Error("assertion failed");
    }
    return { hasValue: true, value: cursor.value };
  }
}

export function oneShotIter<T>(
  db: IDBDatabase,
  store: Store<T>,
): ResultStream<T> {
  const tx = db.transaction([store.name], "readonly");
  const req = tx.objectStore(store.name).openCursor();
  return new ResultStream<T>(req);
}

export function oneShotIterIndex<S extends IDBValidKey, T>(
  db: IDBDatabase,
  index: Index<S, T>,
  query?: any,
): ResultStream<T> {
  const tx = db.transaction([index.storeName], "readonly");
  const req = tx
    .objectStore(index.storeName)
    .index(index.indexName)
    .openCursor(query);
  return new ResultStream<T>(req);
}

export class TransactionHandle {
  constructor(private tx: IDBTransaction) {}

  put<T>(store: Store<T>, value: T, key?: any): Promise<any> {
    const req = this.tx.objectStore(store.name).put(value, key);
    return requestToPromise(req);
  }

  add<T>(store: Store<T>, value: T, key?: any): Promise<any> {
    const req = this.tx.objectStore(store.name).add(value, key);
    return requestToPromise(req);
  }

  get<T>(store: Store<T>, key: any): Promise<T | undefined> {
    const req = this.tx.objectStore(store.name).get(key);
    return requestToPromise(req);
  }

  getIndexed<S extends IDBValidKey, T>(
    index: Index<S, T>,
    key: any,
  ): Promise<T | undefined> {
    const req = this.tx
      .objectStore(index.storeName)
      .index(index.indexName)
      .get(key);
    return requestToPromise(req);
  }

  iter<T>(store: Store<T>, key?: any): ResultStream<T> {
    const req = this.tx.objectStore(store.name).openCursor(key);
    return new ResultStream<T>(req);
  }

  delete<T>(store: Store<T>, key: any): Promise<void> {
    const req = this.tx.objectStore(store.name).delete(key);
    return requestToPromise(req);
  }

  mutate<T>(store: Store<T>, key: any, f: (x: T) => T | undefined) {
    const req = this.tx.objectStore(store.name).openCursor(key);
    return applyMutation(req, f);
  }
}

export function runWithReadTransaction<T>(
  db: IDBDatabase,
  stores: Store<any>[],
  f: (t: TransactionHandle) => Promise<T>,
): Promise<T> {
  return runWithTransaction<T>(db, stores, f, "readonly");
}

export function runWithWriteTransaction<T>(
  db: IDBDatabase,
  stores: Store<any>[],
  f: (t: TransactionHandle) => Promise<T>,
): Promise<T> {
  return runWithTransaction<T>(db, stores, f, "readwrite");
}

function runWithTransaction<T>(
  db: IDBDatabase,
  stores: Store<any>[],
  f: (t: TransactionHandle) => Promise<T>,
  mode: "readonly" | "readwrite",
): Promise<T> {
  const stack = Error("Failed transaction was started here.");
  return new Promise((resolve, reject) => {
    const storeName = stores.map(x => x.name);
    const tx = db.transaction(storeName, mode);
    let funResult: any = undefined;
    let gotFunResult: boolean = false;
    tx.oncomplete = () => {
      // This is a fatal error: The transaction completed *before*
      // the transaction function returned.  Likely, the transaction
      // function waited on a promise that is *not* resolved in the
      // microtask queue, thus triggering the auto-commit behavior.
      // Unfortunately, the auto-commit behavior of IDB can't be switched
      // of.  There are some proposals to add this functionality in the future.
      if (!gotFunResult) {
        const msg =
          "BUG: transaction closed before transaction function returned";
        console.error(msg);
        reject(Error(msg));
      }
      resolve(funResult);
    };
    tx.onerror = () => {
      console.error("error in transaction");
      console.error(stack);
    };
    tx.onabort = () => {
      if (tx.error) {
        console.error("Transaction aborted with error:", tx.error);
      } else {
        console.log("Trasaction aborted (no error)");
      }
      reject(TransactionAbort);
    };
    const th = new TransactionHandle(tx);
    const resP = f(th);
    resP
      .then(result => {
        gotFunResult = true;
        funResult = result;
      })
      .catch(e => {
        if (e == TransactionAbort) {
          console.info("aborting transaction");
        } else {
          tx.abort();
          console.error("Transaction failed:", e);
          console.error(stack);
        }
      });
  });
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

  constructor(
    s: Store<T>,
    public indexName: string,
    public keyPath: string | string[],
    options?: IndexOptions,
  ) {
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
  protected _dummyKey: S | undefined;
}

/**
 * Exception that should be thrown by client code to abort a transaction.
 */
export const TransactionAbort = Symbol("transaction_abort");
