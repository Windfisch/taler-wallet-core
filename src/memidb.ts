/*
 This file is part of TALER
 (C) 2017 Inria and GNUnet e.V.

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
 * In-memory implementation of the IndexedDB interface.
 *
 * Transactions support rollback, but they are all run sequentially within the
 * same MemoryIDBFactory.
 *
 * Every operation involves copying the whole database state, making it only
 * feasible for small databases.
 */

/* work in progres ... */
/* tslint:disable */ 


const structuredClone = require("structured-clone");


interface Store {
  name: string;
  keyPath?: string | string[];
  keyGenerator: number;
  autoIncrement: boolean;
  objects: { [primaryKey: string]: any };
  indices: { [indexName: string]: Index };
}

interface Index {
  multiEntry: boolean;
  unique: boolean;

  /**
   * Map the index's key to the primary key.
   */
  map: { [indexKey: string]: string[] };
}


interface Database {
  name: string;
  version: number;
  stores: { [name: string]: Store };
}


interface Databases {
  [name: string]: Database;
}


/**
 * Resolved promise, used to schedule various things
 * by calling .next on it.
 */
const alreadyResolved = Promise.resolve();


class MyDomStringList extends Array<string> implements DOMStringList {
  contains(s: string) {
    for (let i = 0; i < this.length; i++) {
      if (s === this[i]) {
        return true;
      }
    }
    return false;
  }
  item(i: number) {
    return this[i];
  }
}


//class MyKeyRange implements IDBKeyRange {
//  static only(value: any): IDBKeyRange {
//    return new MyKeyRange(value, value, false, false);
//  }
//
//  static bound(lower: any, upper: any, lowerOpen: boolean = false, upperOpen: boolean = false) {
//    return new MyKeyRange(lower, upper, lowerOpen, upperOpen);
//  }
//
//  static lowerBound(lower: any, lowerOpen: boolean = false) {
//    return new MyKeyRange(lower, undefined, lowerOpen, true);
//  }
//
//  static upperBound(upper: any, upperOpen: boolean = false) {
//    return new MyKeyRange(undefined, upper, true, upperOpen);
//  }
//
//  constructor(public lower: any, public upper: any, public lowerOpen: boolean, public upperOpen: boolean) {
//  }
//}


/**
 * Type guard for an IDBKeyRange.
 */
export function isKeyRange(obj: any): obj is IDBKeyRange {
  return (typeof obj === "object" &&
          "lower" in obj && "upper" in obj &&
          "lowerOpen" in obj && "upperOpen" in obj);
}


class IndexHandle implements IDBIndex {

  _unique: boolean;
  _multiEntry: boolean;

  get keyPath(): string | string[] {
    throw Error("not implemented");
  }

  get name () {
    return this.indexName;
  }

  get unique() {
    return this._unique;
  }

  get multiEntry() {
    return this._multiEntry;
  }

  constructor(public objectStore: MyObjectStore, public indexName: string) {
  }

  count(key?: IDBKeyRange | IDBValidKey): IDBRequest {
    throw Error("not implemented");
  }

  get(key: IDBKeyRange | IDBValidKey): IDBRequest {
    throw Error("not implemented");
  }

  getKey(key: IDBKeyRange | IDBValidKey): IDBRequest {
    throw Error("not implemented");
  }

  openCursor(range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection): IDBRequest {
    throw Error("not implemented");
  }

  openKeyCursor(range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection): IDBRequest {
    throw Error("not implemented");
  }
}

class MyRequest implements IDBRequest {
  onerror: (this: IDBRequest, ev: Event) => any;

  onsuccess: (this: IDBRequest, ev: Event) => any;
  successHandlers: Array<(this: IDBRequest, ev: Event) => any> = [];

  done: boolean = false;
  _result: any;

  constructor(public _transaction: Transaction, public runner: () => void) {
  }

  callSuccess(ev: Event) {
    if (this.onsuccess) {
      this.onsuccess(ev);
    }
    for (let h of this.successHandlers) {
      h.call(this, ev);
    }
  }

  get error(): DOMException {
    return (null as any) as DOMException;
  }

  get result(): any {
    return this._result;
  }

  get source() {
    // buggy type definitions don't allow null even though it's in
    // the spec.
    return (null as any) as (IDBObjectStore | IDBIndex | IDBCursor);
  }

  get transaction() {
    return this._transaction;
  }

  dispatchEvent(evt: Event): boolean {
    return false;
  }

  get readyState() {
    if (this.done) {
      return "done";
    }
    return "pending";
  }

  removeEventListener(type: string,
                      listener?: EventListenerOrEventListenerObject,
                      options?: boolean | EventListenerOptions): void {
    throw Error("not implemented");
  }

  addEventListener(type: string,
                   listener: EventListenerOrEventListenerObject,
                   useCapture?: boolean): void {
    switch (type) {
      case "success":
        this.successHandlers.push(listener as any);
        break;
    }
  }
}

class OpenDBRequest extends MyRequest implements IDBOpenDBRequest {
  onblocked: (this: IDBOpenDBRequest, ev: Event) => any;

  onupgradeneeded: (this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => any;
  upgradeneededHandlers: Array<(this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => any> = [];

  callOnupgradeneeded(ev: IDBVersionChangeEvent) {
    if (this.onupgradeneeded) {
      this.onupgradeneeded(ev);
    }
    for (let h of this.upgradeneededHandlers) {
      h.call(this, ev);
    }
  }

  removeEventListener(type: string,
                      listener?: EventListenerOrEventListenerObject,
                      options?: boolean | EventListenerOptions): void {
    throw Error("not implemented");
  }

  addEventListener(type: string,
                   listener: EventListenerOrEventListenerObject,
                   useCapture?: boolean): void {
    switch (type) {
      case "upgradeneeded":
        this.upgradeneededHandlers.push(listener as any);
        break;
      default:
        super.addEventListener(type, listener, useCapture);
    }
  }
}

function follow(x: any, s: string, replacement?: any): any {
  if (s === "") {
    return x;
  }
  const ptIdx = s.indexOf(".");
  if (ptIdx < 0) {
    const v = x[s];
    if (replacement !== undefined) {
      x[s] = replacement;
    }
    return v;
  } else {
    const identifier = s.substring(0, ptIdx);
    const rest = s.substring(ptIdx + 1);
    return follow(x[identifier], rest, replacement);
  }
}

export function evaluateKeyPath(x: any, path: string | string[], replacement?: any): any {
  if (typeof path === "string") {
    return follow(x, path, replacement);
  } else if (Array.isArray(path)) {
    const res: any[] = [];
    for (let s of path) {
      let c = follow(x, s, replacement);
      if (c === undefined) {
        return undefined;
      }
      res.push(c);
    }
    return res;
  } else {
    throw Error("invalid key path, must be string or array of strings");
  }
}

function stringifyKey(key: any) {
  return JSON.stringify(key);
}

export function isValidKey(key: any, memo: any[] = []) {
  if (typeof key === "string" || typeof key === "number" || key instanceof Date) {
    return true;
  }
  if (Array.isArray(key)) {
    for (const element of key) {
      if (!isValidKey(element, memo.concat([key]))) {
        return false;
      }
    }
    return true;
  }
  return false;
}

class MyObjectStore implements IDBObjectStore  {

  _keyPath: string | string[] | undefined;
  _autoIncrement: boolean;

  get indexNames() {
    return new DOMStringList();
  }

  constructor(public transaction: Transaction, public storeName: string) {
    this._keyPath = this.transaction.transactionDbData.stores[this.storeName].keyPath as (string | string[]);
    this._autoIncrement = this.transaction.transactionDbData.stores[this.storeName].autoIncrement;
  }

  get keyPath(): string | string[] {
    // TypeScript definitions are wrong here and don't permit a null keyPath
    return this._keyPath as (string | string[]);
  }

  get name() {
    return this.storeName;
  }

  get autoIncrement() {
    return this._autoIncrement;
  }

  storeImpl(originalValue: any, key: any|undefined, allowExisting: boolean) {
    if (this.transaction.mode === "readonly") {
      throw Error();
    }
    if (!this.transaction.active) {
      throw Error();
    }
    if (!this.transaction.transactionDbData.stores.hasOwnProperty(this.storeName)) {
      throw Error("object store was deleted");
    }

    const store = this.transaction.transactionDbData.stores[this.storeName];

    const value = structuredClone(originalValue);

    if (this.keyPath) {
      // we're dealine with in-line keys
      if (key) {
        throw Error("keys not allowed with in-line keys");
      }
      key = evaluateKeyPath(value, this.keyPath);
      if (!key && !this.autoIncrement) {
        throw Error("key path must evaluate to key for in-line stores without autoIncrement");
      }
      if (this.autoIncrement) {
        if (key && typeof key === "number") {
          store.keyGenerator = key + 1;
        } else {
          key = store.keyGenerator;
          store.keyGenerator += 1;
          evaluateKeyPath(value, this.keyPath, key);
        }
      }
    } else {
      // we're dealing with out-of-line keys
      if (!key && !this.autoIncrement) {
        throw Error("key must be provided for out-of-line stores without autoIncrement");
      }
      key = this.transaction.transactionDbData.stores
      if (this.autoIncrement) {
        if (key && typeof key === "number") {
          store.keyGenerator = key + 1;
        } else {
          key = store.keyGenerator;
          store.keyGenerator += 1;
        }
      }
    }

    const stringKey = stringifyKey(key);

    if (store.objects.hasOwnProperty(stringKey) && !allowExisting) {
      throw Error("key already exists");
    }

    store.objects[stringKey] = value;

    const req = new MyRequest(this.transaction, () => {
    });
    return req;
  }

  put(value: any, key?: any): IDBRequest {
    return this.storeImpl(value, key, true);
  }

  add(value: any, key?: any): IDBRequest {
    return this.storeImpl(value, key, false);
  }

  delete(key: any): IDBRequest {
    throw Error("not implemented");
  }

  get(key: any): IDBRequest {
    throw Error("not implemented");
  }

  deleteIndex(indexName: string) {
    throw Error("not implemented");
  }

  clear(): IDBRequest {
    throw Error("not implemented");
  }

  count(key?: any): IDBRequest {
    throw Error("not implemented");
  }

  createIndex(name: string, keyPath: string | string[], optionalParameters?: IDBIndexParameters): IDBIndex {
    throw Error("not implemented");
  }

  index(indexName: string): IDBIndex {
    return new IndexHandle(this, indexName);
  }

  openCursor(range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection): IDBRequest {
    throw Error("not implemented");
  }
}


class Db implements IDBDatabase {
  
  onabort: (this: IDBDatabase, ev: Event) => any;
  onerror: (this: IDBDatabase, ev: Event) => any;
  onversionchange: (ev: IDBVersionChangeEvent) => any;

  _storeNames: string[] = [];

  constructor(private _name: string, private _version: number, private factory: MemoryIDBFactory) {
    for (let storeName in this.dbData.stores) {
      if (this.dbData.stores.hasOwnProperty(storeName)) {
        this._storeNames.push(storeName);
      }
    }
    this._storeNames.sort();
  }

  get dbData(): Database {
    return this.factory.data[this._name];
  }

  set dbData(data) {
    this.factory.data[this._name] = data;
  }

  get name() {
    return this._name;
  }

  get objectStoreNames() {
    return new MyDomStringList(...this._storeNames);
  }

  get version() {
    return this._version;
  }

  close() {
  }

  createObjectStore(name: string, optionalParameters?: IDBObjectStoreParameters): IDBObjectStore {
    let tx = this.factory.getTransaction();
    if (tx.mode !== "versionchange") {
      throw Error("invalid mode");
    }

    const td = tx.transactionDbData;
    if (td.stores[name]) {
      throw Error("object store already exists");
    }

    td.stores[name] = {
      autoIncrement: !!(optionalParameters && optionalParameters.autoIncrement),
      indices: {},
      keyGenerator: 1,
      name,
      objects: [],
    };

    this._storeNames.push(name);
    this._storeNames.sort();

    return new MyObjectStore(tx, name);
  }

  deleteObjectStore(name: string): void {
    let tx = this.factory.getTransaction();
    if (tx.mode !== "versionchange") {
      throw Error("invalid mode");
    }

    const td = tx.transactionDbData;
    if (td.stores[name]) {
      throw Error("object store does not exists");
    }

    const idx = this._storeNames.indexOf(name);
    if (idx < 0) {
      throw Error();
    }
    this._storeNames.splice(idx, 1);
    
    delete td.stores[name];
  }

  transaction(storeNames: string | string[], mode: IDBTransactionMode = "readonly"): IDBTransaction {
    const tx = new Transaction(this._name, this, mode);
    return tx;
  }

  dispatchEvent(evt: Event): boolean {
    throw Error("not implemented");
  }

  removeEventListener(type: string,
                      listener?: EventListenerOrEventListenerObject,
                      options?: boolean | EventListenerOptions): void {
    throw Error("not implemented");
  }

  addEventListener(type: string,
                   listener: EventListenerOrEventListenerObject,
                   useCapture?: boolean): void {
    throw Error("not implemented");
  }
}

enum TransactionState {
  Created = 1,
  Running = 2,
  Commited = 3,
  Aborted = 4,
}

class Transaction implements IDBTransaction {
  readonly READ_ONLY: string = "readonly";
  readonly READ_WRITE: string = "readwrite";
  readonly VERSION_CHANGE: string = "versionchange";

  onabort: (this: IDBTransaction, ev: Event) => any;
  onerror: (this: IDBTransaction, ev: Event) => any;
  oncomplete: (this: IDBTransaction, ev: Event) => any;

  completeHandlers: Array<(this: IDBTransaction, ev: Event) => any> = [];

  state: TransactionState = TransactionState.Created;

  _transactionDbData: Database|undefined;

  constructor(public dbName: string, public dbHandle: Db, public _mode: IDBTransactionMode) {
  }

  get mode() {
    return this._mode;
  }

  get active(): boolean {
    return this.state === TransactionState.Running || this.state === TransactionState.Created;
  }

  start() {
    if (this.state != TransactionState.Created) {
      throw Error();
    }
    this.state = TransactionState.Running;
    this._transactionDbData = structuredClone(this.dbHandle.dbData);
    if (!this._transactionDbData) {
      throw Error();
    }
  }

  commit() {
    if (this.state != TransactionState.Running) {
      throw Error();
    }
    if (!this._transactionDbData) {
      throw Error();
    }
    this.state = TransactionState.Commited;
    this.dbHandle.dbData = this._transactionDbData;
  }

  get error(): DOMException {
    throw Error("not implemented");
  }

  get db() {
    return this.dbHandle;
  }

  get transactionDbData() {
    if (this.state != TransactionState.Running) {
      throw Error();
    }
    let d = this._transactionDbData;
    if (!d) {
      throw Error();
    }
    return d;
  }

  abort() {
    throw Error("not implemented");
  }

  objectStore(storeName: string): IDBObjectStore {
    return new MyObjectStore(this, storeName);
  }

  dispatchEvent(evt: Event): boolean {
    throw Error("not implemented");
  }

  removeEventListener(type: string,
                      listener?: EventListenerOrEventListenerObject,
                      options?: boolean | EventListenerOptions): void {
    throw Error("not implemented");
  }

  addEventListener(type: string,
                   listener: EventListenerOrEventListenerObject,
                   useCapture?: boolean): void {
    switch (type) {
      case "complete":
        this.completeHandlers.push(listener as any);
      break;
    }
  }

  callComplete(ev: Event) {
    if (this.oncomplete) {
      this.oncomplete(ev);
    }
    for (let h of this.completeHandlers) {
      h.call(this, ev);
    }
  }
}


/**
 * Polyfill for CustomEvent.
 */
class MyEvent implements Event {
  readonly NONE: number = 0;
  readonly CAPTURING_PHASE: number = 1;
  readonly AT_TARGET: number = 2;
  readonly BUBBLING_PHASE: number = 3;

  _bubbles = false;
  _cancelable = false;
  _target: any;
  _currentTarget: any;
  _defaultPrevented: boolean = false;
  _eventPhase: number = 0;
  _timeStamp: number = 0;
  _type: string;

  constructor(typeArg: string, target: any) {
    this._type = typeArg;
    this._target = target;
  }

  get eventPhase() {
    return this._eventPhase;
  }

  get returnValue() {
    return this.defaultPrevented;
  }

  set returnValue(v: boolean) {
    if (v) {
      this.preventDefault();
    }
  }

  get isTrusted() {
    return false;
  }

  get bubbles() {
    return this._bubbles;
  }

  get cancelable() {
    return this._cancelable;
  }

  set cancelBubble(v: boolean) {
    if (v) {
      this.stopPropagation();
    }
  }

  get defaultPrevented() {
    return this._defaultPrevented;
  }

  stopPropagation() {
    throw Error("not implemented");
  }

  get currentTarget() {
    return this._currentTarget;
  }

  get target() {
    return this._target;
  }

  preventDefault() {
  }

  get srcElement() {
    return this.target;
  }

  get timeStamp() {
    return this._timeStamp;
  }

  get type() {
    return this._type;
  }

  get scoped() {
    return false;
  }

  initEvent(eventTypeArg: string, canBubbleArg: boolean, cancelableArg: boolean) {
    if (this._eventPhase != 0) {
      return;
    }

    this._type = eventTypeArg;
    this._bubbles = canBubbleArg;
    this._cancelable = cancelableArg;
  }

  stopImmediatePropagation() {
    throw Error("not implemented");
  }

  deepPath(): EventTarget[] {
    return [];
  }
}


class VersionChangeEvent extends MyEvent {
  _newVersion: number|null;
  _oldVersion: number;
  constructor(oldVersion: number, newVersion: number|null, target: any) {
    super("VersionChange", target);
    this._oldVersion = oldVersion;
    this._newVersion = newVersion;
  }

  get newVersion() {
    return this._newVersion;
  }

  get oldVersion() {
    return this._oldVersion;
  }
}


export class MemoryIDBFactory implements IDBFactory {
  data: Databases = {};

  currentRequest: MyRequest|undefined;

  scheduledRequests: MyRequest[] = [];

  private addRequest(r: MyRequest) {
    this.scheduledRequests.push(r);
    if (this.currentRequest) {
      return;
    }
    const runNext = (prevRequest?: MyRequest) => {
      const nextRequest = this.scheduledRequests.shift();
      if (nextRequest) {
        const tx = nextRequest.transaction;

        if (tx.state === TransactionState.Running) {
          // Okay, we're continuing with the same transaction
        } else if (tx.state === TransactionState.Created) {
          tx.start();
        } else {
          throw Error();
        }

        this.currentRequest = nextRequest;
        this.currentRequest.runner();
        this.currentRequest.done = true;
        this.currentRequest = undefined;
        runNext(nextRequest);
      } else if (prevRequest) {
        // We have no other request scheduled, so
        // auto-commit the transaction that the
        // previous request worked on.
        let lastTx = prevRequest._transaction;
        lastTx.commit();
      }
    };
    alreadyResolved.then(() => {
      runNext();
    });
  }

  /**
   * Get the only transaction that is active right now
   * or throw if no transaction is active.
   */
  getTransaction() {
    const req = this.currentRequest;
    if (!req) {
      throw Error();
    }
    return req.transaction;
  }

  cmp(a: any, b: any): number {
    throw Error("not implemented");
  }

  deleteDatabase(name: string): IDBOpenDBRequest {
    throw Error("not implemented");
  }

  open(dbName: string, version?: number): IDBOpenDBRequest {
    if (version !== undefined && version <= 0) {
      throw Error("invalid version");
    }

    let upgradeNeeded = false;
    let oldVersion: number;
    let mydb: Database;
    if (dbName in this.data) {
      mydb = this.data[dbName];
      if (!mydb) {
        throw Error();
      }
      oldVersion = mydb.version;
      if (version === undefined || version == mydb.version) {
        // we can open without upgrading
      } else if (version > mydb.version) {
        upgradeNeeded = true;
        mydb.version = version;
      } else {
        throw Error("version error");
      }
    } else {
      mydb = {
        name: dbName,
        stores: {},
        version: (version || 1),
      };
      upgradeNeeded = true;
      oldVersion = 0;
    }

    this.data[dbName] = mydb;

    const db = new Db(dbName, mydb.version, this);
    const tx = new Transaction(dbName, db, "versionchange");

    const req = new OpenDBRequest(tx, () => {
      req._result = db;
      if (upgradeNeeded) {
        let versionChangeEvt = new VersionChangeEvent(oldVersion, mydb.version, db);
        req.callOnupgradeneeded(versionChangeEvt);
      }
      let successEvent = new MyEvent("success", db);
      req.callSuccess(successEvent);
    });

    this.addRequest(req);

    return req;
  }
}

/**
 * Inject our IndexedDb implementation in the global namespace,
 * potentially replacing an existing implementation.
 */
export function injectGlobals() {
}
