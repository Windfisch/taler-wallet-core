/*
 Copyright 2019 Florian Dold

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
  Schema,
  RecordStoreRequest,
  IndexProperties,
  RecordGetRequest,
  RecordGetResponse,
  ResultLevel,
  StoreLevel,
  RecordStoreResponse,
} from "./backend-interface";
import structuredClone from "./util/structuredClone";
import {
  InvalidStateError,
  InvalidAccessError,
  ConstraintError,
} from "./util/errors";
import BTree, { ISortedMap, ISortedMapF } from "./tree/b+tree";
import BridgeIDBFactory from "./BridgeIDBFactory";
import compareKeys from "./util/cmp";
import extractKey from "./util/extractKey";
import { Key, Value, KeyPath } from "./util/types";
import { StoreKeyResult, makeStoreKeyValue } from "./util/makeStoreKeyValue";
import getIndexKeys from "./util/getIndexKeys";
import openPromise from "./util/openPromise";
import BridgeIDBKeyRange from "./BridgeIDBKeyRange";
import { resetWarningCache } from "prop-types";

enum TransactionLevel {
  Disconnected = 0,
  Connected = 1,
  Read = 2,
  Write = 3,
  VersionChange = 4,
}

interface ObjectStore {
  originalName: string;
  modifiedName: string | undefined;
  originalData: ISortedMapF<Key, ObjectStoreRecord>;
  modifiedData: ISortedMapF<Key, ObjectStoreRecord> | undefined;
  deleted: boolean;
  originalKeyGenerator: number;
  modifiedKeyGenerator: number | undefined;
}

interface Index {
  originalName: string;
  modifiedName: string | undefined;
  originalData: ISortedMapF<Key, IndexRecord>;
  modifiedData: ISortedMapF<Key, IndexRecord> | undefined;
  deleted: boolean;
}

interface Database {
  committedObjectStores: { [name: string]: ObjectStore };
  modifiedObjectStores: { [name: string]: ObjectStore };
  committedIndexes: { [name: string]: Index };
  modifiedIndexes: { [name: string]: Index };
  committedSchema: Schema;
  /**
   * Was the transaction deleted during the running transaction?
   */
  deleted: boolean;

  txLevel: TransactionLevel;

  connectionCookie: string | undefined;
}

interface Connection {
  dbName: string;

  modifiedSchema: Schema | undefined;

  /**
   * Has the underlying database been deleted?
   */
  deleted: boolean;

  /**
   * Map from the effective name of an object store during
   * the transaction to the real name.
   */
  objectStoreMap: { [currentName: string]: ObjectStore };
  indexMap: { [currentName: string]: Index };
}

interface IndexRecord {
  indexKey: Key;
  primaryKeys: Key[];
}

interface ObjectStoreRecord {
  primaryKey: Key;
  value: Value;
}

class AsyncCondition {
  _waitPromise: Promise<void>;
  _resolveWaitPromise: () => void;
  constructor() {
    const op = openPromise<void>();
    this._waitPromise = op.promise;
    this._resolveWaitPromise = op.resolve;
  }

  wait(): Promise<void> {
    return this._waitPromise;
  }

  trigger(): void {
    this._resolveWaitPromise();
    const op = openPromise<void>();
    this._waitPromise = op.promise;
    this._resolveWaitPromise = op.resolve;
  }
}

function nextStoreKey<T>(
  forward: boolean,
  data: ISortedMapF<Key, ObjectStoreRecord>,
  k: Key | undefined,
) {
  if (k === undefined || k === null) {
    return undefined;
  }
  const res = forward ? data.nextHigherPair(k) : data.nextLowerPair(k);
  if (!res) {
    return undefined;
  }
  return res[1].primaryKey;
}

function furthestKey(
  forward: boolean,
  key1: Key | undefined,
  key2: Key | undefined,
) {
  if (key1 === undefined) {
    return key2;
  }
  if (key2 === undefined) {
    return key1;
  }
  const cmpResult = compareKeys(key1, key2);
  if (cmpResult === 0) {
    // Same result
    return key1;
  }
  if (forward && cmpResult === 1) {
    return key1;
  }
  if (forward && cmpResult === -1) {
    return key2;
  }
  if (!forward && cmpResult === 1) {
    return key2;
  }
  if (!forward && cmpResult === -1) {
    return key1;
  }
}

/**
 * Primitive in-memory backend.
 */
export class MemoryBackend implements Backend {
  databases: { [name: string]: Database } = {};

  connectionIdCounter = 1;

  transactionIdCounter = 1;

  /**
   * Connections by connection cookie.
   */
  connections: { [name: string]: Connection } = {};

  /**
   * Connections by transaction (!!) cookie.  In this implementation,
   * at most one transaction can run at the same time per connection.
   */
  connectionsByTransaction: { [tx: string]: Connection } = {};

  /**
   * Condition that is triggered whenever a client disconnects.
   */
  disconnectCond: AsyncCondition = new AsyncCondition();

  /**
   * Conditation that is triggered whenever a transaction finishes.
   */
  transactionDoneCond: AsyncCondition = new AsyncCondition();

  enableTracing: boolean = true;

  async getDatabases(): Promise<{ name: string; version: number }[]> {
    if (this.enableTracing) {
      console.log("TRACING: getDatabase");
    }
    const dbList = [];
    for (const name in this.databases) {
      dbList.push({
        name,
        version: this.databases[name].committedSchema.databaseVersion,
      });
    }
    return dbList;
  }

  async deleteDatabase(tx: DatabaseTransaction, name: string): Promise<void> {
    if (this.enableTracing) {
      console.log("TRACING: deleteDatabase");
    }
    const myConn = this.connectionsByTransaction[tx.transactionCookie];
    if (!myConn) {
      throw Error("no connection associated with transaction");
    }
    const myDb = this.databases[name];
    if (!myDb) {
      throw Error("db not found");
    }
    if (myDb.committedSchema.databaseName !== name) {
      throw Error("name does not match");
    }
    if (myDb.txLevel < TransactionLevel.VersionChange) {
      throw new InvalidStateError();
    }
    if (myDb.connectionCookie !== tx.transactionCookie) {
      throw new InvalidAccessError();
    }
    myDb.deleted = true;
  }

  async connectDatabase(name: string): Promise<DatabaseConnection> {
    if (this.enableTracing) {
      console.log(`TRACING: connectDatabase(${name})`);
    }
    const connectionId = this.connectionIdCounter++;
    const connectionCookie = `connection-${connectionId}`;

    let database = this.databases[name];
    if (!database) {
      const schema: Schema = {
        databaseName: name,
        indexes: {},
        databaseVersion: 0,
        objectStores: {},
      };
      database = {
        committedSchema: schema,
        deleted: false,
        modifiedIndexes: {},
        committedIndexes: {},
        committedObjectStores: {},
        modifiedObjectStores: {},
        txLevel: TransactionLevel.Disconnected,
        connectionCookie: undefined,
      };
      this.databases[name] = database;
    }

    while (database.txLevel !== TransactionLevel.Disconnected) {
      await this.disconnectCond.wait();
    }

    database.txLevel = TransactionLevel.Connected;
    database.connectionCookie = connectionCookie;

    const myConn: Connection = {
      dbName: name,
      deleted: false,
      indexMap: Object.assign({}, database.committedIndexes),
      objectStoreMap: Object.assign({}, database.committedObjectStores),
      modifiedSchema: structuredClone(database.committedSchema),
    };

    this.connections[connectionCookie] = myConn;

    return { connectionCookie };
  }

  async beginTransaction(
    conn: DatabaseConnection,
    objectStores: string[],
    mode: import("./util/types").TransactionMode,
  ): Promise<DatabaseTransaction> {
    if (this.enableTracing) {
      console.log(`TRACING: beginTransaction`);
    }
    const transactionCookie = `tx-${this.transactionIdCounter++}`;
    const myConn = this.connections[conn.connectionCookie];
    if (!myConn) {
      throw Error("connection not found");
    }
    const myDb = this.databases[myConn.dbName];
    if (!myDb) {
      throw Error("db not found");
    }

    while (myDb.txLevel !== TransactionLevel.Connected) {
      if (this.enableTracing) {
        console.log(`TRACING: beginTransaction -- waiting for others to close`);
      }
      await this.transactionDoneCond.wait();
    }

    if (mode === "readonly") {
      myDb.txLevel = TransactionLevel.Read;
    } else if (mode === "readwrite") {
      myDb.txLevel = TransactionLevel.Write;
    } else {
      throw Error("unsupported transaction mode");
    }

    this.connectionsByTransaction[transactionCookie] = myConn;

    return { transactionCookie };
  }

  async enterVersionChange(
    conn: DatabaseConnection,
    newVersion: number,
  ): Promise<DatabaseTransaction> {
    if (this.enableTracing) {
      console.log(`TRACING: enterVersionChange`);
    }
    const transactionCookie = `tx-vc-${this.transactionIdCounter++}`;
    const myConn = this.connections[conn.connectionCookie];
    if (!myConn) {
      throw Error("connection not found");
    }
    const myDb = this.databases[myConn.dbName];
    if (!myDb) {
      throw Error("db not found");
    }

    while (myDb.txLevel !== TransactionLevel.Connected) {
      await this.transactionDoneCond.wait();
    }

    myDb.txLevel = TransactionLevel.VersionChange;

    this.connectionsByTransaction[transactionCookie] = myConn;

    return { transactionCookie };
  }

  async close(conn: DatabaseConnection): Promise<void> {
    if (this.enableTracing) {
      console.log(`TRACING: close`);
    }
    const myConn = this.connections[conn.connectionCookie];
    if (!myConn) {
      throw Error("connection not found - already closed?");
    }
    if (!myConn.deleted) {
      const myDb = this.databases[myConn.dbName];
      if (myDb.txLevel != TransactionLevel.Connected) {
        throw Error("invalid state");
      }
      myDb.txLevel = TransactionLevel.Disconnected;
    }
    delete this.connections[conn.connectionCookie];
    this.disconnectCond.trigger();
  }

  getSchema(dbConn: DatabaseConnection): Schema {
    if (this.enableTracing) {
      console.log(`TRACING: getSchema`);
    }
    const myConn = this.connections[dbConn.connectionCookie];
    if (!myConn) {
      throw Error("unknown connection");
    }
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (myConn.modifiedSchema) {
      return myConn.modifiedSchema;
    }
    return db.committedSchema;
  }

  renameIndex(
    btx: DatabaseTransaction,
    oldName: string,
    newName: string,
  ): void {
    if (this.enableTracing) {
      console.log(`TRACING: renameIndex(?, ${oldName}, ${newName})`);
    }
    const myConn = this.connectionsByTransaction[btx.transactionCookie];
    if (!myConn) {
      throw Error("unknown connection");
    }
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.VersionChange) {
      throw Error("only allowed in versionchange transaction");
    }
    let schema = myConn.modifiedSchema;
    if (!schema) {
      throw Error();
    }
    if (schema.indexes[newName]) {
      throw new Error("new index name already used");
    }
    if (!schema.indexes[oldName]) {
      throw new Error("new index name already used");
    }
    const index: Index = myConn.indexMap[oldName];
    if (!index) {
      throw Error("old index missing in connection's index map");
    }
    schema.indexes[newName] = schema.indexes[newName];
    delete schema.indexes[oldName];
    for (const storeName in schema.objectStores) {
      const store = schema.objectStores[storeName];
      store.indexes = store.indexes.map(x => {
        if (x == oldName) {
          return newName;
        } else {
          return x;
        }
      });
    }
    myConn.indexMap[newName] = index;
    delete myConn.indexMap[oldName];
    index.modifiedName = newName;
  }

  deleteIndex(btx: DatabaseTransaction, indexName: string): void {
    if (this.enableTracing) {
      console.log(`TRACING: deleteIndex(${indexName})`);
    }
    const myConn = this.connections[btx.transactionCookie];
    if (!myConn) {
      throw Error("unknown connection");
    }
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.VersionChange) {
      throw Error("only allowed in versionchange transaction");
    }
    let schema = myConn.modifiedSchema;
    if (!schema) {
      throw Error();
    }
    if (!schema.indexes[indexName]) {
      throw new Error("index does not exist");
    }
    const index: Index = myConn.indexMap[indexName];
    if (!index) {
      throw Error("old index missing in connection's index map");
    }
    index.deleted = true;
    delete schema.indexes[indexName];
    delete myConn.indexMap[indexName];
    for (const storeName in schema.objectStores) {
      const store = schema.objectStores[storeName];
      store.indexes = store.indexes.filter(x => {
        return x !== indexName;
      });
    }
  }

  deleteObjectStore(btx: DatabaseTransaction, name: string): void {
    if (this.enableTracing) {
      console.log(`TRACING: deleteObjectStore(${name})`);
    }
    const myConn = this.connections[btx.transactionCookie];
    if (!myConn) {
      throw Error("unknown connection");
    }
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.VersionChange) {
      throw Error("only allowed in versionchange transaction");
    }
    const schema = myConn.modifiedSchema;
    if (!schema) {
      throw Error();
    }
    const objectStoreProperties = schema.objectStores[name];
    if (!objectStoreProperties) {
      throw Error("object store not found");
    }
    const objectStore = myConn.objectStoreMap[name];
    if (!objectStore) {
      throw Error("object store not found in map");
    }
    const indexNames = objectStoreProperties.indexes;
    for (const indexName of indexNames) {
      this.deleteIndex(btx, indexName);
    }

    objectStore.deleted = true;
    delete myConn.objectStoreMap[name];
    delete schema.objectStores[name];
  }

  renameObjectStore(
    btx: DatabaseTransaction,
    oldName: string,
    newName: string,
  ): void {
    if (this.enableTracing) {
      console.log(`TRACING: renameObjectStore(?, ${oldName}, ${newName})`);
    }

    const myConn = this.connections[btx.transactionCookie];
    if (!myConn) {
      throw Error("unknown connection");
    }
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.VersionChange) {
      throw Error("only allowed in versionchange transaction");
    }
    const schema = myConn.modifiedSchema;
    if (!schema) {
      throw Error();
    }
    if (!schema.objectStores[oldName]) {
      throw Error("object store not found");
    }
    if (schema.objectStores[newName]) {
      throw Error("new object store already exists");
    }
    const objectStore = myConn.objectStoreMap[oldName];
    if (!objectStore) {
      throw Error("object store not found in map");
    }
    objectStore.modifiedName = newName;
    schema.objectStores[newName] = schema.objectStores[oldName];
    delete schema.objectStores[oldName];
    delete myConn.objectStoreMap[oldName];
    myConn.objectStoreMap[newName] = objectStore;
  }

  createObjectStore(
    btx: DatabaseTransaction,
    name: string,
    keyPath: string | string[] | null,
    autoIncrement: boolean,
  ): void {
    if (this.enableTracing) {
      console.log(
        `TRACING: createObjectStore(${btx.transactionCookie}, ${name})`,
      );
    }
    const myConn = this.connectionsByTransaction[btx.transactionCookie];
    if (!myConn) {
      throw Error("unknown connection");
    }
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.VersionChange) {
      throw Error("only allowed in versionchange transaction");
    }
    const newObjectStore: ObjectStore = {
      deleted: false,
      modifiedName: undefined,
      originalName: name,
      modifiedData: undefined,
      originalData: new BTree([], compareKeys),
      modifiedKeyGenerator: undefined,
      originalKeyGenerator: 1,
    };
    const schema = myConn.modifiedSchema;
    if (!schema) {
      throw Error("no schema for versionchange tx");
    }
    schema.objectStores[name] = {
      autoIncrement,
      keyPath,
      indexes: [],
    };
    myConn.objectStoreMap[name] = newObjectStore;
    db.modifiedObjectStores[name] = newObjectStore;
  }

  createIndex(
    btx: DatabaseTransaction,
    indexName: string,
    objectStoreName: string,
    keyPath: import("./util/types").KeyPath,
    multiEntry: boolean,
    unique: boolean,
  ): void {
    if (this.enableTracing) {
      console.log(`TRACING: createIndex(${indexName})`);
    }
    const myConn = this.connectionsByTransaction[btx.transactionCookie];
    if (!myConn) {
      throw Error("unknown connection");
    }
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.VersionChange) {
      throw Error("only allowed in versionchange transaction");
    }
    const indexProperties: IndexProperties = {
      keyPath,
      multiEntry,
      unique,
    };
    const newIndex: Index = {
      deleted: false,
      modifiedData: undefined,
      modifiedName: undefined,
      originalData: new BTree([], compareKeys),
      originalName: indexName,
    };
    myConn.indexMap[indexName] = newIndex;
    db.modifiedIndexes[indexName] = newIndex;
    const schema = myConn.modifiedSchema;
    if (!schema) {
      throw Error("no schema in versionchange tx");
    }
    const objectStoreProperties = schema.objectStores[objectStoreName];
    if (!objectStoreProperties) {
      throw Error("object store not found");
    }
    objectStoreProperties.indexes.push(indexName);
    schema.indexes[indexName] = indexProperties;

    const objectStore = myConn.objectStoreMap[objectStoreName];
    if (!objectStore) {
      throw Error("object store does not exist");
    }

    const storeData = objectStore.modifiedData || objectStore.originalData;

    storeData.forEach((v, k) => {
      this.insertIntoIndex(newIndex, k, v.value, indexProperties);
    });
  }

  async deleteRecord(
    btx: DatabaseTransaction,
    objectStoreName: string,
    range: BridgeIDBKeyRange,
  ): Promise<void> {
    if (this.enableTracing) {
      console.log(`TRACING: deleteRecord from store ${objectStoreName}`);
    }
    const myConn = this.connectionsByTransaction[btx.transactionCookie];
    if (!myConn) {
      throw Error("unknown connection");
    }
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.Write) {
      throw Error("only allowed in write transaction");
    }
    if (typeof range !== "object") {
      throw Error("deleteRecord got invalid range (must be object)");
    }
    if (!("lowerOpen" in range)) {
      throw Error("deleteRecord got invalid range (sanity check failed, 'lowerOpen' missing)");
    }

    const schema = myConn.modifiedSchema
      ? myConn.modifiedSchema
      : db.committedSchema;
    const objectStore = myConn.objectStoreMap[objectStoreName];

    if (!objectStore.modifiedData) {
      objectStore.modifiedData = objectStore.originalData;
    }

    let modifiedData = objectStore.modifiedData;
    let currKey: Key | undefined;

    if (range.lower === undefined || range.lower === null) {
      currKey = modifiedData.minKey();
    } else {
      currKey = range.lower;
      // We have a range with an lowerOpen lower bound, so don't start
      // deleting the upper bound.  Instead start with the next higher key.
      if (range.lowerOpen && currKey !== undefined) {
       currKey = modifiedData.nextHigherKey(currKey);
      }
    }

    // invariant: (currKey is undefined) or (currKey is a valid key)

    while (true) {
      if (currKey === undefined) {
        // nothing more to delete!
        break;
      }
      if (range.upper !== null && range.upper !== undefined) {
        if (range.upperOpen && compareKeys(currKey, range.upper) === 0) {
          // We have a range that's upperOpen, so stop before we delete the upper bound.
          break;
        }
        if ((!range.upperOpen) && compareKeys(currKey, range.upper) > 0) {
          // The upper range is inclusive, only stop if we're after the upper range.
          break;
        }
      }

      const storeEntry = modifiedData.get(currKey);
      if (!storeEntry) {
        throw Error("assertion failed");
      }

      for (const indexName of schema.objectStores[objectStoreName].indexes) {
        const index = myConn.indexMap[indexName];
        if (!index) {
          throw Error("index referenced by object store does not exist");
        }
        const indexProperties = schema.indexes[indexName];
        this.deleteFromIndex(index, storeEntry.primaryKey, storeEntry.value, indexProperties);
      }

      modifiedData = modifiedData.without(currKey);

      currKey = modifiedData.nextHigherKey(currKey);
    }

    objectStore.modifiedData = modifiedData;
  }

  private deleteFromIndex(
    index: Index,
    primaryKey: Key,
    value: Value,
    indexProperties: IndexProperties,
  ): void {
    if (this.enableTracing) {
      console.log(
        `deleteFromIndex(${index.modifiedName || index.originalName})`,
      );
    }
    if (value === undefined || value === null) {
      throw Error("cannot delete null/undefined value from index");
    }
    let indexData = index.modifiedData || index.originalData;
    const indexKeys = getIndexKeys(
      value,
      indexProperties.keyPath,
      indexProperties.multiEntry,
    );
    for (const indexKey of indexKeys) {
      const existingRecord = indexData.get(indexKey);
      if (!existingRecord) {
        throw Error("db inconsistent: expected index entry missing");
      }
      const newPrimaryKeys = existingRecord.primaryKeys.filter((x) => compareKeys(x, primaryKey) !== 0);
      if (newPrimaryKeys.length === 0) {
        index.originalData = indexData.without(indexKey);
      } else {
        const newIndexRecord = {
          indexKey,
          primaryKeys: newPrimaryKeys,
        }
        index.modifiedData = indexData.with(indexKey, newIndexRecord, true);
      }
    }
  }

  async getRecords(
    btx: DatabaseTransaction,
    req: RecordGetRequest,
  ): Promise<RecordGetResponse> {
    if (this.enableTracing) {
      console.log(`TRACING: getRecords`);
      console.log("query", req);
    }
    const myConn = this.connectionsByTransaction[btx.transactionCookie];
    if (!myConn) {
      throw Error("unknown connection");
    }
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.Read) {
      throw Error("only allowed while running a transaction");
    }
    const objectStore = myConn.objectStoreMap[req.objectStoreName];
    if (!objectStore) {
      throw Error("object store not found");
    }

    let range;
    if (req.range == null || req.range === undefined) {
      range = new BridgeIDBKeyRange(undefined, undefined, true, true);
    } else {
      range = req.range;
    }

    if (typeof range !== "object") {
      throw Error(
        "getRecords was given an invalid range (sanity check failed, not an object)",
      );
    }

    if (!("lowerOpen" in range)) {
      throw Error(
        "getRecords was given an invalid range (sanity check failed, lowerOpen missing)",
      );
    }

    let numResults = 0;
    let indexKeys: Key[] = [];
    let primaryKeys: Key[] = [];
    let values: Value[] = [];

    const forward: boolean =
      req.direction === "next" || req.direction === "nextunique";
    const unique: boolean =
      req.direction === "prevunique" || req.direction === "nextunique";

    const storeData = objectStore.modifiedData || objectStore.originalData;

    const haveIndex = req.indexName !== undefined;

    if (haveIndex) {
      const index = myConn.indexMap[req.indexName!];
      const indexData = index.modifiedData || index.originalData;
      let indexPos = req.lastIndexPosition;

      if (indexPos === undefined) {
        // First time we iterate!  So start at the beginning (lower/upper)
        // of our allowed range.
        indexPos = forward ? range.lower : range.upper;
      }

      let primaryPos = req.lastObjectStorePosition;

      // We might have to advance the index key further!
      if (req.advanceIndexKey !== undefined) {
        const compareResult = compareKeys(req.advanceIndexKey, indexPos);
        if ((forward && compareResult > 0) || (!forward && compareResult > 0)) {
          indexPos = req.advanceIndexKey;
        } else if (compareResult == 0 && req.advancePrimaryKey !== undefined) {
          // index keys are the same, so advance the primary key
          if (primaryPos === undefined) {
            primaryPos = req.advancePrimaryKey;
          } else {
            const primCompareResult = compareKeys(
              req.advancePrimaryKey,
              primaryPos,
            );
            if (
              (forward && primCompareResult > 0) ||
              (!forward && primCompareResult < 0)
            ) {
              primaryPos = req.advancePrimaryKey;
            }
          }
        }
      }

      if (indexPos === undefined || indexPos === null) {
        indexPos = forward ? indexData.minKey() : indexData.maxKey();
      }

      let indexEntry: IndexRecord | undefined;
      indexEntry = indexData.get(indexPos);
      if (!indexEntry) {
        const res = indexData.nextHigherPair(indexPos);
        if (res) {
          indexEntry = res[1];
        }
      }

      let primkeySubPos = 0;

      // Sort out the case where the index key is the same, so we have
      // to get the prev/next primary key
      if (
        indexEntry !== undefined &&
        req.lastIndexPosition !== undefined &&
        compareKeys(indexEntry.indexKey, req.lastIndexPosition) === 0
      ) {
        let pos = forward ? 0 : indexEntry.primaryKeys.length - 1;
        this.enableTracing &&
          console.log("number of primary keys", indexEntry.primaryKeys.length);
        this.enableTracing && console.log("start pos is", pos);
        // Advance past the lastObjectStorePosition
        do {
          const cmpResult = compareKeys(
            req.lastObjectStorePosition,
            indexEntry.primaryKeys[pos],
          );
          this.enableTracing && console.log("cmp result is", cmpResult);
          if ((forward && cmpResult < 0) || (!forward && cmpResult > 0)) {
            break;
          }
          pos += forward ? 1 : -1;
          this.enableTracing && console.log("now pos is", pos);
        } while (pos >= 0 && pos < indexEntry.primaryKeys.length);

        // Make sure we're at least at advancedPrimaryPos
        while (
          primaryPos !== undefined &&
          pos >= 0 &&
          pos < indexEntry.primaryKeys.length
        ) {
          const cmpResult = compareKeys(
            primaryPos,
            indexEntry.primaryKeys[pos],
          );
          if ((forward && cmpResult <= 0) || (!forward && cmpResult >= 0)) {
            break;
          }
          pos += forward ? 1 : -1;
        }
        primkeySubPos = pos;
      } else if (indexEntry !== undefined) {
        primkeySubPos = forward ? 0 : indexEntry.primaryKeys.length - 1;
      }

      if (this.enableTracing) {
        console.log("subPos=", primkeySubPos);
        console.log("indexPos=", indexPos);
      }

      while (1) {
        if (req.limit != 0 && numResults == req.limit) {
          break;
        }
        if (indexPos === undefined) {
          break;
        }
        if (!range.includes(indexPos)) {
          break;
        }
        if (indexEntry === undefined) {
          break;
        }
        if (
          primkeySubPos < 0 ||
          primkeySubPos >= indexEntry.primaryKeys.length
        ) {
          const res = forward
            ? indexData.nextHigherPair(indexPos)
            : indexData.nextLowerPair(indexPos);
          if (res) {
            indexPos = res[1].indexKey;
            indexEntry = res[1];
            primkeySubPos = forward ? 0 : indexEntry.primaryKeys.length - 1;
          } else {
            break;
          }
        }

        // Skip repeated index keys if unique results are requested.
        let skip = false;
        if (unique) {
          if (
            indexKeys.length > 0 &&
            compareKeys(
              indexEntry.indexKey,
              indexKeys[indexKeys.length - 1],
            ) === 0
          ) {
            skip = true;
          }
          if (
            req.lastIndexPosition !== undefined &&
            compareKeys(indexPos, req.lastIndexPosition) === 0
          ) {
            skip = true;
          }
        }
        if (!skip) {
          if (this.enableTracing) {
            console.log(`not skipping!, subPos=${primkeySubPos}`);
          }
          indexKeys.push(indexEntry.indexKey);
          primaryKeys.push(indexEntry.primaryKeys[primkeySubPos]);
          numResults++;
        } else {
          if (this.enableTracing) {
            console.log("skipping!");
          }
        }
        primkeySubPos += forward ? 1 : -1;
      }

      // Now we can collect the values based on the primary keys,
      // if requested.
      if (req.resultLevel === ResultLevel.Full) {
        for (let i = 0; i < numResults; i++) {
          const result = storeData.get(primaryKeys[i]);
          if (!result) {
            throw Error("invariant violated");
          }
          values.push(result.value);
        }
      }
    } else {
      // only based on object store, no index involved, phew!
      let storePos = req.lastObjectStorePosition;
      if (storePos === undefined) {
        storePos = forward ? range.lower : range.upper;
      }

      if (req.advanceIndexKey !== undefined) {
        throw Error("unsupported request");
      }

      storePos = furthestKey(forward, req.advancePrimaryKey, storePos);

      if (storePos !== null && storePos !== undefined) {
        // Advance store position if we are either still at the last returned
        // store key, or if we are currently not on a key.
        const storeEntry = storeData.get(storePos);
        if (this.enableTracing) {
          console.log("store entry:", storeEntry);
        }
        if (
          !storeEntry ||
          (req.lastObjectStorePosition !== undefined &&
            compareKeys(req.lastObjectStorePosition, storePos) === 0)
        ) {
          storePos = storeData.nextHigherKey(storePos);
        }
      } else {
        storePos = forward ? storeData.minKey() : storeData.maxKey();
        if (this.enableTracing) {
          console.log("setting starting store pos to", storePos);
        }
      }

      while (1) {
        if (req.limit != 0 && numResults == req.limit) {
          break;
        }
        if (storePos === null || storePos === undefined) {
          break;
        }
        if (!range.includes(storePos)) {
          break;
        }

        const res = storeData.get(storePos);

        if (res === undefined) {
          break;
        }

        if (req.resultLevel >= ResultLevel.OnlyKeys) {
          primaryKeys.push(structuredClone(storePos));
        }

        if (req.resultLevel >= ResultLevel.Full) {
          values.push(res.value);
        }

        numResults++;
        storePos = nextStoreKey(forward, storeData, storePos);
      }
    }
    if (this.enableTracing) {
      console.log(`TRACING: getRecords got ${numResults} results`);
    }
    return {
      count: numResults,
      indexKeys:
        req.resultLevel >= ResultLevel.OnlyKeys && haveIndex
          ? indexKeys
          : undefined,
      primaryKeys:
        req.resultLevel >= ResultLevel.OnlyKeys ? primaryKeys : undefined,
      values: req.resultLevel >= ResultLevel.Full ? values : undefined,
    };
  }

  async storeRecord(
    btx: DatabaseTransaction,
    storeReq: RecordStoreRequest,
  ): Promise<RecordStoreResponse> {
    if (this.enableTracing) {
      console.log(`TRACING: storeRecord`);
    }
    const myConn = this.connectionsByTransaction[btx.transactionCookie];
    if (!myConn) {
      throw Error("unknown connection");
    }
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.Write) {
      throw Error("only allowed while running a transaction");
    }
    const schema = myConn.modifiedSchema
      ? myConn.modifiedSchema
      : db.committedSchema;
    const objectStore = myConn.objectStoreMap[storeReq.objectStoreName];

    if (!objectStore.modifiedData) {
      objectStore.modifiedData = objectStore.originalData;
    }
    const modifiedData = objectStore.modifiedData;

    let key;
    let value;

    if (storeReq.storeLevel === StoreLevel.UpdateExisting) {
      if (storeReq.key === null || storeReq.key === undefined) {
        throw Error("invalid update request (key not given)");
      }

      if (!objectStore.modifiedData.has(storeReq.key)) {
        throw Error("invalid update request (record does not exist)");
      }
      key = storeReq.key;
      value = storeReq.value;
    } else {
      const storeKeyResult: StoreKeyResult = makeStoreKeyValue(
        storeReq.value,
        storeReq.key,
        objectStore.modifiedKeyGenerator || objectStore.originalKeyGenerator,
        schema.objectStores[storeReq.objectStoreName].autoIncrement,
        schema.objectStores[storeReq.objectStoreName].keyPath,
      );
      key = storeKeyResult.key;
      value = storeKeyResult.value;
      objectStore.modifiedKeyGenerator = storeKeyResult.updatedKeyGenerator;
      const hasKey = modifiedData.has(key);

      if (hasKey && storeReq.storeLevel !== StoreLevel.AllowOverwrite) {
        throw Error("refusing to overwrite");
      }
    }

    const objectStoreRecord: ObjectStoreRecord = {
      primaryKey: key,
      value: value,
    };

    objectStore.modifiedData = modifiedData.with(key, objectStoreRecord, true);

    for (const indexName of schema.objectStores[storeReq.objectStoreName]
      .indexes) {
      const index = myConn.indexMap[indexName];
      if (!index) {
        throw Error("index referenced by object store does not exist");
      }
      const indexProperties = schema.indexes[indexName];
      this.insertIntoIndex(index, key, value, indexProperties);
    }

    return { key };
  }

  private insertIntoIndex(
    index: Index,
    primaryKey: Key,
    value: Value,
    indexProperties: IndexProperties,
  ): void {
    if (this.enableTracing) {
      console.log(
        `insertIntoIndex(${index.modifiedName || index.originalName})`,
      );
    }
    let indexData = index.modifiedData || index.originalData;
    const indexKeys = getIndexKeys(
      value,
      indexProperties.keyPath,
      indexProperties.multiEntry,
    );
    for (const indexKey of indexKeys) {
      const existingRecord = indexData.get(indexKey);
      if (existingRecord) {
        if (indexProperties.unique) {
          throw new ConstraintError();
        } else {
          const newIndexRecord = {
            indexKey: indexKey,
            primaryKeys: [primaryKey]
              .concat(existingRecord.primaryKeys)
              .sort(compareKeys),
          };
          index.modifiedData = indexData.with(indexKey, newIndexRecord, true);
        }
      } else {
        const newIndexRecord: IndexRecord = {
          indexKey: indexKey,
          primaryKeys: [primaryKey],
        };
        index.modifiedData = indexData.with(indexKey, newIndexRecord, true);
      }
    }
  }

  async rollback(btx: DatabaseTransaction): Promise<void> {
    if (this.enableTracing) {
      console.log(`TRACING: rollback`);
    }
    const myConn = this.connectionsByTransaction[btx.transactionCookie];
    if (!myConn) {
      throw Error("unknown connection");
    }
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.Read) {
      throw Error("only allowed while running a transaction");
    }
    db.modifiedIndexes = {};
    db.modifiedObjectStores = {};
    db.txLevel = TransactionLevel.Connected;
    myConn.modifiedSchema = structuredClone(db.committedSchema);
    myConn.indexMap = Object.assign({}, db.committedIndexes);
    myConn.objectStoreMap = Object.assign({}, db.committedObjectStores);
    for (const indexName in db.committedIndexes) {
      const index = db.committedIndexes[indexName];
      index.deleted = false;
      index.modifiedData = undefined;
      index.modifiedName = undefined;
    }
    for (const objectStoreName in db.committedObjectStores) {
      const objectStore = db.committedObjectStores[objectStoreName];
      objectStore.deleted = false;
      objectStore.modifiedData = undefined;
      objectStore.modifiedName = undefined;
      objectStore.modifiedKeyGenerator = undefined;
    }
    delete this.connectionsByTransaction[btx.transactionCookie];
    this.transactionDoneCond.trigger();
  }

  async commit(btx: DatabaseTransaction): Promise<void> {
    if (this.enableTracing) {
      console.log(`TRACING: commit`);
    }
    const myConn = this.connectionsByTransaction[btx.transactionCookie];
    if (!myConn) {
      throw Error("unknown connection");
    }
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.Read) {
      throw Error("only allowed while running a transaction");
    }

    db.committedSchema = myConn.modifiedSchema || db.committedSchema;
    db.txLevel = TransactionLevel.Connected;

    db.committedIndexes = {};
    db.committedObjectStores = {};
    db.modifiedIndexes = {};
    db.committedObjectStores = {};

    for (const indexName in myConn.indexMap) {
      const index = myConn.indexMap[indexName];
      index.deleted = false;
      index.originalData = index.modifiedData || index.originalData;
      index.originalName = index.modifiedName || index.originalName;
      db.committedIndexes[indexName] = index;
    }

    for (const objectStoreName in myConn.objectStoreMap) {
      const objectStore = myConn.objectStoreMap[objectStoreName];
      objectStore.deleted = false;
      objectStore.originalData =
        objectStore.modifiedData || objectStore.originalData;
      objectStore.originalName =
        objectStore.modifiedName || objectStore.originalName;
      if (objectStore.modifiedKeyGenerator !== undefined) {
        objectStore.originalKeyGenerator = objectStore.modifiedKeyGenerator;
      }
      db.committedObjectStores[objectStoreName] = objectStore;
    }

    myConn.indexMap = Object.assign({}, db.committedIndexes);
    myConn.objectStoreMap = Object.assign({}, db.committedObjectStores);

    delete this.connectionsByTransaction[btx.transactionCookie];
    this.transactionDoneCond.trigger();
  }
}

export default MemoryBackend;
