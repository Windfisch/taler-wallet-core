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
import BridgeIDBKeyRange from "./BridgeIDBKeyRange";
import BridgeIDBObjectStore from "./BridgeIDBObjectStore";
import BridgeIDBRequest from "./BridgeIDBRequest";
import {
  ConstraintError,
  InvalidStateError,
  TransactionInactiveError,
} from "./util/errors";
import { BridgeIDBCursorDirection, Key, KeyPath } from "./util/types";
import valueToKey from "./util/valueToKey";
import BridgeIDBTransaction from "./BridgeIDBTransaction";
import {
  Schema,
  Backend,
  DatabaseTransaction,
  RecordGetRequest,
  ResultLevel,
} from "./backend-interface";

const confirmActiveTransaction = (
  index: BridgeIDBIndex,
): BridgeIDBTransaction => {
  if (index._deleted || index.objectStore._deleted) {
    throw new InvalidStateError();
  }

  if (index.objectStore.transaction._state !== "active") {
    throw new TransactionInactiveError();
  }

  return index.objectStore.transaction;
};

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#idl-def-IDBIndex
class BridgeIDBIndex {
  objectStore: BridgeIDBObjectStore;

  get _schema(): Schema {
    return this.objectStore.transaction.db._schema;
  }

  get keyPath(): KeyPath {
    return this._schema.indexes[this._name].keyPath;
  }

  get multiEntry(): boolean {
    return this._schema.indexes[this._name].multiEntry;
  }

  get unique(): boolean {
    return this._schema.indexes[this._name].unique;
  }

  get _backend(): Backend {
    return this.objectStore._backend;
  }

  _confirmActiveTransaction(): { btx: DatabaseTransaction } {
    return this.objectStore._confirmActiveTransaction();
  }

  private _name: string;

  public _deleted: boolean = false;

  constructor(objectStore: BridgeIDBObjectStore, name: string) {
    this._name = name;
    this.objectStore = objectStore;
  }

  get name() {
    return this._name;
  }

  // https://w3c.github.io/IndexedDB/#dom-idbindex-name
  set name(name: any) {
    const transaction = this.objectStore.transaction;

    if (!transaction.db._runningVersionchangeTransaction) {
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

    this._backend.renameIndex(btx, oldName, newName);

    if (this.objectStore.indexNames.indexOf(name) >= 0) {
      throw new ConstraintError();
    }
  }

  // tslint:disable-next-line max-line-length
  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-openCursor-IDBRequest-any-range-IDBCursorDirection-direction
  public openCursor(
    range?: BridgeIDBKeyRange | Key | null | undefined,
    direction: BridgeIDBCursorDirection = "next",
  ) {
    confirmActiveTransaction(this);

    if (range === null) {
      range = undefined;
    }
    if (range !== undefined && !(range instanceof BridgeIDBKeyRange)) {
      range = BridgeIDBKeyRange.only(valueToKey(range));
    }

    const request = new BridgeIDBRequest();
    request.source = this;
    request.transaction = this.objectStore.transaction;

    const cursor = new BridgeIDBCursorWithValue(
      this,
      this.objectStore.name,
      this._name,
      range,
      direction,
      request,
    );

    const operation = async () => {
      return cursor._iterate();
    };

    return this.objectStore.transaction._execRequestAsync({
      operation,
      request,
      source: this,
    });
  }

  // tslint:disable-next-line max-line-length
  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-openKeyCursor-IDBRequest-any-range-IDBCursorDirection-direction
  public openKeyCursor(
    range?: BridgeIDBKeyRange | Key | null | undefined,
    direction: BridgeIDBCursorDirection = "next",
  ) {
    confirmActiveTransaction(this);

    if (range === null) {
      range = undefined;
    }
    if (range !== undefined && !(range instanceof BridgeIDBKeyRange)) {
      range = BridgeIDBKeyRange.only(valueToKey(range));
    }

    const request = new BridgeIDBRequest();
    request.source = this;
    request.transaction = this.objectStore.transaction;

    const cursor = new BridgeIDBCursor(
      this,
      this.objectStore.name,
      this._name,
      range,
      direction,
      request,
      true,
    );

    return this.objectStore.transaction._execRequestAsync({
      operation: cursor._iterate.bind(cursor),
      request,
      source: this,
    });
  }

  public get(key: BridgeIDBKeyRange | Key) {
    confirmActiveTransaction(this);

    if (!(key instanceof BridgeIDBKeyRange)) {
      key = BridgeIDBKeyRange._valueToKeyRange(key);
    }

    const getReq: RecordGetRequest = {
      direction: "next",
      indexName: this._name,
      limit: 1,
      range: key,
      objectStoreName: this.objectStore._name,
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
      return values[0];
    };

    return this.objectStore.transaction._execRequestAsync({
      operation,
      source: this,
    });
  }

  // http://w3c.github.io/IndexedDB/#dom-idbindex-getall
  public getAll(query?: BridgeIDBKeyRange | Key, count?: number) {
    throw Error("not implemented");
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-getKey-IDBRequest-any-key
  public getKey(key: BridgeIDBKeyRange | Key) {
    confirmActiveTransaction(this);

    if (!(key instanceof BridgeIDBKeyRange)) {
      key = BridgeIDBKeyRange._valueToKeyRange(key);
    }

    const getReq: RecordGetRequest = {
      direction: "next",
      indexName: this._name,
      limit: 1,
      range: key,
      objectStoreName: this.objectStore._name,
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

    return this.objectStore.transaction._execRequestAsync({
      operation,
      source: this,
    });
  }

  // http://w3c.github.io/IndexedDB/#dom-idbindex-getallkeys
  public getAllKeys(query?: BridgeIDBKeyRange | Key, count?: number) {
    throw Error("not implemented");
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-count-IDBRequest-any-key
  public count(key: BridgeIDBKeyRange | Key | null | undefined) {
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
      objectStoreName: this.objectStore._name,
      resultLevel: ResultLevel.OnlyCount,
    };

    const operation = async () => {
      const { btx } = this._confirmActiveTransaction();
      const result = await this._backend.getRecords(btx, getReq);
      return result.count;
    };

    return this.objectStore.transaction._execRequestAsync({
      operation,
      source: this,
    });

  }

  public toString() {
    return "[object IDBIndex]";
  }
}

export default BridgeIDBIndex;
