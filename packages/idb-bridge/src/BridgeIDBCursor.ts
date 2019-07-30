/*
 Copyright 2019 Florian Dold
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

import BridgeIDBKeyRange from "./BridgeIDBKeyRange";
import BridgeIDBObjectStore from "./BridgeIDBObjectStore";
import BridgeIDBRequest from "./BridgeIDBRequest";
import compareKeys from "./util/cmp";
import {
  DataError,
  InvalidAccessError,
  InvalidStateError,
  ReadOnlyError,
  TransactionInactiveError,
} from "./util/errors";
import extractKey from "./util/extractKey";
import structuredClone from "./util/structuredClone";
import {
  CursorRange,
  CursorSource,
  Key,
  Value,
  BridgeIDBCursorDirection,
} from "./util/types";
import valueToKey from "./util/valueToKey";
import {
  RecordGetRequest,
  ResultLevel,
  Backend,
  DatabaseTransaction,
  RecordStoreRequest,
  StoreLevel,
} from "./backend-interface";
import BridgeIDBFactory from "./BridgeIDBFactory";

/**
 * http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#cursor
 */
export class BridgeIDBCursor {
  _request: BridgeIDBRequest | undefined;

  private _gotValue: boolean = false;
  private _range: CursorRange;
  private _indexPosition = undefined; // Key of previously returned record
  private _objectStorePosition = undefined;
  private _keyOnly: boolean;

  private _source: CursorSource;
  private _direction: BridgeIDBCursorDirection;
  private _key = undefined;
  private _primaryKey: Key | undefined = undefined;
  private _indexName: string | undefined;
  private _objectStoreName: string;

  protected _value: Value = undefined;

  constructor(
    source: CursorSource,
    objectStoreName: string,
    indexName: string | undefined,
    range: CursorRange,
    direction: BridgeIDBCursorDirection,
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
    return this.source.objectStore;
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

  get key() {
    return this._key;
  }
  set key(val) {
    /* For babel */
  }

  get primaryKey() {
    return this._primaryKey;
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
  async _iterate(key?: Key, primaryKey?: Key): Promise<any> {
    BridgeIDBFactory.enableTracing &&
      console.log(
        `iterating cursor os=${this._objectStoreName},idx=${this._indexName}`,
      );
    BridgeIDBFactory.enableTracing && console.log("cursor type ", this.toString());
    const recordGetRequest: RecordGetRequest = {
      direction: this.direction,
      indexName: this._indexName,
      lastIndexPosition: this._indexPosition,
      lastObjectStorePosition: this._objectStorePosition,
      limit: 1,
      range: this._range,
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
      this._value = response.values![0];
    }

    this._gotValue = true;
    this._objectStorePosition = structuredClone(response.primaryKeys![0]);
    if (response.indexKeys !== undefined && response.indexKeys.length > 0) {
      this._indexPosition = structuredClone(response.indexKeys[0]);
    }

    return this;
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBCursor-update-IDBRequest-any-value
  public update(value: Value) {
    if (value === undefined) {
      throw new TypeError();
    }

    const transaction = this._effectiveObjectStore.transaction;

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
      value: value,
      objectStoreName: this._objectStoreName,
      storeLevel: StoreLevel.UpdateExisting,
    };

    const operation = async () => {
      if (BridgeIDBFactory.enableTracing) {
        console.log("updating at cursor")
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
  public continue(key?: Key) {
    const transaction = this._effectiveObjectStore.transaction;

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
  public continuePrimaryKey(key: Key, primaryKey: Key) {
    throw Error("not implemented");
  }

  public delete() {
    const transaction = this._effectiveObjectStore.transaction;

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

export default BridgeIDBCursor;
