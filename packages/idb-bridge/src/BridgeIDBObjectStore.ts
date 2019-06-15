/*
 Copyright 2017 Jeremy Scheff

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

import BridgeIDBCursor from "./BridgeIDBCursor";
import BridgeIDBCursorWithValue from "./BridgeIDBCursorWithValue";
import BridgeIDBIndex from "./BridgeIDBIndex";
import BridgeIDBKeyRange from "./BridgeIDBKeyRange";
import BridgeIDBRequest from "./BridgeIDBRequest";
import BridgeIDBTransaction from "./BridgeIDBTransaction";

import {
  ConstraintError,
  DataError,
  InvalidAccessError,
  InvalidStateError,
  NotFoundError,
  ReadOnlyError,
  TransactionInactiveError,
} from "./util/errors";
import extractKey from "./util/extractKey";
import fakeDOMStringList from "./util/fakeDOMStringList";
import structuredClone from "./util/structuredClone";
import {
  FakeDOMStringList,
  BridgeIDBCursorDirection,
  Key,
  KeyPath,
  Value,
} from "./util/types";
import validateKeyPath from "./util/validateKeyPath";
import valueToKey from "./util/valueToKey";
import {
  DatabaseTransaction,
  RecordGetRequest,
  ResultLevel,
} from "./backend-interface";


// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#object-store
class BridgeIDBObjectStore {
  _indexesCache: Map<string, BridgeIDBIndex> = new Map();

  transaction: BridgeIDBTransaction;

  get autoIncrement(): boolean {
    return this._schema.objectStores[this._name].autoIncrement;
  }

  get indexNames(): FakeDOMStringList {
    return fakeDOMStringList(this._schema.objectStores[this._name].indexes).sort();
  }

  get keyPath(): KeyPath | null {
    return this._schema.objectStores[this._name].keyPath;
  }

  _name: string;

  get _schema() {
    return this.transaction.db._schema;
  }

  _deleted: boolean = false;

  constructor(transaction: BridgeIDBTransaction, name: string) {
    this._name = name;
    this.transaction = transaction;
  }

  get name() {
    return this._name;
  }

  get _backend() {
    return this.transaction.db._backend;
  }

  get _backendConnection() {
    return this.transaction.db._backendConnection;
  }

  _confirmActiveTransaction(): { btx: DatabaseTransaction } {
    const btx = this.transaction._backendTransaction;
    if (!btx) {
      throw new InvalidStateError();
    }
    return { btx };
  }

  // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-name
  set name(newName: any) {
    const transaction = this.transaction;

    if (!transaction.db._runningVersionchangeTransaction) {
      throw new InvalidStateError();
    }

    let { btx } = this._confirmActiveTransaction();


    newName = String(newName);

    const oldName = this._name;

    if (newName === oldName) {
      return;
    }

    this._backend.renameObjectStore(btx, oldName, newName);
    this.transaction.db._schema = this._backend.getSchema(this._backendConnection);
  }

  public _store(value: Value, key: Key | undefined, overwrite: boolean) {
    if (this.transaction.mode === "readonly") {
      throw new ReadOnlyError();
    }
    const operation = async () => {
      const { btx } = this._confirmActiveTransaction();
      return this._backend.storeRecord(btx, {
        objectStoreName: this._name,
        key: key,
        value: value,
        overwrite,
      });
    };

    return this.transaction._execRequestAsync({ operation, source: this });
  }

  public put(value: Value, key?: Key) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    return this._store(value, key, true);
  }

  public add(value: Value, key?: Key) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    return this._store(value, key, false);
  }

  public delete(key: Key) {
    if (arguments.length === 0) {
      throw new TypeError();
    }

    if (this.transaction.mode === "readonly") {
      throw new ReadOnlyError();
    }

    if (!(key instanceof BridgeIDBKeyRange)) {
      key = valueToKey(key);
    }

    const operation = async () => {
      const { btx } = this._confirmActiveTransaction();
      return this._backend.deleteRecord(btx, this._name, key);
    }
      
    return this.transaction._execRequestAsync({
      operation,
      source: this,
    });
  }

  public get(key?: BridgeIDBKeyRange | Key) {
    if (arguments.length === 0) {
      throw new TypeError();
    }

    if (!(key instanceof BridgeIDBKeyRange)) {
      key = valueToKey(key);
    }

    const recordRequest: RecordGetRequest = {
      objectStoreName: this._name,
      indexName: undefined,
      lastIndexPosition: undefined,
      lastObjectStorePosition: undefined,
      direction: "next",
      limit: 1,
      resultLevel: ResultLevel.Full,
      range: key,
    };

    const operation = async () => {
      const { btx } = this._confirmActiveTransaction();
      const result = await this._backend.getRecords(
        btx,
        recordRequest,
      );
      if (result.count == 0) {
        return undefined;
      }
      const values = result.values;
      if (!values) {
        throw Error("invariant violated");
      }
      return values[0];
    };

    return this.transaction._execRequestAsync({
      operation,
      source: this,
    });
  }

  // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-getall
  public getAll(query?: BridgeIDBKeyRange | Key, count?: number) {
    throw Error("not implemented");
  }

  // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-getkey
  public getKey(key?: BridgeIDBKeyRange | Key) {
    throw Error("not implemented");
  }

  // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-getallkeys
  public getAllKeys(query?: BridgeIDBKeyRange | Key, count?: number) {
    throw Error("not implemented");
  }

  public clear() {
    throw Error("not implemented");
  }

  public openCursor(
    range?: BridgeIDBKeyRange | Key,
    direction: BridgeIDBCursorDirection = "next",
  ) {

    if (range === null) {
      range = undefined;
    }
    if (range !== undefined && !(range instanceof BridgeIDBKeyRange)) {
      range = BridgeIDBKeyRange.only(valueToKey(range));
    }

    const request = new BridgeIDBRequest();
    request.source = this;
    request.transaction = this.transaction;

    const cursor = new BridgeIDBCursorWithValue(
      this,
      this._name,
      undefined,
      range,
      direction,
      request,
    );

    return this.transaction._execRequestAsync({
      operation: () => cursor._iterate(),
      request,
      source: this,
    });
  }

  public openKeyCursor(
    range?: BridgeIDBKeyRange | Key,
    direction?: BridgeIDBCursorDirection,
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
    request.source = this;
    request.transaction = this.transaction;

    const cursor = new BridgeIDBCursor(
      this,
      this._name,
      undefined,
      range,
      direction,
      request,
      true,
    );

    return this.transaction._execRequestAsync({
      operation: cursor._iterate.bind(cursor),
      request,
      source: this,
    });
  }

  // tslint:disable-next-line max-line-length
  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBObjectStore-createIndex-IDBIndex-DOMString-name-DOMString-sequence-DOMString--keyPath-IDBIndexParameters-optionalParameters
  public createIndex(
    indexName: string,
    keyPath: KeyPath,
    optionalParameters: { multiEntry?: boolean; unique?: boolean } = {},
  ) {
    if (arguments.length < 2) {
      throw new TypeError();
    }

    if (!this.transaction.db._runningVersionchangeTransaction) {
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

    if (this.transaction.mode !== "versionchange") {
      throw new InvalidStateError();
    }

    if (this.indexNames.indexOf(indexName) >= 0) {
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
      keyPath,
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

    if (this.transaction._state === "finished") {
      throw new InvalidStateError();
    }

    const index = this._indexesCache.get(name);
    if (index !== undefined) {
      return index;
    }

    return new BridgeIDBIndex(this, name);
  }

  public deleteIndex(name: string) {
    if (arguments.length === 0) {
      throw new TypeError();
    }

    if (this.transaction.mode !== "versionchange") {
      throw new InvalidStateError();
    }

    if (!this.transaction.db._runningVersionchangeTransaction) {
      throw new InvalidStateError();
    }

    const { btx } = this._confirmActiveTransaction();

    const index = this._indexesCache.get(name);
    if (index !== undefined) {
      index._deleted = true;
    }

    this._backend.deleteIndex(btx, name);
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBObjectStore-count-IDBRequest-any-key
  public count(key?: Key | BridgeIDBKeyRange) {

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
      const result = await this._backend.getRecords(
        btx,
        recordGetRequest,
      );
      return result.count;
    };

    return this.transaction._execRequestAsync({ operation, source: this });
  }

  public toString() {
    return "[object IDBObjectStore]";
  }
}

export default BridgeIDBObjectStore;
