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
const structuredSerialize = require("structured-clone").serialize;


interface StoredObject {
  key: any;
  object: string;
}

interface Store {
  name: string;
  keyPath: string | string[];
  keyGenerator: number;
  autoIncrement: boolean;
  objects: { [strKey: string]: StoredObject };
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


function callEventHandler(h: EventListenerOrEventListenerObject, evt: Event, target: any) {
  if ("handleEvent" in h) {
    (h as EventListenerObject).handleEvent(evt);
  } else {
    (h as EventListener).call(target, evt);
  }
}

class MyRequest implements IDBRequest {
  onerror: (this: IDBRequest, ev: Event) => any;

  onsuccess: (this: IDBRequest, ev: Event) => any;
  successHandlers: Array<(this: IDBRequest, ev: Event) => any>;

  done: boolean = false;

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
    return null;
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


class MyObjectStore implements IDBObjectStore  {
  get indexNames() {
    return new DOMStringList();
  }

  constructor(public transaction: Transaction, public dbName: string, public storeName: string) {
  }

  get keyPath() {
    return this.transaction.db.dbData.stores[this.storeName].keyPath;
  }

  get name() {
    return this.storeName;
  }

  get autoIncrement() {
    return this.transaction.db.dbData.stores[this.storeName].autoIncrement;
  }

  add(value: any, key?: any): IDBRequest {
    throw Error("not implemented");
  }

  put(value: any, key?: any): IDBRequest {
    throw Error("not implemented");
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
    throw Error("not implemented");
  }

  openCursor(range?: IDBKeyRange | IDBValidKey, direction?: IDBCursorDirection): IDBRequest {
    throw Error("not implemented");
  }
}


class Db implements IDBDatabase {
  
  onabort: (this: IDBDatabase, ev: Event) => any;
  onerror: (this: IDBDatabase, ev: Event) => any;
  onversionchange: (ev: IDBVersionChangeEvent) => any;

  constructor(private _name: string, private _version: number, private factory: MemoryIDBFactory) {
  }

  get dbData() {
    return this.factory.data[this._name];
  }

  get name() {
    return this._name;
  }

  get objectStoreNames() {
    return new MyDomStringList();
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
    throw Error("not implemented");
  }

  deleteObjectStore(name: string): void {
    throw Error("not implemented");
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

  start() {
    if (this.state != TransactionState.Created) {
      throw Error();
    }
    this._transactionDbData = structuredClone(this.dbHandle.dbData);
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
    return new MyObjectStore(this, this.dbName, storeName);
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

  constructor(typeArg: string) {
    this._type = typeArg;
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
  constructor(oldVersion: number, newVersion?: number) {
    super("VersionChange");
    this._oldVersion = oldVersion;
    this._newVersion = newVersion || null;
  }

  get newVersion() {
    return this._newVersion;
  }

  get oldVersion() {
    return this._oldVersion;
  }
}


class MemoryIDBFactory implements IDBFactory {
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
        this.data[lastTx.dbName] = lastTx.transactionDbData;
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
    let mydb: Database;
    if (dbName in this.data) {
      mydb = this.data[dbName];
      if (version === undefined || version == mydb.version) {
        // we can open without upgrading
      } else if (version > mydb.version) {
        upgradeNeeded = true;
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
    }

    const db = new Db(dbName, mydb.version, this);
    const tx = new Transaction(dbName, db, "versionchange");

    const req = new OpenDBRequest(tx, () => {
      if (upgradeNeeded) {
        let versionChangeEvt = new VersionChangeEvent(mydb.version, version);
        req.callOnupgradeneeded(versionChangeEvt);
      }
      let successEvent = new MyEvent("success");
      req.callSuccess(successEvent);
    });

    this.addRequest(req);

    return req;
  }
}
