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
import { openPromise } from "./promiseUtils.js";
import {
  IDBRequest,
  IDBTransaction,
  IDBValidKey,
  IDBDatabase,
  IDBFactory,
  IDBVersionChangeEvent,
  IDBCursor,
  IDBKeyPath,
  IDBKeyRange,
} from "@gnu-taler/idb-bridge";
import { Logger } from "@gnu-taler/taler-util";

const logger = new Logger("query.ts");

/**
 * Exception that should be thrown by client code to abort a transaction.
 */
export const TransactionAbort = Symbol("transaction_abort");

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

  /**
   * Does this index enforce unique keys?
   *
   * Defaults to false.
   */
  unique?: boolean;
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

type CursorResult<T> = CursorEmptyResult<T> | CursorValueResult<T>;

interface CursorEmptyResult<T> {
  hasValue: false;
}

interface CursorValueResult<T> {
  hasValue: true;
  value: T;
}

class TransactionAbortedError extends Error {
  constructor(m: string) {
    super(m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, TransactionAbortedError.prototype);
  }
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

  async mapAsync<R>(f: (x: T) => Promise<R>): Promise<R[]> {
    const arr: R[] = [];
    while (true) {
      const x = await this.next();
      if (x.hasValue) {
        arr.push(await f(x.value));
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

export interface IndexDescriptor {
  name: string;
  keyPath: IDBKeyPath | IDBKeyPath[];
  multiEntry?: boolean;
  unique?: boolean;
  versionAdded?: number;
}

export interface StoreDescriptor<RecordType> {
  _dummy: undefined & RecordType;
  keyPath?: IDBKeyPath | IDBKeyPath[];
  autoIncrement?: boolean;
  /**
   * Database version that this store was added in, or
   * undefined if added in the first version.
   */
  versionAdded?: number;
}

export interface StoreOptions {
  keyPath?: IDBKeyPath | IDBKeyPath[];
  autoIncrement?: boolean;

  /**
   * Database version that this store was added in, or
   * undefined if added in the first version.
   */
  versionAdded?: number;
}

export function describeContents<RecordType = never>(
  options: StoreOptions,
): StoreDescriptor<RecordType> {
  return {
    keyPath: options.keyPath,
    _dummy: undefined as any,
    autoIncrement: options.autoIncrement,
    versionAdded: options.versionAdded,
  };
}

export function describeIndex(
  name: string,
  keyPath: IDBKeyPath | IDBKeyPath[],
  options: IndexOptions = {},
): IndexDescriptor {
  return {
    keyPath,
    name,
    multiEntry: options.multiEntry,
    unique: options.unique,
    versionAdded: options.versionAdded,
  };
}

interface IndexReadOnlyAccessor<RecordType> {
  iter(query?: IDBKeyRange | IDBValidKey): ResultStream<RecordType>;
  get(query: IDBValidKey): Promise<RecordType | undefined>;
  getAll(
    query: IDBKeyRange | IDBValidKey,
    count?: number,
  ): Promise<RecordType[]>;
}

type GetIndexReadOnlyAccess<RecordType, IndexMap> = {
  [P in keyof IndexMap]: IndexReadOnlyAccessor<RecordType>;
};

interface IndexReadWriteAccessor<RecordType> {
  iter(query: IDBKeyRange | IDBValidKey): ResultStream<RecordType>;
  get(query: IDBValidKey): Promise<RecordType | undefined>;
  getAll(
    query: IDBKeyRange | IDBValidKey,
    count?: number,
  ): Promise<RecordType[]>;
}

type GetIndexReadWriteAccess<RecordType, IndexMap> = {
  [P in keyof IndexMap]: IndexReadWriteAccessor<RecordType>;
};

export interface StoreReadOnlyAccessor<RecordType, IndexMap> {
  get(key: IDBValidKey): Promise<RecordType | undefined>;
  iter(query?: IDBValidKey): ResultStream<RecordType>;
  indexes: GetIndexReadOnlyAccess<RecordType, IndexMap>;
}

export interface InsertResponse {
  /**
   * Key of the newly inserted (via put/add) record.
   */
  key: IDBValidKey;
}

export interface StoreReadWriteAccessor<RecordType, IndexMap> {
  get(key: IDBValidKey): Promise<RecordType | undefined>;
  iter(query?: IDBValidKey): ResultStream<RecordType>;
  put(r: RecordType): Promise<InsertResponse>;
  add(r: RecordType): Promise<InsertResponse>;
  delete(key: IDBValidKey): Promise<void>;
  indexes: GetIndexReadWriteAccess<RecordType, IndexMap>;
}

export interface StoreWithIndexes<
  StoreName extends string,
  SD extends StoreDescriptor<unknown>,
  IndexMap,
> {
  storeName: StoreName;
  store: SD;
  indexMap: IndexMap;

  /**
   * Type marker symbol, to check that the descriptor
   * has been created through the right function.
   */
  mark: Symbol;
}

export type GetRecordType<T> = T extends StoreDescriptor<infer X> ? X : unknown;

const storeWithIndexesSymbol = Symbol("StoreWithIndexesMark");

export function describeStore<
  StoreName extends string,
  SD extends StoreDescriptor<unknown>,
  IndexMap,
>(
  name: StoreName,
  s: SD,
  m: IndexMap,
): StoreWithIndexes<StoreName, SD, IndexMap> {
  return {
    storeName: name,
    store: s,
    indexMap: m,
    mark: storeWithIndexesSymbol,
  };
}

export type GetReadOnlyAccess<BoundStores> = {
  [P in keyof BoundStores]: BoundStores[P] extends StoreWithIndexes<
    infer SN,
    infer SD,
    infer IM
  >
    ? StoreReadOnlyAccessor<GetRecordType<SD>, IM>
    : unknown;
};

export type GetReadWriteAccess<BoundStores> = {
  [P in keyof BoundStores]: BoundStores[P] extends StoreWithIndexes<
    infer SN,
    infer SD,
    infer IM
  >
    ? StoreReadWriteAccessor<GetRecordType<SD>, IM>
    : unknown;
};

type ReadOnlyTransactionFunction<BoundStores, T> = (
  t: GetReadOnlyAccess<BoundStores>,
  rawTx: IDBTransaction,
) => Promise<T>;

type ReadWriteTransactionFunction<BoundStores, T> = (
  t: GetReadWriteAccess<BoundStores>,
  rawTx: IDBTransaction,
) => Promise<T>;

export interface TransactionContext<BoundStores> {
  runReadWrite<T>(f: ReadWriteTransactionFunction<BoundStores, T>): Promise<T>;
  runReadOnly<T>(f: ReadOnlyTransactionFunction<BoundStores, T>): Promise<T>;
}

function runTx<Arg, Res>(
  tx: IDBTransaction,
  arg: Arg,
  f: (t: Arg, t2: IDBTransaction) => Promise<Res>,
): Promise<Res> {
  const stack = Error("Failed transaction was started here.");
  return new Promise((resolve, reject) => {
    let funResult: any = undefined;
    let gotFunResult = false;
    let transactionException: any = undefined;
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
        logger.error(msg);
        logger.error(`${stack.stack}`);
        reject(Error(msg));
      }
      resolve(funResult);
    };
    tx.onerror = () => {
      logger.error("error in transaction");
      logger.error(`${stack.stack}`);
    };
    tx.onabort = () => {
      let msg: string;
      if (tx.error) {
        msg = `Transaction aborted (transaction error): ${tx.error}`;
      } else if (transactionException !== undefined) {
        msg = `Transaction aborted (exception thrown): ${transactionException}`;
      } else {
        msg = "Transaction aborted (no DB error)";
      }
      logger.error(msg);
      logger.error(`${stack.stack}`);
      reject(new TransactionAbortedError(msg));
    };
    const resP = Promise.resolve().then(() => f(arg, tx));
    resP
      .then((result) => {
        gotFunResult = true;
        funResult = result;
      })
      .catch((e) => {
        if (e == TransactionAbort) {
          logger.trace("aborting transaction");
        } else {
          transactionException = e;
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

function makeReadContext(
  tx: IDBTransaction,
  storePick: { [n: string]: StoreWithIndexes<any, any, any> },
): any {
  const ctx: { [s: string]: StoreReadOnlyAccessor<any, any> } = {};
  for (const storeAlias in storePick) {
    const indexes: { [s: string]: IndexReadOnlyAccessor<any> } = {};
    const swi = storePick[storeAlias];
    const storeName = swi.storeName;
    for (const indexAlias in storePick[storeAlias].indexMap) {
      const indexDescriptor: IndexDescriptor =
        storePick[storeAlias].indexMap[indexAlias];
      const indexName = indexDescriptor.name;
      indexes[indexAlias] = {
        get(key) {
          const req = tx.objectStore(storeName).index(indexName).get(key);
          return requestToPromise(req);
        },
        iter(query) {
          const req = tx
            .objectStore(storeName)
            .index(indexName)
            .openCursor(query);
          return new ResultStream<any>(req);
        },
        getAll(query, count) {
          const req = tx
            .objectStore(storeName)
            .index(indexName)
            .getAll(query, count);
          return requestToPromise(req);
        },
      };
    }
    ctx[storeAlias] = {
      indexes,
      get(key) {
        const req = tx.objectStore(storeName).get(key);
        return requestToPromise(req);
      },
      iter(query) {
        const req = tx.objectStore(storeName).openCursor(query);
        return new ResultStream<any>(req);
      },
    };
  }
  return ctx;
}

function makeWriteContext(
  tx: IDBTransaction,
  storePick: { [n: string]: StoreWithIndexes<any, any, any> },
): any {
  const ctx: { [s: string]: StoreReadWriteAccessor<any, any> } = {};
  for (const storeAlias in storePick) {
    const indexes: { [s: string]: IndexReadWriteAccessor<any> } = {};
    const swi = storePick[storeAlias];
    const storeName = swi.storeName;
    for (const indexAlias in storePick[storeAlias].indexMap) {
      const indexDescriptor: IndexDescriptor =
        storePick[storeAlias].indexMap[indexAlias];
      const indexName = indexDescriptor.name;
      indexes[indexAlias] = {
        get(key) {
          const req = tx.objectStore(storeName).index(indexName).get(key);
          return requestToPromise(req);
        },
        iter(query) {
          const req = tx
            .objectStore(storeName)
            .index(indexName)
            .openCursor(query);
          return new ResultStream<any>(req);
        },
        getAll(query, count) {
          const req = tx
            .objectStore(storeName)
            .index(indexName)
            .getAll(query, count);
          return requestToPromise(req);
        },
      };
    }
    ctx[storeAlias] = {
      indexes,
      get(key) {
        const req = tx.objectStore(storeName).get(key);
        return requestToPromise(req);
      },
      iter(query) {
        const req = tx.objectStore(storeName).openCursor(query);
        return new ResultStream<any>(req);
      },
      async add(r) {
        const req = tx.objectStore(storeName).add(r);
        const key = await requestToPromise(req);
        return {
          key: key,
        };
      },
      async put(r) {
        const req = tx.objectStore(storeName).put(r);
        const key = await requestToPromise(req);
        return {
          key: key,
        };
      },
      delete(k) {
        const req = tx.objectStore(storeName).delete(k);
        return requestToPromise(req);
      },
    };
  }
  return ctx;
}

type StoreNamesOf<X> = X extends { [x: number]: infer F }
  ? F extends { storeName: infer I }
    ? I
    : never
  : never;

/**
 * Type-safe access to a database with a particular store map.
 *
 * A store map is the metadata that describes the store.
 */
export class DbAccess<StoreMap> {
  constructor(private db: IDBDatabase, private stores: StoreMap) {}

  idbHandle(): IDBDatabase {
    return this.db;
  }

  /**
   * Run a transaction with all object stores.
   */
  mktxAll(): TransactionContext<StoreMap> {
    const storeNames: string[] = [];
    const accessibleStores: { [x: string]: StoreWithIndexes<any, any, any> } =
      {};

    for (let i = 0; i < this.db.objectStoreNames.length; i++) {
      const sn = this.db.objectStoreNames[i];
      const swi = (this.stores as any)[sn] as StoreWithIndexes<any, any, any>;
      if (!swi) {
        throw Error(`store metadata not available (${sn})`);
      }
      storeNames.push(sn);
      accessibleStores[sn] = swi;
    }

    const runReadOnly = <T>(
      txf: ReadOnlyTransactionFunction<StoreMap, T>,
    ): Promise<T> => {
      const tx = this.db.transaction(storeNames, "readonly");
      const readContext = makeReadContext(tx, accessibleStores);
      return runTx(tx, readContext, txf);
    };

    const runReadWrite = <T>(
      txf: ReadWriteTransactionFunction<StoreMap, T>,
    ): Promise<T> => {
      const tx = this.db.transaction(storeNames, "readwrite");
      const writeContext = makeWriteContext(tx, accessibleStores);
      return runTx(tx, writeContext, txf);
    };

    return {
      runReadOnly,
      runReadWrite,
    };
  }

  /**
   * Run a transaction with selected object stores.
   *
   * The {@link namePicker} must be a function that selects a list of object
   * stores from all available object stores.
   */
  mktx<
    StoreNames extends keyof StoreMap,
    Stores extends StoreMap[StoreNames],
    StoreList extends Stores[],
    BoundStores extends {
      [X in StoreNamesOf<StoreList>]: StoreList[number] & { storeName: X };
    },
  >(namePicker: (x: StoreMap) => StoreList): TransactionContext<BoundStores> {
    const storeNames: string[] = [];
    const accessibleStores: { [x: string]: StoreWithIndexes<any, any, any> } =
      {};

    const storePick = namePicker(this.stores) as any;
    if (typeof storePick !== "object" || storePick === null) {
      throw Error();
    }
    for (const swiPicked of storePick) {
      const swi = swiPicked as StoreWithIndexes<any, any, any>;
      if (swi.mark !== storeWithIndexesSymbol) {
        throw Error("invalid store descriptor returned from selector function");
      }
      storeNames.push(swi.storeName);
      accessibleStores[swi.storeName] = swi;
    }

    const runReadOnly = <T>(
      txf: ReadOnlyTransactionFunction<BoundStores, T>,
    ): Promise<T> => {
      const tx = this.db.transaction(storeNames, "readonly");
      const readContext = makeReadContext(tx, accessibleStores);
      return runTx(tx, readContext, txf);
    };

    const runReadWrite = <T>(
      txf: ReadWriteTransactionFunction<BoundStores, T>,
    ): Promise<T> => {
      const tx = this.db.transaction(storeNames, "readwrite");
      const writeContext = makeWriteContext(tx, accessibleStores);
      return runTx(tx, writeContext, txf);
    };

    return {
      runReadOnly,
      runReadWrite,
    };
  }
}
