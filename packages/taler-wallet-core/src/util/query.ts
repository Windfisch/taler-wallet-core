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
import {
  IDBRequest,
  IDBTransaction,
  IDBValidKey,
  IDBDatabase,
  IDBFactory,
  IDBVersionChangeEvent,
  Event,
  IDBCursor,
} from "@gnu-taler/idb-bridge";
import { Logger } from "./logging";

const logger = new Logger("query.ts");

/**
 * Exception that should be thrown by client code to abort a transaction.
 */
export const TransactionAbort = Symbol("transaction_abort");

export interface StoreParams<T> {
  validator?: (v: T) => T;
  autoIncrement?: boolean;
  keyPath?: string | string[] | null;

  /**
   * Database version that this store was added in, or
   * undefined if added in the first version.
   */
  versionAdded?: number;
}

/**
 * Definition of an object store.
 */
export class Store<N extends string, T> {
  constructor(public name: N, public storeParams?: StoreParams<T>) {}
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

  /**
   * Database version that this store was added in, or
   * undefined if added in the first version.
   */
  versionAdded?: number;
}

function requestToPromise(req: IDBRequest): Promise<any> {
  const stack = Error("Failed request was started here.");
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      console.error("error in DB request", req.error);
      reject(req.error);
      console.error("Request failed:", stack);
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
  private gotCursorEnd = false;
  private awaitingResult = false;

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

  async forEachAsync(f: (x: T) => Promise<void>): Promise<void> {
    while (true) {
      const x = await this.next();
      if (x.hasValue) {
        await f(x.value);
      } else {
        break;
      }
    }
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
      const cursor: IDBCursor | undefined = this.req.result;
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

export type AnyStoreMap = { [s: string]: Store<any, any> };

type StoreName<S> = S extends Store<infer N, any> ? N : never;
type StoreContent<S> = S extends Store<any, infer R> ? R : never;
type IndexRecord<Ind> = Ind extends Index<any, any, any, infer R> ? R : never;

type InferStore<S> = S extends Store<infer N, infer R> ? Store<N, R> : never;
type InferIndex<Ind> = Ind extends Index<
  infer StN,
  infer IndN,
  infer KT,
  infer RT
>
  ? Index<StN, IndN, KT, RT>
  : never;

export class TransactionHandle<StoreTypes extends Store<string, any>> {
  constructor(private tx: IDBTransaction) {}

  put<S extends StoreTypes>(
    store: S,
    value: StoreContent<S>,
    key?: any,
  ): Promise<any> {
    const req = this.tx.objectStore(store.name).put(value, key);
    return requestToPromise(req);
  }

  add<S extends StoreTypes>(
    store: S,
    value: StoreContent<S>,
    key?: any,
  ): Promise<any> {
    const req = this.tx.objectStore(store.name).add(value, key);
    return requestToPromise(req);
  }

  get<S extends StoreTypes>(
    store: S,
    key: any,
  ): Promise<StoreContent<S> | undefined> {
    const req = this.tx.objectStore(store.name).get(key);
    return requestToPromise(req);
  }

  getIndexed<
    St extends StoreTypes,
    Ind extends Index<StoreName<St>, string, any, any>
  >(index: InferIndex<Ind>, key: any): Promise<IndexRecord<Ind> | undefined> {
    const req = this.tx
      .objectStore(index.storeName)
      .index(index.indexName)
      .get(key);
    return requestToPromise(req);
  }

  iter<St extends InferStore<StoreTypes>>(
    store: St,
    key?: any,
  ): ResultStream<StoreContent<St>> {
    const req = this.tx.objectStore(store.name).openCursor(key);
    return new ResultStream<StoreContent<St>>(req);
  }

  iterIndexed<
    St extends InferStore<StoreTypes>,
    Ind extends InferIndex<Index<StoreName<St>, string, any, any>>
  >(index: Ind, key?: any): ResultStream<IndexRecord<Ind>> {
    const req = this.tx
      .objectStore(index.storeName)
      .index(index.indexName)
      .openCursor(key);
    return new ResultStream<IndexRecord<Ind>>(req);
  }

  delete<St extends StoreTypes>(
    store: InferStore<St>,
    key: any,
  ): Promise<void> {
    const req = this.tx.objectStore(store.name).delete(key);
    return requestToPromise(req);
  }

  mutate<St extends StoreTypes>(
    store: InferStore<St>,
    key: any,
    f: (x: StoreContent<St>) => StoreContent<St> | undefined,
  ): Promise<void> {
    const req = this.tx.objectStore(store.name).openCursor(key);
    return applyMutation(req, f);
  }
}

function runWithTransaction<T, StoreTypes extends Store<string, {}>>(
  db: IDBDatabase,
  stores: StoreTypes[],
  f: (t: TransactionHandle<StoreTypes>) => Promise<T>,
  mode: "readonly" | "readwrite",
): Promise<T> {
  const stack = Error("Failed transaction was started here.");
  return new Promise((resolve, reject) => {
    const storeName = stores.map((x) => x.name);
    const tx = db.transaction(storeName, mode);
    let funResult: any = undefined;
    let gotFunResult = false;
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
      logger.error("error in transaction");
      logger.error(`${stack}`);
    };
    tx.onabort = () => {
      if (tx.error) {
        logger.error("Transaction aborted with error:", tx.error);
      } else {
        logger.error("Trasaction aborted (no error)");
      }
      reject(TransactionAbort);
    };
    const th = new TransactionHandle(tx);
    const resP = Promise.resolve().then(() => f(th));
    resP
      .then((result) => {
        gotFunResult = true;
        funResult = result;
      })
      .catch((e) => {
        if (e == TransactionAbort) {
          logger.trace("aborting transaction");
        } else {
          console.error("Transaction failed:", e);
          console.error(stack);
          tx.abort();
        }
      })
      .catch((e) => {
        console.error("fatal: aborting transaction failed", e);
      });
  });
}

/**
 * Definition of an index.
 */
export class Index<
  StoreName extends string,
  IndexName extends string,
  S extends IDBValidKey,
  T
> {
  /**
   * Name of the store that this index is associated with.
   */
  storeName: string;

  /**
   * Options to use for the index.
   */
  options: IndexOptions;

  constructor(
    s: Store<StoreName, T>,
    public indexName: IndexName,
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
 * Return a promise that resolves to the opened IndexedDB database.
 */
export function openDatabase(
  idbFactory: IDBFactory,
  databaseName: string,
  databaseVersion: number,
  onVersionChange: () => void,
  onUpgradeNeeded: (
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number,
    upgradeTransaction: IDBTransaction,
  ) => void,
): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = idbFactory.open(databaseName, databaseVersion);
    req.onerror = (e) => {
      logger.error("database error", e);
      reject(new Error("database error"));
    };
    req.onsuccess = (e) => {
      req.result.onversionchange = (evt: IDBVersionChangeEvent) => {
        logger.info(
          `handling live db version change from ${evt.oldVersion} to ${evt.newVersion}`,
        );
        req.result.close();
        onVersionChange();
      };
      resolve(req.result);
    };
    req.onupgradeneeded = (e) => {
      const db = req.result;
      const newVersion = e.newVersion;
      if (!newVersion) {
        throw Error("upgrade needed, but new version unknown");
      }
      const transaction = req.transaction;
      if (!transaction) {
        throw Error("no transaction handle available in upgrade handler");
      }
      onUpgradeNeeded(db, e.oldVersion, newVersion, transaction);
    };
  });
}

export class Database<StoreMap extends AnyStoreMap> {
  constructor(private db: IDBDatabase, stores: StoreMap) {}

  static deleteDatabase(idbFactory: IDBFactory, dbName: string): void {
    idbFactory.deleteDatabase(dbName);
  }

  async exportDatabase(): Promise<any> {
    const db = this.db;
    const dump = {
      name: db.name,
      stores: {} as { [s: string]: any },
      version: db.version,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(Array.from(db.objectStoreNames));
      tx.addEventListener("complete", () => {
        resolve(dump);
      });
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < db.objectStoreNames.length; i++) {
        const name = db.objectStoreNames[i];
        const storeDump = {} as { [s: string]: any };
        dump.stores[name] = storeDump;
        tx.objectStore(name)
          .openCursor()
          .addEventListener("success", (e: Event) => {
            const cursor = (e.target as any).result;
            if (cursor) {
              storeDump[cursor.key] = cursor.value;
              cursor.continue();
            }
          });
      }
    });
  }

  importDatabase(dump: any): Promise<void> {
    const db = this.db;
    logger.info("importing db", dump);
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(Array.from(db.objectStoreNames), "readwrite");
      if (dump.stores) {
        for (const storeName in dump.stores) {
          const objects = [];
          const dumpStore = dump.stores[storeName];
          for (const key in dumpStore) {
            objects.push(dumpStore[key]);
          }
          logger.info(`importing ${objects.length} records into ${storeName}`);
          const store = tx.objectStore(storeName);
          for (const obj of objects) {
            store.put(obj);
          }
        }
      }
      tx.addEventListener("complete", () => {
        resolve();
      });
    });
  }

  async get<N extends keyof StoreMap, S extends StoreMap[N]>(
    store: S,
    key: IDBValidKey,
  ): Promise<StoreContent<S> | undefined> {
    const tx = this.db.transaction([store.name], "readonly");
    const req = tx.objectStore(store.name).get(key);
    const v = await requestToPromise(req);
    await transactionToPromise(tx);
    return v;
  }

  async getIndexed<Ind extends Index<string, string, any, any>>(
    index: Ind,
    key: IDBValidKey,
  ): Promise<IndexRecord<Ind> | undefined> {
    const tx = this.db.transaction([index.storeName], "readonly");
    const req = tx.objectStore(index.storeName).index(index.indexName).get(key);
    const v = await requestToPromise(req);
    await transactionToPromise(tx);
    return v;
  }

  async put<St extends Store<string, any>>(
    store: St,
    value: StoreContent<St>,
    key?: IDBValidKey,
  ): Promise<any> {
    const tx = this.db.transaction([store.name], "readwrite");
    const req = tx.objectStore(store.name).put(value, key);
    const v = await requestToPromise(req);
    await transactionToPromise(tx);
    return v;
  }

  async mutate<N extends string, T>(
    store: Store<N, T>,
    key: IDBValidKey,
    f: (x: T) => T | undefined,
  ): Promise<void> {
    const tx = this.db.transaction([store.name], "readwrite");
    const req = tx.objectStore(store.name).openCursor(key);
    await applyMutation(req, f);
    await transactionToPromise(tx);
  }

  iter<N extends string, T>(store: Store<N, T>): ResultStream<T> {
    const tx = this.db.transaction([store.name], "readonly");
    const req = tx.objectStore(store.name).openCursor();
    return new ResultStream<T>(req);
  }

  iterIndex<Ind extends Index<string, string, any, any>>(
    index: InferIndex<Ind>,
    query?: any,
  ): ResultStream<IndexRecord<Ind>> {
    const tx = this.db.transaction([index.storeName], "readonly");
    const req = tx
      .objectStore(index.storeName)
      .index(index.indexName)
      .openCursor(query);
    return new ResultStream<IndexRecord<Ind>>(req);
  }

  async runWithReadTransaction<
    T,
    N extends keyof StoreMap,
    StoreTypes extends StoreMap[N]
  >(
    stores: StoreTypes[],
    f: (t: TransactionHandle<StoreTypes>) => Promise<T>,
  ): Promise<T> {
    return runWithTransaction<T, StoreTypes>(this.db, stores, f, "readonly");
  }

  async runWithWriteTransaction<
    T,
    N extends keyof StoreMap,
    StoreTypes extends StoreMap[N]
  >(
    stores: StoreTypes[],
    f: (t: TransactionHandle<StoreTypes>) => Promise<T>,
  ): Promise<T> {
    return runWithTransaction<T, StoreTypes>(this.db, stores, f, "readwrite");
  }
}
