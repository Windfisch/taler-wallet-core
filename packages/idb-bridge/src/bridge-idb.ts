/*
 Copyright 2017 Jeremy Scheff
 Copyright 2019-2021 Taler Systems S.A.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
 */

import {
  Backend,
  DatabaseConnection,
  DatabaseTransaction,
  RecordGetRequest,
  RecordStoreRequest,
  ResultLevel,
  Schema,
  StoreLevel,
} from "./backend-interface";
import {
  DOMException,
  DOMStringList,
  EventListener,
  IDBCursor,
  IDBCursorDirection,
  IDBDatabase,
  IDBIndex,
  IDBKeyPath,
  IDBKeyRange,
  IDBObjectStore,
  IDBOpenDBRequest,
  IDBRequest,
  IDBTransaction,
  IDBTransactionMode,
  IDBValidKey,
} from "./idbtypes";
import compareKeys from "./util/cmp";
import enforceRange from "./util/enforceRange";
import {
  AbortError,
  ConstraintError,
  DataError,
  InvalidAccessError,
  InvalidStateError,
  NotFoundError,
  ReadOnlyError,
  TransactionInactiveError,
  VersionError,
} from "./util/errors";
import { fakeDOMStringList } from "./util/fakeDOMStringList";
import FakeEvent from "./util/FakeEvent";
import FakeEventTarget from "./util/FakeEventTarget";
import { normalizeKeyPath } from "./util/normalizeKeyPath";
import openPromise from "./util/openPromise";
import queueTask from "./util/queueTask";
import { structuredClone, structuredEncapsulate, structuredRevive } from "./util/structuredClone";
import validateKeyPath from "./util/validateKeyPath";
import valueToKey from "./util/valueToKey";

/** @public */
export type CursorSource = BridgeIDBIndex | BridgeIDBObjectStore;

/** @public */
export interface FakeDOMStringList extends Array<string> {
  contains: (value: string) => boolean;
  item: (i: number) => string | undefined;
}

/** @public */
export interface RequestObj {
  operation: () => Promise<any>;
  request?: BridgeIDBRequest | undefined;
  source?: any;
}

/** @public */
export interface BridgeIDBDatabaseInfo {
  name: string;
  version: number;
}

function simplifyRange(
  r: IDBValidKey | IDBKeyRange | undefined | null,
): IDBKeyRange | null {
  if (r && typeof r === "object" && "lower" in r) {
    return r;
  }
  if (r === undefined || r === null) {
    return null;
  }
  return BridgeIDBKeyRange.bound(r, r, false, false);
}

/**
 * http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#cursor
 *
 * @public
 */
export class BridgeIDBCursor implements IDBCursor {
  _request: BridgeIDBRequest | undefined;

  private _gotValue: boolean = false;
  private _range: IDBValidKey | IDBKeyRange | undefined | null;
  private _indexPosition = undefined; // Key of previously returned record
  private _objectStorePosition = undefined;
  private _keyOnly: boolean;

  private _source: CursorSource;
  private _direction: IDBCursorDirection;
  private _key: IDBValidKey | undefined = undefined;
  private _primaryKey: IDBValidKey | undefined = undefined;
  private _indexName: string | undefined;
  private _objectStoreName: string;

  protected _value: any = undefined;

  constructor(
    source: CursorSource,
    objectStoreName: string,
    indexName: string | undefined,
    range: IDBValidKey | IDBKeyRange | null | undefined,
    direction: IDBCursorDirection,
    request: BridgeIDBRequest,
    keyOnly: boolean,
  ) {
    this._indexName = indexName;
    this._objectStoreName = objectStoreName;
    this._range = range;
    this._source = source;
    this._direction = direction;
    this._request = request;
    this._keyOnly = keyOnly;
  }

  get _effectiveObjectStore(): BridgeIDBObjectStore {
    if (this.source instanceof BridgeIDBObjectStore) {
      return this.source;
    }
    return this.source._objectStore;
  }

  get _backend(): Backend {
    return this._source._backend;
  }

  // Read only properties
  get source() {
    return this._source;
  }
  set source(val) {
    /* For babel */
  }

  get direction() {
    return this._direction;
  }
  set direction(val) {
    /* For babel */
  }

  get key(): IDBValidKey {
    const k = this._key;
    if (k === null || k === undefined) {
      throw Error("no key");
    }
    return k;
  }
  set key(val) {
    /* For babel */
  }

  get primaryKey(): IDBValidKey {
    const k = this._primaryKey;
    if (k === 0 || k === undefined) {
      throw Error("no key");
    }
    return k;
  }

  set primaryKey(val) {
    /* For babel */
  }

  protected get _isValueCursor(): boolean {
    return false;
  }

  /**
   * https://w3c.github.io/IndexedDB/#iterate-a-cursor
   */
  async _iterate(key?: IDBValidKey, primaryKey?: IDBValidKey): Promise<any> {
    BridgeIDBFactory.enableTracing &&
      console.log(
        `iterating cursor os=${this._objectStoreName},idx=${this._indexName}`,
      );
    BridgeIDBFactory.enableTracing &&
      console.log("cursor type ", this.toString());
    const recordGetRequest: RecordGetRequest = {
      direction: this.direction,
      indexName: this._indexName,
      lastIndexPosition: this._indexPosition,
      lastObjectStorePosition: this._objectStorePosition,
      limit: 1,
      range: simplifyRange(this._range),
      objectStoreName: this._objectStoreName,
      advanceIndexKey: key,
      advancePrimaryKey: primaryKey,
      resultLevel: this._keyOnly ? ResultLevel.OnlyKeys : ResultLevel.Full,
    };

    const { btx } = this.source._confirmActiveTransaction();

    let response = await this._backend.getRecords(btx, recordGetRequest);

    if (response.count === 0) {
      if (BridgeIDBFactory.enableTracing) {
        console.log("cursor is returning empty result");
      }
      this._gotValue = false;
      return null;
    }

    if (response.count !== 1) {
      throw Error("invariant failed");
    }

    if (BridgeIDBFactory.enableTracing) {
      console.log("request is:", JSON.stringify(recordGetRequest));
      console.log("get response is:", JSON.stringify(response));
    }

    if (this._indexName !== undefined) {
      this._key = response.indexKeys![0];
    } else {
      this._key = response.primaryKeys![0];
    }

    this._primaryKey = response.primaryKeys![0];

    if (!this._keyOnly) {
      this._value = structuredRevive(response.values![0]);
    }

    this._gotValue = true;
    this._objectStorePosition = structuredClone(response.primaryKeys![0]);
    if (response.indexKeys !== undefined && response.indexKeys.length > 0) {
      this._indexPosition = structuredClone(response.indexKeys[0]);
    }

    return this;
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBCursor-update-IDBRequest-any-value
  public update(value: any) {
    if (value === undefined) {
      throw new TypeError();
    }

    const transaction = this._effectiveObjectStore._transaction;

    if (transaction._state !== "active") {
      throw new TransactionInactiveError();
    }

    if (transaction.mode === "readonly") {
      throw new ReadOnlyError();
    }

    if (this._effectiveObjectStore._deleted) {
      throw new InvalidStateError();
    }

    if (
      !(this.source instanceof BridgeIDBObjectStore) &&
      this.source._deleted
    ) {
      throw new InvalidStateError();
    }

    if (!this._gotValue || !this._isValueCursor) {
      throw new InvalidStateError();
    }

    const storeReq: RecordStoreRequest = {
      key: this._primaryKey,
      value: structuredEncapsulate(value),
      objectStoreName: this._objectStoreName,
      storeLevel: StoreLevel.UpdateExisting,
    };

    const operation = async () => {
      if (BridgeIDBFactory.enableTracing) {
        console.log("updating at cursor");
      }
      const { btx } = this.source._confirmActiveTransaction();
      await this._backend.storeRecord(btx, storeReq);
    };
    return transaction._execRequestAsync({
      operation,
      source: this,
    });
  }

  /**
   * http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBCursor-advance-void-unsigned-long-count
   */
  public advance(count: number) {
    throw Error("not implemented");
  }

  /**
   * http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBCursor-continue-void-any-key
   */
  public continue(key?: IDBValidKey) {
    const transaction = this._effectiveObjectStore._transaction;

    if (transaction._state !== "active") {
      throw new TransactionInactiveError();
    }

    if (this._effectiveObjectStore._deleted) {
      throw new InvalidStateError();
    }
    if (
      !(this.source instanceof BridgeIDBObjectStore) &&
      this.source._deleted
    ) {
      throw new InvalidStateError();
    }

    if (!this._gotValue) {
      throw new InvalidStateError();
    }

    if (key !== undefined) {
      key = valueToKey(key);
      let lastKey =
        this._indexName === undefined
          ? this._objectStorePosition
          : this._indexPosition;

      const cmpResult = compareKeys(key, lastKey);

      if (
        (cmpResult <= 0 &&
          (this.direction === "next" || this.direction === "nextunique")) ||
        (cmpResult >= 0 &&
          (this.direction === "prev" || this.direction === "prevunique"))
      ) {
        throw new DataError();
      }
    }

    if (this._request) {
      this._request.readyState = "pending";
    }

    const operation = async () => {
      return this._iterate(key);
    };

    transaction._execRequestAsync({
      operation,
      request: this._request,
      source: this.source,
    });

    this._gotValue = false;
  }

  // https://w3c.github.io/IndexedDB/#dom-idbcursor-continueprimarykey
  public continuePrimaryKey(key: IDBValidKey, primaryKey: IDBValidKey) {
    throw Error("not implemented");
  }

  public delete() {
    const transaction = this._effectiveObjectStore._transaction;

    if (transaction._state !== "active") {
      throw new TransactionInactiveError();
    }

    if (transaction.mode === "readonly") {
      throw new ReadOnlyError();
    }

    if (this._effectiveObjectStore._deleted) {
      throw new InvalidStateError();
    }
    if (
      !(this.source instanceof BridgeIDBObjectStore) &&
      this.source._deleted
    ) {
      throw new InvalidStateError();
    }

    if (!this._gotValue || !this._isValueCursor) {
      throw new InvalidStateError();
    }

    const operation = async () => {
      const { btx } = this.source._confirmActiveTransaction();
      this._backend.deleteRecord(
        btx,
        this._objectStoreName,
        BridgeIDBKeyRange._valueToKeyRange(this._primaryKey),
      );
    };

    return transaction._execRequestAsync({
      operation,
      source: this,
    });
  }

  public toString() {
    return "[object IDBCursor]";
  }
}

export class BridgeIDBCursorWithValue extends BridgeIDBCursor {
  get value(): any {
    return this._value;
  }

  protected get _isValueCursor(): boolean {
    return true;
  }

  constructor(
    source: CursorSource,
    objectStoreName: string,
    indexName: string | undefined,
    range: IDBValidKey | IDBKeyRange | undefined | null,
    direction: IDBCursorDirection,
    request?: any,
  ) {
    super(source, objectStoreName, indexName, range, direction, request, false);
  }

  public toString() {
    return "[object IDBCursorWithValue]";
  }
}

/**
 * Ensure that an active version change transaction is currently running.
 */
const confirmActiveVersionchangeTransaction = (database: BridgeIDBDatabase) => {
  if (!database._runningVersionchangeTransaction) {
    throw new InvalidStateError();
  }

  // Find the latest versionchange transaction
  const transactions = database._transactions.filter(
    (tx: BridgeIDBTransaction) => {
      return tx.mode === "versionchange";
    },
  );
  const transaction = transactions[transactions.length - 1];

  if (!transaction || transaction._state === "finished") {
    throw new InvalidStateError();
  }

  if (transaction._state !== "active") {
    throw new TransactionInactiveError();
  }

  return transaction;
};

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#database-interface
/** @public */
export class BridgeIDBDatabase extends FakeEventTarget {
  _closePending = false;
  _closed = false;
  _runningVersionchangeTransaction = false;
  _transactions: Array<BridgeIDBTransaction> = [];

  _backendConnection: DatabaseConnection;
  _backend: Backend;

  _schema: Schema;

  get name(): string {
    return this._schema.databaseName;
  }

  get version(): number {
    return this._schema.databaseVersion;
  }

  get objectStoreNames(): FakeDOMStringList {
    return fakeDOMStringList(Object.keys(this._schema.objectStores)).sort();
  }

  /**
   * http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#database-closing-steps
   */
  _closeConnection() {
    this._closePending = true;

    const transactionsComplete = this._transactions.every(
      (transaction: BridgeIDBTransaction) => {
        return transaction._state === "finished";
      },
    );

    if (transactionsComplete) {
      this._closed = true;
      this._backend.close(this._backendConnection);
    } else {
      queueTask(() => {
        this._closeConnection();
      });
    }
  }

  constructor(backend: Backend, backendConnection: DatabaseConnection) {
    super();

    this._schema = backend.getSchema(backendConnection);

    this._backend = backend;
    this._backendConnection = backendConnection;
  }

  // http://w3c.github.io/IndexedDB/#dom-idbdatabase-createobjectstore
  public createObjectStore(
    name: string,
    options: { autoIncrement?: boolean; keyPath?: IDBKeyPath } | null = {},
  ): BridgeIDBObjectStore {
    if (name === undefined) {
      throw new TypeError();
    }
    const transaction = confirmActiveVersionchangeTransaction(this);
    const backendTx = transaction._backendTransaction;
    if (!backendTx) {
      throw Error("invariant violated");
    }

    const keyPath =
      options !== null && options.keyPath !== undefined
        ? options.keyPath
        : null;
    const autoIncrement =
      options !== null && options.autoIncrement !== undefined
        ? options.autoIncrement
        : false;

    if (keyPath !== null) {
      validateKeyPath(keyPath);
    }

    if (Object.keys(this._schema.objectStores).includes(name)) {
      throw new ConstraintError();
    }

    if (autoIncrement && (keyPath === "" || Array.isArray(keyPath))) {
      throw new InvalidAccessError();
    }

    transaction._backend.createObjectStore(
      backendTx,
      name,
      (keyPath !== null) ? normalizeKeyPath(keyPath) : null,
      autoIncrement,
    );

    this._schema = this._backend.getSchema(this._backendConnection);

    return transaction.objectStore(name);
  }

  public deleteObjectStore(name: string): void {
    if (name === undefined) {
      throw new TypeError();
    }
    const transaction = confirmActiveVersionchangeTransaction(this);
    transaction._objectStoresCache.delete(name);
  }

  public _internalTransaction(
    storeNames: string | string[],
    mode?: IDBTransactionMode,
    backendTransaction?: DatabaseTransaction,
  ): BridgeIDBTransaction {
    mode = mode !== undefined ? mode : "readonly";
    if (
      mode !== "readonly" &&
      mode !== "readwrite" &&
      mode !== "versionchange"
    ) {
      throw new TypeError("Invalid mode: " + mode);
    }

    const hasActiveVersionchange = this._transactions.some(
      (transaction: BridgeIDBTransaction) => {
        return (
          transaction._state === "active" &&
          transaction.mode === "versionchange" &&
          transaction._db === this
        );
      },
    );
    if (hasActiveVersionchange) {
      throw new InvalidStateError();
    }

    if (this._closePending) {
      throw new InvalidStateError();
    }

    if (!Array.isArray(storeNames)) {
      storeNames = [storeNames];
    }
    if (storeNames.length === 0 && mode !== "versionchange") {
      throw new InvalidAccessError();
    }
    for (const storeName of storeNames) {
      if (this.objectStoreNames.indexOf(storeName) < 0) {
        throw new NotFoundError(
          "No objectStore named " + storeName + " in this database",
        );
      }
    }

    const tx = new BridgeIDBTransaction(
      storeNames,
      mode,
      this,
      backendTransaction,
    );
    this._transactions.push(tx);
    queueTask(() => tx._start());
    return tx;
  }

  public transaction(
    storeNames: string | string[],
    mode?: IDBTransactionMode,
  ): BridgeIDBTransaction {
    if (mode === "versionchange") {
      throw new TypeError("Invalid mode: " + mode);
    }
    return this._internalTransaction(storeNames, mode);
  }

  public close() {
    this._closeConnection();
  }

  public toString() {
    return "[object IDBDatabase]";
  }
}

/** @public */
export type DatabaseList = Array<{ name: string; version: number }>;

/** @public */
export class BridgeIDBFactory {
  public cmp = compareKeys;
  private backend: Backend;
  private connections: BridgeIDBDatabase[] = [];
  static enableTracing: boolean = false;

  public constructor(backend: Backend) {
    this.backend = backend;
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBFactory-deleteDatabase-IDBOpenDBRequest-DOMString-name
  public deleteDatabase(name: string): BridgeIDBOpenDBRequest {
    const request = new BridgeIDBOpenDBRequest();
    request._source = null;

    queueTask(async () => {
      const databases = await this.backend.getDatabases();
      const dbInfo = databases.find((x) => x.name == name);
      if (!dbInfo) {
        // Database already doesn't exist, success!
        const event = new BridgeIDBVersionChangeEvent("success", {
          newVersion: null,
          oldVersion: 0,
        });
        request.dispatchEvent(event);
        return;
      }
      const oldVersion = dbInfo.version;

      try {
        const dbconn = await this.backend.connectDatabase(name);
        const backendTransaction = await this.backend.enterVersionChange(
          dbconn,
          0,
        );
        await this.backend.deleteDatabase(backendTransaction, name);
        await this.backend.commit(backendTransaction);
        await this.backend.close(dbconn);

        request.result = undefined;
        request.readyState = "done";

        const event2 = new BridgeIDBVersionChangeEvent("success", {
          newVersion: null,
          oldVersion,
        });
        request.dispatchEvent(event2);
      } catch (err) {
        request.error = new Error();
        request.error.name = err.name;
        request.readyState = "done";

        const event = new FakeEvent("error", {
          bubbles: true,
          cancelable: true,
        });
        event.eventPath = [];
        request.dispatchEvent(event);
      }
    });

    return request;
  }

  // tslint:disable-next-line max-line-length
  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBFactory-open-IDBOpenDBRequest-DOMString-name-unsigned-long-long-version
  public open(name: string, version?: number): BridgeIDBOpenDBRequest {
    if (arguments.length > 1 && version !== undefined) {
      // Based on spec, not sure why "MAX_SAFE_INTEGER" instead of "unsigned long long", but it's needed to pass
      // tests
      version = enforceRange(version, "MAX_SAFE_INTEGER");
    }
    if (version === 0) {
      throw new TypeError();
    }

    const request = new BridgeIDBOpenDBRequest();

    queueTask(async () => {
      let dbconn: DatabaseConnection;
      try {
        dbconn = await this.backend.connectDatabase(name);
      } catch (err) {
        request._finishWithError(err);
        return;
      }

      const schema = this.backend.getSchema(dbconn);
      const existingVersion = schema.databaseVersion;

      if (version === undefined) {
        version = existingVersion !== 0 ? existingVersion : 1;
      }

      const requestedVersion = version;

      BridgeIDBFactory.enableTracing &&
        console.log(
          `TRACE: existing version ${existingVersion}, requested version ${requestedVersion}`,
        );

      if (existingVersion > requestedVersion) {
        request._finishWithError(new VersionError());
        return;
      }

      const db = new BridgeIDBDatabase(this.backend, dbconn);

      if (existingVersion == requestedVersion) {
        request.result = db;
        request.readyState = "done";

        const event2 = new FakeEvent("success", {
          bubbles: false,
          cancelable: false,
        });
        event2.eventPath = [request];
        request.dispatchEvent(event2);
      } else if (existingVersion < requestedVersion) {
        // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-running-a-versionchange-transaction

        for (const otherConn of this.connections) {
          const event = new BridgeIDBVersionChangeEvent("versionchange", {
            newVersion: version,
            oldVersion: existingVersion,
          });
          otherConn.dispatchEvent(event);
        }

        if (this._anyOpen()) {
          const event = new BridgeIDBVersionChangeEvent("blocked", {
            newVersion: version,
            oldVersion: existingVersion,
          });
          request.dispatchEvent(event);
        }

        const backendTransaction = await this.backend.enterVersionChange(
          dbconn,
          requestedVersion,
        );
        db._runningVersionchangeTransaction = true;

        const transaction = db._internalTransaction(
          [],
          "versionchange",
          backendTransaction,
        );
        const event = new BridgeIDBVersionChangeEvent("upgradeneeded", {
          newVersion: version,
          oldVersion: existingVersion,
        });

        request.result = db;
        request.readyState = "done";
        request.transaction = transaction;
        request.dispatchEvent(event);

        console.log("awaiting until initial transaction is done");
        await transaction._waitDone();
        console.log("initial transaction is done");

        // We don't explicitly exit the versionchange transaction,
        // since this is already done by the BridgeIDBTransaction.
        db._runningVersionchangeTransaction = false;

        const event2 = new FakeEvent("success", {
          bubbles: false,
          cancelable: false,
        });
        event2.eventPath = [request];

        request.dispatchEvent(event2);
      }

      this.connections.push(db);
      return db;
    });

    return request;
  }

  // https://w3c.github.io/IndexedDB/#dom-idbfactory-databases
  public databases(): Promise<DatabaseList> {
    return this.backend.getDatabases();
  }

  public toString(): string {
    return "[object IDBFactory]";
  }

  private _anyOpen(): boolean {
    return this.connections.some((c) => !c._closed && !c._closePending);
  }
}

const confirmActiveTransaction = (
  index: BridgeIDBIndex,
): BridgeIDBTransaction => {
  if (index._deleted || index._objectStore._deleted) {
    throw new InvalidStateError();
  }

  if (index._objectStore._transaction._state !== "active") {
    throw new TransactionInactiveError();
  }

  return index._objectStore._transaction;
};

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#idl-def-IDBIndex
/** @public */
export class BridgeIDBIndex implements IDBIndex {
  _objectStore: BridgeIDBObjectStore;

  get objectStore(): IDBObjectStore {
    return this._objectStore;
  }

  get _schema(): Schema {
    return this._objectStore._transaction._db._schema;
  }

  get keyPath(): IDBKeyPath | IDBKeyPath[] {
    return this._schema.objectStores[this._objectStore.name].indexes[this._name]
      .keyPath;
  }

  get multiEntry(): boolean {
    return this._schema.objectStores[this._objectStore.name].indexes[this._name]
      .multiEntry;
  }

  get unique(): boolean {
    return this._schema.objectStores[this._objectStore.name].indexes[this._name]
      .unique;
  }

  get _backend(): Backend {
    return this._objectStore._backend;
  }

  _confirmActiveTransaction(): { btx: DatabaseTransaction } {
    return this._objectStore._confirmActiveTransaction();
  }

  private _name: string;

  public _deleted: boolean = false;

  constructor(objectStore: BridgeIDBObjectStore, name: string) {
    this._name = name;
    this._objectStore = objectStore;
  }

  get name() {
    return this._name;
  }

  // https://w3c.github.io/IndexedDB/#dom-idbindex-name
  set name(name: any) {
    const transaction = this._objectStore._transaction;

    if (!transaction._db._runningVersionchangeTransaction) {
      throw new InvalidStateError();
    }

    if (transaction._state !== "active") {
      throw new TransactionInactiveError();
    }

    const { btx } = this._confirmActiveTransaction();

    const oldName = this._name;
    const newName = String(name);

    if (newName === oldName) {
      return;
    }

    this._backend.renameIndex(btx, this._objectStore.name, oldName, newName);

    if (this._objectStore._indexNames.indexOf(name) >= 0) {
      throw new ConstraintError();
    }
  }

  // tslint:disable-next-line max-line-length
  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-openCursor-IDBRequest-any-range-IDBCursorDirection-direction
  public openCursor(
    range?: BridgeIDBKeyRange | IDBValidKey | null | undefined,
    direction: IDBCursorDirection = "next",
  ) {
    confirmActiveTransaction(this);

    if (range === null) {
      range = undefined;
    }
    if (range !== undefined && !(range instanceof BridgeIDBKeyRange)) {
      range = BridgeIDBKeyRange.only(valueToKey(range));
    }

    const request = new BridgeIDBRequest();
    request._source = this;
    request.transaction = this._objectStore._transaction;

    const cursor = new BridgeIDBCursorWithValue(
      this,
      this._objectStore.name,
      this._name,
      range,
      direction,
      request,
    );

    const operation = async () => {
      return cursor._iterate();
    };

    return this._objectStore._transaction._execRequestAsync({
      operation,
      request,
      source: this,
    });
  }

  // tslint:disable-next-line max-line-length
  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-openKeyCursor-IDBRequest-any-range-IDBCursorDirection-direction
  public openKeyCursor(
    range?: BridgeIDBKeyRange | IDBValidKey | null | undefined,
    direction: IDBCursorDirection = "next",
  ) {
    confirmActiveTransaction(this);

    if (range === null) {
      range = undefined;
    }
    if (range !== undefined && !(range instanceof BridgeIDBKeyRange)) {
      range = BridgeIDBKeyRange.only(valueToKey(range));
    }

    const request = new BridgeIDBRequest();
    request._source = this;
    request.transaction = this._objectStore._transaction;

    const cursor = new BridgeIDBCursor(
      this,
      this._objectStore.name,
      this._name,
      range,
      direction,
      request,
      true,
    );

    return this._objectStore._transaction._execRequestAsync({
      operation: cursor._iterate.bind(cursor),
      request,
      source: this,
    });
  }

  public get(key: BridgeIDBKeyRange | IDBValidKey) {
    confirmActiveTransaction(this);

    if (!(key instanceof BridgeIDBKeyRange)) {
      key = BridgeIDBKeyRange._valueToKeyRange(key);
    }

    const getReq: RecordGetRequest = {
      direction: "next",
      indexName: this._name,
      limit: 1,
      range: key,
      objectStoreName: this._objectStore._name,
      resultLevel: ResultLevel.Full,
    };

    const operation = async () => {
      const { btx } = this._confirmActiveTransaction();
      const result = await this._backend.getRecords(btx, getReq);
      if (result.count == 0) {
        return undefined;
      }
      const values = result.values;
      if (!values) {
        throw Error("invariant violated");
      }
      return structuredRevive(values[0]);
    };

    return this._objectStore._transaction._execRequestAsync({
      operation,
      source: this,
    });
  }

  // http://w3c.github.io/IndexedDB/#dom-idbindex-getall
  public getAll(
    query?: BridgeIDBKeyRange | IDBValidKey,
    count?: number,
  ): IDBRequest<any[]> {
    throw Error("not implemented");
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-getKey-IDBRequest-any-key
  public getKey(key: BridgeIDBKeyRange | IDBValidKey) {
    confirmActiveTransaction(this);

    if (!(key instanceof BridgeIDBKeyRange)) {
      key = BridgeIDBKeyRange._valueToKeyRange(key);
    }

    const getReq: RecordGetRequest = {
      direction: "next",
      indexName: this._name,
      limit: 1,
      range: key,
      objectStoreName: this._objectStore._name,
      resultLevel: ResultLevel.OnlyKeys,
    };

    const operation = async () => {
      const { btx } = this._confirmActiveTransaction();
      const result = await this._backend.getRecords(btx, getReq);
      if (result.count == 0) {
        return undefined;
      }
      const primaryKeys = result.primaryKeys;
      if (!primaryKeys) {
        throw Error("invariant violated");
      }
      return primaryKeys[0];
    };

    return this._objectStore._transaction._execRequestAsync({
      operation,
      source: this,
    });
  }

  // http://w3c.github.io/IndexedDB/#dom-idbindex-getallkeys
  public getAllKeys(
    query?: BridgeIDBKeyRange | IDBValidKey,
    count?: number,
  ): IDBRequest<IDBValidKey[]> {
    throw Error("not implemented");
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-count-IDBRequest-any-key
  public count(key: BridgeIDBKeyRange | IDBValidKey | null | undefined) {
    confirmActiveTransaction(this);

    if (key === null) {
      key = undefined;
    }
    if (key !== undefined && !(key instanceof BridgeIDBKeyRange)) {
      key = BridgeIDBKeyRange.only(valueToKey(key));
    }

    const getReq: RecordGetRequest = {
      direction: "next",
      indexName: this._name,
      limit: 1,
      range: key,
      objectStoreName: this._objectStore._name,
      resultLevel: ResultLevel.OnlyCount,
    };

    const operation = async () => {
      const { btx } = this._confirmActiveTransaction();
      const result = await this._backend.getRecords(btx, getReq);
      return result.count;
    };

    return this._objectStore._transaction._execRequestAsync({
      operation,
      source: this,
    });
  }

  public toString() {
    return "[object IDBIndex]";
  }
}

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#range-concept
/** @public */
export class BridgeIDBKeyRange {
  public static only(value: IDBValidKey) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    value = valueToKey(value);
    return new BridgeIDBKeyRange(value, value, false, false);
  }

  static lowerBound(lower: IDBValidKey, open: boolean = false) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    lower = valueToKey(lower);
    return new BridgeIDBKeyRange(lower, undefined, open, true);
  }

  static upperBound(upper: IDBValidKey, open: boolean = false) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    upper = valueToKey(upper);
    return new BridgeIDBKeyRange(undefined, upper, true, open);
  }

  static bound(
    lower: IDBValidKey,
    upper: IDBValidKey,
    lowerOpen: boolean = false,
    upperOpen: boolean = false,
  ) {
    if (arguments.length < 2) {
      throw new TypeError();
    }

    const cmpResult = compareKeys(lower, upper);
    if (cmpResult === 1 || (cmpResult === 0 && (lowerOpen || upperOpen))) {
      throw new DataError();
    }

    lower = valueToKey(lower);
    upper = valueToKey(upper);
    return new BridgeIDBKeyRange(lower, upper, lowerOpen, upperOpen);
  }

  readonly lower: IDBValidKey | undefined;
  readonly upper: IDBValidKey | undefined;
  readonly lowerOpen: boolean;
  readonly upperOpen: boolean;

  constructor(
    lower: IDBValidKey | undefined,
    upper: IDBValidKey | undefined,
    lowerOpen: boolean,
    upperOpen: boolean,
  ) {
    this.lower = lower;
    this.upper = upper;
    this.lowerOpen = lowerOpen;
    this.upperOpen = upperOpen;
  }

  // https://w3c.github.io/IndexedDB/#dom-idbkeyrange-includes
  includes(key: IDBValidKey) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    key = valueToKey(key);

    if (this.lower !== undefined) {
      const cmpResult = compareKeys(this.lower, key);

      if (cmpResult === 1 || (cmpResult === 0 && this.lowerOpen)) {
        return false;
      }
    }
    if (this.upper !== undefined) {
      const cmpResult = compareKeys(this.upper, key);

      if (cmpResult === -1 || (cmpResult === 0 && this.upperOpen)) {
        return false;
      }
    }
    return true;
  }

  toString() {
    return "[object IDBKeyRange]";
  }

  static _valueToKeyRange(value: any, nullDisallowedFlag: boolean = false) {
    if (value instanceof BridgeIDBKeyRange) {
      return value;
    }

    if (value === null || value === undefined) {
      if (nullDisallowedFlag) {
        throw new DataError();
      }
      return new BridgeIDBKeyRange(undefined, undefined, false, false);
    }

    const key = valueToKey(value);

    return BridgeIDBKeyRange.only(key);
  }
}

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#object-store
/** @public */
export class BridgeIDBObjectStore implements IDBObjectStore {
  _indexesCache: Map<string, BridgeIDBIndex> = new Map();

  _transaction: BridgeIDBTransaction;

  get transaction(): IDBTransaction {
    return this._transaction;
  }

  get autoIncrement(): boolean {
    return this._schema.objectStores[this._name].autoIncrement;
  }

  get _indexNames(): FakeDOMStringList {
    return fakeDOMStringList(
      Object.keys(this._schema.objectStores[this._name].indexes),
    ).sort()
  }

  get indexNames(): DOMStringList {
    return this._indexNames as DOMStringList;
  }

  get keyPath(): IDBKeyPath | IDBKeyPath[] {
    return this._schema.objectStores[this._name].keyPath!;
  }

  _name: string;

  get _schema(): Schema {
    return this._transaction._db._schema;
  }

  _deleted: boolean = false;

  constructor(transaction: BridgeIDBTransaction, name: string) {
    this._name = name;
    this._transaction = transaction;
  }

  get name() {
    return this._name;
  }

  get _backend(): Backend {
    return this._transaction._db._backend;
  }

  get _backendConnection(): DatabaseConnection {
    return this._transaction._db._backendConnection;
  }

  _confirmActiveTransaction(): { btx: DatabaseTransaction } {
    const btx = this._transaction._backendTransaction;
    if (!btx) {
      throw new InvalidStateError();
    }
    return { btx };
  }

  // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-name
  set name(newName: any) {
    const transaction = this._transaction;

    if (!transaction._db._runningVersionchangeTransaction) {
      throw new InvalidStateError();
    }

    let { btx } = this._confirmActiveTransaction();

    newName = String(newName);

    const oldName = this._name;

    if (newName === oldName) {
      return;
    }

    this._backend.renameObjectStore(btx, oldName, newName);
    this._transaction._db._schema = this._backend.getSchema(
      this._backendConnection,
    );
  }

  public _store(value: any, key: IDBValidKey | undefined, overwrite: boolean) {
    if (BridgeIDBFactory.enableTracing) {
      console.log(`TRACE: IDBObjectStore._store`);
    }
    if (this._transaction.mode === "readonly") {
      throw new ReadOnlyError();
    }
    const operation = async () => {
      const { btx } = this._confirmActiveTransaction();
      const result = await this._backend.storeRecord(btx, {
        objectStoreName: this._name,
        key: key,
        value: structuredEncapsulate(value),
        storeLevel: overwrite
          ? StoreLevel.AllowOverwrite
          : StoreLevel.NoOverwrite,
      });
      return result.key;
    };

    return this._transaction._execRequestAsync({ operation, source: this });
  }

  public put(value: any, key?: IDBValidKey) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    return this._store(value, key, true);
  }

  public add(value: any, key?: IDBValidKey) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    return this._store(value, key, false);
  }

  public delete(key: IDBValidKey | BridgeIDBKeyRange) {
    if (arguments.length === 0) {
      throw new TypeError();
    }

    if (this._transaction.mode === "readonly") {
      throw new ReadOnlyError();
    }

    let keyRange: BridgeIDBKeyRange;

    if (key instanceof BridgeIDBKeyRange) {
      keyRange = key;
    } else {
      keyRange = BridgeIDBKeyRange.only(valueToKey(key));
    }

    const operation = async () => {
      const { btx } = this._confirmActiveTransaction();
      return this._backend.deleteRecord(btx, this._name, keyRange);
    };

    return this._transaction._execRequestAsync({
      operation,
      source: this,
    });
  }

  public get(key?: BridgeIDBKeyRange | IDBValidKey) {
    if (BridgeIDBFactory.enableTracing) {
      console.log(`getting from object store ${this._name} key ${key}`);
    }

    if (arguments.length === 0) {
      throw new TypeError();
    }

    let keyRange: BridgeIDBKeyRange;

    if (key instanceof BridgeIDBKeyRange) {
      keyRange = key;
    } else {
      try {
        keyRange = BridgeIDBKeyRange.only(valueToKey(key));
      } catch (e) {
        throw Error(
          `invalid key (type ${typeof key}) for object store ${this._name}`,
        );
      }
    }

    const recordRequest: RecordGetRequest = {
      objectStoreName: this._name,
      indexName: undefined,
      lastIndexPosition: undefined,
      lastObjectStorePosition: undefined,
      direction: "next",
      limit: 1,
      resultLevel: ResultLevel.Full,
      range: keyRange,
    };

    const operation = async () => {
      if (BridgeIDBFactory.enableTracing) {
        console.log("running get operation:", recordRequest);
      }
      const { btx } = this._confirmActiveTransaction();
      const result = await this._backend.getRecords(btx, recordRequest);

      if (BridgeIDBFactory.enableTracing) {
        console.log("get operation result count:", result.count);
      }

      if (result.count === 0) {
        return undefined;
      }
      const values = result.values;
      if (!values) {
        throw Error("invariant violated");
      }
      return structuredRevive(values[0]);
    };

    return this._transaction._execRequestAsync({
      operation,
      source: this,
    });
  }

  // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-getall
  public getAll(
    query?: BridgeIDBKeyRange | IDBValidKey,
    count?: number,
  ): IDBRequest<any[]> {
    throw Error("not implemented");
  }

  // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-getkey
  public getKey(
    key?: BridgeIDBKeyRange | IDBValidKey,
  ): IDBRequest<IDBValidKey | undefined> {
    throw Error("not implemented");
  }

  // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-getallkeys
  public getAllKeys(
    query?: BridgeIDBKeyRange | IDBValidKey,
    count?: number,
  ): IDBRequest<any[]> {
    throw Error("not implemented");
  }

  public clear(): IDBRequest<undefined> {
    throw Error("not implemented");
  }

  public openCursor(
    range?: IDBKeyRange | IDBValidKey,
    direction: IDBCursorDirection = "next",
  ) {
    if (range === null) {
      range = undefined;
    }
    if (range !== undefined && !(range instanceof BridgeIDBKeyRange)) {
      range = BridgeIDBKeyRange.only(valueToKey(range));
    }

    const request = new BridgeIDBRequest();
    request._source = this;
    request.transaction = this._transaction;

    const cursor = new BridgeIDBCursorWithValue(
      this,
      this._name,
      undefined,
      range,
      direction,
      request,
    );

    return this._transaction._execRequestAsync({
      operation: () => cursor._iterate(),
      request,
      source: this,
    });
  }

  public openKeyCursor(
    range?: BridgeIDBKeyRange | IDBValidKey,
    direction?: IDBCursorDirection,
  ) {
    if (range === null) {
      range = undefined;
    }
    if (range !== undefined && !(range instanceof BridgeIDBKeyRange)) {
      range = BridgeIDBKeyRange.only(valueToKey(range));
    }

    if (!direction) {
      direction = "next";
    }

    const request = new BridgeIDBRequest();
    request._source = this;
    request.transaction = this._transaction;

    const cursor = new BridgeIDBCursor(
      this,
      this._name,
      undefined,
      range,
      direction,
      request,
      true,
    );

    return this._transaction._execRequestAsync({
      operation: cursor._iterate.bind(cursor),
      request,
      source: this,
    });
  }

  // tslint:disable-next-line max-line-length
  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBObjectStore-createIndex-IDBIndex-DOMString-name-DOMString-sequence-DOMString--keyPath-IDBIndexParameters-optionalParameters
  public createIndex(
    indexName: string,
    keyPath: IDBKeyPath,
    optionalParameters: { multiEntry?: boolean; unique?: boolean } = {},
  ) {
    if (arguments.length < 2) {
      throw new TypeError();
    }

    if (!this._transaction._db._runningVersionchangeTransaction) {
      throw new InvalidStateError();
    }

    const { btx } = this._confirmActiveTransaction();

    const multiEntry =
      optionalParameters.multiEntry !== undefined
        ? optionalParameters.multiEntry
        : false;
    const unique =
      optionalParameters.unique !== undefined
        ? optionalParameters.unique
        : false;

    if (this._transaction.mode !== "versionchange") {
      throw new InvalidStateError();
    }

    if (this._indexNames.indexOf(indexName) >= 0) {
      throw new ConstraintError();
    }

    validateKeyPath(keyPath);

    if (Array.isArray(keyPath) && multiEntry) {
      throw new InvalidAccessError();
    }

    this._backend.createIndex(
      btx,
      indexName,
      this._name,
      normalizeKeyPath(keyPath),
      multiEntry,
      unique,
    );

    return new BridgeIDBIndex(this, indexName);
  }

  // https://w3c.github.io/IndexedDB/#dom-idbobjectstore-index
  public index(name: string) {
    if (arguments.length === 0) {
      throw new TypeError();
    }

    if (this._transaction._state === "finished") {
      throw new InvalidStateError();
    }

    const index = this._indexesCache.get(name);
    if (index !== undefined) {
      return index;
    }

    return new BridgeIDBIndex(this, name);
  }

  public deleteIndex(indexName: string) {
    if (arguments.length === 0) {
      throw new TypeError();
    }

    if (this._transaction.mode !== "versionchange") {
      throw new InvalidStateError();
    }

    if (!this._transaction._db._runningVersionchangeTransaction) {
      throw new InvalidStateError();
    }

    const { btx } = this._confirmActiveTransaction();

    const index = this._indexesCache.get(indexName);
    if (index !== undefined) {
      index._deleted = true;
    }

    this._backend.deleteIndex(btx, this._name, indexName);
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBObjectStore-count-IDBRequest-any-key
  public count(key?: IDBValidKey | BridgeIDBKeyRange) {
    if (key === null) {
      key = undefined;
    }
    if (key !== undefined && !(key instanceof BridgeIDBKeyRange)) {
      key = BridgeIDBKeyRange.only(valueToKey(key));
    }

    const recordGetRequest: RecordGetRequest = {
      direction: "next",
      indexName: undefined,
      lastIndexPosition: undefined,
      limit: -1,
      objectStoreName: this._name,
      lastObjectStorePosition: undefined,
      range: key,
      resultLevel: ResultLevel.OnlyCount,
    };

    const operation = async () => {
      const { btx } = this._confirmActiveTransaction();
      const result = await this._backend.getRecords(btx, recordGetRequest);
      return result.count;
    };

    return this._transaction._execRequestAsync({ operation, source: this });
  }

  public toString() {
    return "[object IDBObjectStore]";
  }
}

/** @public */
export class BridgeIDBRequest extends FakeEventTarget implements IDBRequest {
  _result: any = null;
  _error: Error | null | undefined = null;
  get source(): IDBObjectStore | IDBIndex | IDBCursor {
    if (this._source) {
      return this._source;
    }
    throw Error("source is null");
  }
  _source:
    | BridgeIDBCursor
    | BridgeIDBIndex
    | BridgeIDBObjectStore
    | null = null;
  transaction: BridgeIDBTransaction | null = null;
  readyState: "done" | "pending" = "pending";
  onsuccess: EventListener | null = null;
  onerror: EventListener | null = null;

  get error() {
    if (this.readyState === "pending") {
      throw new InvalidStateError();
    }
    return this._error;
  }

  set error(value: any) {
    this._error = value;
  }

  get result() {
    if (this.readyState === "pending") {
      throw new InvalidStateError();
    }
    return this._result;
  }

  set result(value: any) {
    this._result = value;
  }

  toString() {
    return "[object IDBRequest]";
  }

  _finishWithError(err: Error) {
    this.result = undefined;
    this.readyState = "done";

    this.error = new Error(err.message);
    this.error.name = err.name;

    const event = new FakeEvent("error", {
      bubbles: true,
      cancelable: true,
    });
    event.eventPath = [];
    this.dispatchEvent(event);
  }

  _finishWithResult(result: any) {
    this.result = result;
    this.readyState = "done";

    const event = new FakeEvent("success");
    event.eventPath = [];
    this.dispatchEvent(event);
  }
}

/** @public */
export class BridgeIDBOpenDBRequest
  extends BridgeIDBRequest
  implements IDBOpenDBRequest {
  public onupgradeneeded: EventListener | null = null;
  public onblocked: EventListener | null = null;

  constructor() {
    super();
    // https://www.w3.org/TR/IndexedDB/#open-requests
    this._source = null;
  }

  public toString() {
    return "[object IDBOpenDBRequest]";
  }
}

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#transaction
/** @public */
export class BridgeIDBTransaction
  extends FakeEventTarget
  implements IDBTransaction {
  public _state: "active" | "inactive" | "committing" | "finished" = "active";
  public _started = false;
  public _objectStoresCache: Map<string, BridgeIDBObjectStore> = new Map();

  public _backendTransaction?: DatabaseTransaction;

  public _objectStoreNames: FakeDOMStringList;
  get objectStoreNames(): DOMStringList {
    return this._objectStoreNames as DOMStringList;
  }
  public mode: IDBTransactionMode;
  public _db: BridgeIDBDatabase;

  get db(): IDBDatabase {
    return this.db;
  }

  public _error: Error | null = null;

  get error(): DOMException {
    return this._error as DOMException;
  }

  public onabort: EventListener | null = null;
  public oncomplete: EventListener | null = null;
  public onerror: EventListener | null = null;

  private _waitPromise: Promise<void>;
  private _resolveWait: () => void;

  public _scope: Set<string>;
  private _requests: Array<{
    operation: () => void;
    request: BridgeIDBRequest;
  }> = [];

  get _backend(): Backend {
    return this._db._backend;
  }

  constructor(
    storeNames: string[],
    mode: IDBTransactionMode,
    db: BridgeIDBDatabase,
    backendTransaction?: DatabaseTransaction,
  ) {
    super();

    const myOpenPromise = openPromise<void>();
    this._waitPromise = myOpenPromise.promise;
    this._resolveWait = myOpenPromise.resolve;

    this._scope = new Set(storeNames);
    this._backendTransaction = backendTransaction;
    this.mode = mode;
    this._db = db;
    this._objectStoreNames = fakeDOMStringList(Array.from(this._scope).sort());

    this._db._transactions.push(this);
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-aborting-a-transaction
  async _abort(errName: string | null) {
    this._state = "finished";

    if (errName !== null) {
      const e = new Error();
      e.name = errName;
      this._error = e;
    }

    // Should this directly remove from _requests?
    for (const { request } of this._requests) {
      if (request.readyState !== "done") {
        request.readyState = "done"; // This will cancel execution of this request's operation
        if (request._source) {
          request.result = undefined;
          request.error = new AbortError();

          const event = new FakeEvent("error", {
            bubbles: true,
            cancelable: true,
          });
          event.eventPath = [this._db, this];
          request.dispatchEvent(event);
        }
      }
    }

    // Only roll back if we actually executed the scheduled operations.
    const maybeBtx = this._backendTransaction;
    if (maybeBtx) {
      await this._backend.rollback(maybeBtx);
    }

    queueTask(() => {
      const event = new FakeEvent("abort", {
        bubbles: true,
        cancelable: false,
      });
      event.eventPath = [this._db];
      this.dispatchEvent(event);
    });
  }

  public abort() {
    if (this._state === "committing" || this._state === "finished") {
      throw new InvalidStateError();
    }
    this._state = "active";

    this._abort(null);
  }

  // http://w3c.github.io/IndexedDB/#dom-idbtransaction-objectstore
  public objectStore(name: string): BridgeIDBObjectStore {
    if (this._state !== "active") {
      throw new InvalidStateError();
    }

    const objectStore = this._objectStoresCache.get(name);
    if (objectStore !== undefined) {
      return objectStore;
    }

    return new BridgeIDBObjectStore(this, name);
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-asynchronously-executing-a-request
  public _execRequestAsync(obj: RequestObj) {
    const source = obj.source;
    const operation = obj.operation;
    let request = obj.hasOwnProperty("request") ? obj.request : null;

    if (this._state !== "active") {
      throw new TransactionInactiveError();
    }

    // Request should only be passed for cursors
    if (!request) {
      if (!source) {
        // Special requests like indexes that just need to run some code
        request = new BridgeIDBRequest();
      } else {
        request = new BridgeIDBRequest();
        request._source = source;
        request.transaction = (source as any).transaction;
      }
    }

    this._requests.push({
      operation,
      request,
    });

    return request;
  }

  /**
   * Actually execute the scheduled work for this transaction.
   */
  public async _start() {
    if (BridgeIDBFactory.enableTracing) {
      console.log(
        `TRACE: IDBTransaction._start, ${this._requests.length} queued`,
      );
    }
    this._started = true;

    if (!this._backendTransaction) {
      this._backendTransaction = await this._backend.beginTransaction(
        this._db._backendConnection,
        Array.from(this._scope),
        this.mode,
      );
    }

    // Remove from request queue - cursor ones will be added back if necessary by cursor.continue and such
    let operation;
    let request;
    while (this._requests.length > 0) {
      const r = this._requests.shift();

      // This should only be false if transaction was aborted
      if (r && r.request.readyState !== "done") {
        request = r.request;
        operation = r.operation;
        break;
      }
    }

    if (request && operation) {
      if (!request._source) {
        // Special requests like indexes that just need to run some code, with error handling already built into
        // operation
        await operation();
      } else {
        let event;
        try {
          BridgeIDBFactory.enableTracing &&
            console.log("TRACE: running operation in transaction");
          const result = await operation();
          BridgeIDBFactory.enableTracing &&
            console.log(
              "TRACE: operation in transaction finished with success",
            );
          request.readyState = "done";
          request.result = result;
          request.error = undefined;

          // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-fire-a-success-event
          if (this._state === "inactive") {
            this._state = "active";
          }
          event = new FakeEvent("success", {
            bubbles: false,
            cancelable: false,
          });

          try {
            event.eventPath = [request, this, this._db];
            request.dispatchEvent(event);
          } catch (err) {
            if (this._state !== "committing") {
              this._abort("AbortError");
            }
            throw err;
          }
        } catch (err) {
          if (BridgeIDBFactory.enableTracing) {
            console.log("TRACING: error during operation: ", err);
          }
          request.readyState = "done";
          request.result = undefined;
          request.error = err;

          // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-fire-an-error-event
          if (this._state === "inactive") {
            this._state = "active";
          }
          event = new FakeEvent("error", {
            bubbles: true,
            cancelable: true,
          });

          try {
            event.eventPath = [this._db, this];
            request.dispatchEvent(event);
          } catch (err) {
            if (this._state !== "committing") {
              this._abort("AbortError");
            }
            throw err;
          }
          if (!event.canceled) {
            this._abort(err.name);
          }
        }
      }

      // On to the next one
      if (this._requests.length > 0) {
        this._start();
      } else {
        // Give it another chance for new handlers to be set before finishing
        queueTask(() => this._start());
      }
      return;
    }

    if (this._state !== "finished" && this._state !== "committing") {
      if (BridgeIDBFactory.enableTracing) {
        console.log("finishing transaction");
      }

      this._state = "committing";

      await this._backend.commit(this._backendTransaction);

      this._state = "finished";

      if (!this._error) {
        if (BridgeIDBFactory.enableTracing) {
          console.log("dispatching 'complete' event on transaction");
        }
        const event = new FakeEvent("complete");
        event.eventPath = [this, this._db];
        this.dispatchEvent(event);
      }

      const idx = this._db._transactions.indexOf(this);
      if (idx < 0) {
        throw Error("invariant failed");
      }
      this._db._transactions.splice(idx, 1);

      this._resolveWait();
    }
  }

  public commit() {
    if (this._state !== "active") {
      throw new InvalidStateError();
    }

    this._state = "committing";
    // We now just wait for auto-commit ...
  }

  public toString() {
    return "[object IDBRequest]";
  }

  _waitDone(): Promise<void> {
    return this._waitPromise;
  }
}

export class BridgeIDBVersionChangeEvent extends FakeEvent {
  public newVersion: number | null;
  public oldVersion: number;

  constructor(
    type: "blocked" | "success" | "upgradeneeded" | "versionchange",
    parameters: { newVersion?: number | null; oldVersion?: number } = {},
  ) {
    super(type);

    this.newVersion =
      parameters.newVersion !== undefined ? parameters.newVersion : null;
    this.oldVersion =
      parameters.oldVersion !== undefined ? parameters.oldVersion : 0;
  }

  public toString() {
    return "[object IDBVersionChangeEvent]";
  }
}
