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
} from "./backend-interface.js";
import {
  structuredClone,
  structuredEncapsulate,
  structuredRevive,
} from "./util/structuredClone.js";
import { ConstraintError, DataError } from "./util/errors.js";
import BTree, { ISortedMapF, ISortedSetF } from "./tree/b+tree.js";
import { compareKeys } from "./util/cmp.js";
import { StoreKeyResult, makeStoreKeyValue } from "./util/makeStoreKeyValue.js";
import { getIndexKeys } from "./util/getIndexKeys.js";
import { openPromise } from "./util/openPromise.js";
import { IDBKeyRange, IDBTransactionMode, IDBValidKey } from "./idbtypes.js";
import { BridgeIDBKeyRange } from "./bridge-idb.js";

type Key = IDBValidKey;
type Value = unknown;

enum TransactionLevel {
  None = 0,
  Read = 1,
  Write = 2,
  VersionChange = 3,
}

interface ObjectStore {
  originalName: string;
  modifiedName: string | undefined;
  originalData: ISortedMapF<Key, ObjectStoreRecord>;
  modifiedData: ISortedMapF<Key, ObjectStoreRecord> | undefined;
  deleted: boolean;
  originalKeyGenerator: number;
  modifiedKeyGenerator: number | undefined;
  committedIndexes: { [name: string]: Index };
  modifiedIndexes: { [name: string]: Index };
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
  committedSchema: Schema;
  /**
   * Was the transaction deleted during the running transaction?
   */
  deleted: boolean;

  txLevel: TransactionLevel;

  txOwnerConnectionCookie?: string;
  txOwnerTransactionCookie?: string;

  /**
   * Object stores that the transaction is allowed to access.
   */
  txRestrictObjectStores: string[] | undefined;

  /**
   * Connection cookies of current connections.
   */
  connectionCookies: string[];
}

/** @public */
export interface ObjectStoreDump {
  name: string;
  keyGenerator: number;
  records: ObjectStoreRecord[];
}

/** @public */
export interface DatabaseDump {
  schema: Schema;
  objectStores: { [name: string]: ObjectStoreDump };
}

/** @public */
export interface MemoryBackendDump {
  databases: { [name: string]: DatabaseDump };
}

interface ObjectStoreMapEntry {
  store: ObjectStore;
  indexMap: { [currentName: string]: Index };
}

interface Connection {
  dbName: string;

  modifiedSchema: Schema;

  /**
   * Map from the effective name of an object store during
   * the transaction to the real name.
   */
  objectStoreMap: { [currentName: string]: ObjectStoreMapEntry };
}

/** @public */
export interface IndexRecord {
  indexKey: Key;
  primaryKeys: ISortedSetF<Key>;
}

/** @public */
export interface ObjectStoreRecord {
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

function assertInvariant(cond: boolean): asserts cond {
  if (!cond) {
    throw Error("invariant failed");
  }
}

function nextKey(
  forward: boolean,
  tree: ISortedSetF<IDBValidKey>,
  key: IDBValidKey | undefined,
): IDBValidKey | undefined {
  if (key != null) {
    return forward ? tree.nextHigherKey(key) : tree.nextLowerKey(key);
  }
  return forward ? tree.minKey() : tree.maxKey();
}

/**
 * Return the key that is furthest in
 * the direction indicated by the 'forward' flag.
 */
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

export interface AccessStats {
  writeTransactions: number;
  readTransactions: number;
  writesPerStore: Record<string, number>;
  readsPerStore: Record<string, number>;
  readsPerIndex: Record<string, number>;
  readItemsPerIndex: Record<string, number>;
  readItemsPerStore: Record<string, number>;
}

/**
 * Primitive in-memory backend.
 *
 * @public
 */
export class MemoryBackend implements Backend {
  private databases: { [name: string]: Database } = {};

  private connectionIdCounter = 1;

  private transactionIdCounter = 1;

  /**
   * Connections by connection cookie.
   */
  private connections: { [name: string]: Connection } = {};

  /**
   * Connections by transaction (!!) cookie.  In this implementation,
   * at most one transaction can run at the same time per connection.
   */
  private connectionsByTransaction: { [tx: string]: Connection } = {};

  /**
   * Condition that is triggered whenever a client disconnects.
   */
  private disconnectCond: AsyncCondition = new AsyncCondition();

  /**
   * Condition that is triggered whenever a transaction finishes.
   */
  private transactionDoneCond: AsyncCondition = new AsyncCondition();

  afterCommitCallback?: () => Promise<void>;

  enableTracing: boolean = false;

  trackStats: boolean = true;

  accessStats: AccessStats = {
    readTransactions: 0,
    writeTransactions: 0,
    readsPerStore: {},
    readsPerIndex: {},
    readItemsPerIndex: {},
    readItemsPerStore: {},
    writesPerStore: {},
  };

  /**
   * Load the data in this IndexedDB backend from a dump in JSON format.
   *
   * Must be called before any connections to the database backend have
   * been made.
   */
  importDump(dataJson: any) {
    if (this.transactionIdCounter != 1 || this.connectionIdCounter != 1) {
      throw Error(
        "data must be imported before first transaction or connection",
      );
    }

    // FIXME: validate!
    const data = structuredRevive(dataJson) as MemoryBackendDump;

    if (typeof data !== "object") {
      throw Error("db dump corrupt");
    }

    this.databases = {};

    for (const dbName of Object.keys(data.databases)) {
      const schema = data.databases[dbName].schema;
      if (typeof schema !== "object") {
        throw Error("DB dump corrupt");
      }
      const objectStores: { [name: string]: ObjectStore } = {};
      for (const objectStoreName of Object.keys(
        data.databases[dbName].objectStores,
      )) {
        const storeSchema = schema.objectStores[objectStoreName];
        const dumpedObjectStore: ObjectStoreDump =
          data.databases[dbName].objectStores[objectStoreName];

        const pairs = dumpedObjectStore.records.map((r: any) => {
          return structuredClone([r.primaryKey, r]);
        });
        const objectStoreData: ISortedMapF<Key, ObjectStoreRecord> = new BTree(
          pairs,
          compareKeys,
        );
        const objectStore: ObjectStore = {
          deleted: false,
          modifiedData: undefined,
          modifiedName: undefined,
          modifiedKeyGenerator: undefined,
          originalData: objectStoreData,
          originalName: objectStoreName,
          originalKeyGenerator: dumpedObjectStore.keyGenerator,
          committedIndexes: {},
          modifiedIndexes: {},
        };
        objectStores[objectStoreName] = objectStore;

        for (const indexName in storeSchema.indexes) {
          const indexSchema = storeSchema.indexes[indexName];
          const newIndex: Index = {
            deleted: false,
            modifiedData: undefined,
            modifiedName: undefined,
            originalData: new BTree([], compareKeys),
            originalName: indexName,
          };
          objectStore.committedIndexes[indexName] = newIndex;
          objectStoreData.forEach((v, k) => {
            try {
              this.insertIntoIndex(newIndex, k, v.value, indexSchema);
            } catch (e) {
              if (e instanceof DataError) {
                // We don't propagate this error here.
                return;
              }
              throw e;
            }
          });
        }
      }
      const db: Database = {
        deleted: false,
        committedObjectStores: objectStores,
        committedSchema: structuredClone(schema),
        connectionCookies: [],
        txLevel: TransactionLevel.None,
        txRestrictObjectStores: undefined,
      };
      this.databases[dbName] = db;
    }
  }

  private makeObjectStoreMap(database: Database): {
    [currentName: string]: ObjectStoreMapEntry;
  } {
    let map: { [currentName: string]: ObjectStoreMapEntry } = {};
    for (let objectStoreName in database.committedObjectStores) {
      const store = database.committedObjectStores[objectStoreName];
      const entry: ObjectStoreMapEntry = {
        store,
        indexMap: Object.assign({}, store.committedIndexes),
      };
      map[objectStoreName] = entry;
    }
    return map;
  }

  /**
   * Export the contents of the database to JSON.
   *
   * Only exports data that has been committed.
   */
  exportDump(): MemoryBackendDump {
    this.enableTracing && console.log("exporting dump");
    const dbDumps: { [name: string]: DatabaseDump } = {};
    for (const dbName of Object.keys(this.databases)) {
      const db = this.databases[dbName];
      const objectStores: { [name: string]: ObjectStoreDump } = {};
      for (const objectStoreName of Object.keys(db.committedObjectStores)) {
        const objectStore = db.committedObjectStores[objectStoreName];
        const objectStoreRecords: ObjectStoreRecord[] = [];
        objectStore.originalData.forEach((v: ObjectStoreRecord) => {
          objectStoreRecords.push(structuredClone(v));
        });
        objectStores[objectStoreName] = {
          name: objectStoreName,
          records: objectStoreRecords,
          keyGenerator: objectStore.originalKeyGenerator,
        };
      }
      const dbDump: DatabaseDump = {
        objectStores,
        schema: structuredClone(this.databases[dbName].committedSchema),
      };
      dbDumps[dbName] = dbDump;
    }
    return structuredEncapsulate({ databases: dbDumps });
  }

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

  async deleteDatabase(name: string): Promise<void> {
    if (this.enableTracing) {
      console.log(`TRACING: deleteDatabase(${name})`);
    }
    const myDb = this.databases[name];
    if (!myDb) {
      throw Error("db not found");
    }
    if (myDb.committedSchema.databaseName !== name) {
      throw Error("name does not match");
    }

    while (myDb.txLevel !== TransactionLevel.None) {
      await this.transactionDoneCond.wait();
    }

    myDb.deleted = true;
    delete this.databases[name];
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
        databaseVersion: 0,
        objectStores: {},
      };
      database = {
        committedSchema: schema,
        deleted: false,
        committedObjectStores: {},
        txLevel: TransactionLevel.None,
        connectionCookies: [],
        txRestrictObjectStores: undefined,
      };
      this.databases[name] = database;
    }

    if (database.connectionCookies.includes(connectionCookie)) {
      throw Error("already connected");
    }

    database.connectionCookies.push(connectionCookie);

    const myConn: Connection = {
      dbName: name,
      objectStoreMap: this.makeObjectStoreMap(database),
      modifiedSchema: structuredClone(database.committedSchema),
    };

    this.connections[connectionCookie] = myConn;

    return { connectionCookie };
  }

  async beginTransaction(
    conn: DatabaseConnection,
    objectStores: string[],
    mode: IDBTransactionMode,
  ): Promise<DatabaseTransaction> {
    const transactionCookie = `tx-${this.transactionIdCounter++}`;
    if (this.enableTracing) {
      console.log(`TRACING: beginTransaction ${transactionCookie}`);
    }
    const myConn = this.connections[conn.connectionCookie];
    if (!myConn) {
      throw Error("connection not found");
    }
    const myDb = this.databases[myConn.dbName];
    if (!myDb) {
      throw Error("db not found");
    }

    while (myDb.txLevel !== TransactionLevel.None) {
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

    if (this.trackStats) {
      if (mode === "readonly") {
        this.accessStats.readTransactions++;
      } else if (mode === "readwrite") {
        this.accessStats.writeTransactions++;
      }
    }

    myDb.txRestrictObjectStores = [...objectStores];

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

    while (myDb.txLevel !== TransactionLevel.None) {
      await this.transactionDoneCond.wait();
    }

    myDb.txLevel = TransactionLevel.VersionChange;
    myDb.txOwnerConnectionCookie = conn.connectionCookie;
    myDb.txOwnerTransactionCookie = transactionCookie;
    myDb.txRestrictObjectStores = undefined;

    this.connectionsByTransaction[transactionCookie] = myConn;

    myConn.modifiedSchema.databaseVersion = newVersion;

    return { transactionCookie };
  }

  async close(conn: DatabaseConnection): Promise<void> {
    if (this.enableTracing) {
      console.log(`TRACING: close (${conn.connectionCookie})`);
    }
    const myConn = this.connections[conn.connectionCookie];
    if (!myConn) {
      throw Error("connection not found - already closed?");
    }
    const myDb = this.databases[myConn.dbName];
    if (myDb) {
      // FIXME: what if we're still in a transaction?
      myDb.connectionCookies = myDb.connectionCookies.filter(
        (x) => x != conn.connectionCookie,
      );
    }
    delete this.connections[conn.connectionCookie];
    this.disconnectCond.trigger();
  }

  private requireConnection(dbConn: DatabaseConnection): Connection {
    const myConn = this.connections[dbConn.connectionCookie];
    if (!myConn) {
      throw Error(`unknown connection (${dbConn.connectionCookie})`);
    }
    return myConn;
  }

  private requireConnectionFromTransaction(
    btx: DatabaseTransaction,
  ): Connection {
    const myConn = this.connectionsByTransaction[btx.transactionCookie];
    if (!myConn) {
      throw Error(`unknown transaction (${btx.transactionCookie})`);
    }
    return myConn;
  }

  getSchema(dbConn: DatabaseConnection): Schema {
    if (this.enableTracing) {
      console.log(`TRACING: getSchema`);
    }
    const myConn = this.requireConnection(dbConn);
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    return db.committedSchema;
  }

  getCurrentTransactionSchema(btx: DatabaseTransaction): Schema {
    const myConn = this.requireConnectionFromTransaction(btx);
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    return myConn.modifiedSchema;
  }

  getInitialTransactionSchema(btx: DatabaseTransaction): Schema {
    const myConn = this.requireConnectionFromTransaction(btx);
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    return db.committedSchema;
  }

  renameIndex(
    btx: DatabaseTransaction,
    objectStoreName: string,
    oldName: string,
    newName: string,
  ): void {
    if (this.enableTracing) {
      console.log(`TRACING: renameIndex(?, ${oldName}, ${newName})`);
    }
    const myConn = this.requireConnectionFromTransaction(btx);
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
    const indexesSchema = schema.objectStores[objectStoreName].indexes;
    if (indexesSchema[newName]) {
      throw new Error("new index name already used");
    }
    if (!indexesSchema) {
      throw new Error("new index name already used");
    }
    const index: Index =
      myConn.objectStoreMap[objectStoreName].indexMap[oldName];
    if (!index) {
      throw Error("old index missing in connection's index map");
    }
    indexesSchema[newName] = indexesSchema[newName];
    delete indexesSchema[oldName];
    myConn.objectStoreMap[objectStoreName].indexMap[newName] = index;
    delete myConn.objectStoreMap[objectStoreName].indexMap[oldName];
    index.modifiedName = newName;
  }

  deleteIndex(
    btx: DatabaseTransaction,
    objectStoreName: string,
    indexName: string,
  ): void {
    if (this.enableTracing) {
      console.log(`TRACING: deleteIndex(${indexName})`);
    }
    const myConn = this.requireConnectionFromTransaction(btx);
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
    if (!schema.objectStores[objectStoreName].indexes[indexName]) {
      throw new Error("index does not exist");
    }
    const index: Index =
      myConn.objectStoreMap[objectStoreName].indexMap[indexName];
    if (!index) {
      throw Error("old index missing in connection's index map");
    }
    index.deleted = true;
    delete schema.objectStores[objectStoreName].indexes[indexName];
    delete myConn.objectStoreMap[objectStoreName].indexMap[indexName];
  }

  deleteObjectStore(btx: DatabaseTransaction, name: string): void {
    if (this.enableTracing) {
      console.log(
        `TRACING: deleteObjectStore(${name}) in ${btx.transactionCookie}`,
      );
    }
    const myConn = this.requireConnectionFromTransaction(btx);
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
    const objectStoreMapEntry = myConn.objectStoreMap[name];
    if (!objectStoreMapEntry) {
      throw Error("object store not found in map");
    }
    const indexNames = Object.keys(objectStoreProperties.indexes);
    for (const indexName of indexNames) {
      this.deleteIndex(btx, name, indexName);
    }

    objectStoreMapEntry.store.deleted = true;
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

    const myConn = this.requireConnectionFromTransaction(btx);
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
    const objectStoreMapEntry = myConn.objectStoreMap[oldName];
    if (!objectStoreMapEntry) {
      throw Error("object store not found in map");
    }
    objectStoreMapEntry.store.modifiedName = newName;
    schema.objectStores[newName] = schema.objectStores[oldName];
    delete schema.objectStores[oldName];
    delete myConn.objectStoreMap[oldName];
    myConn.objectStoreMap[newName] = objectStoreMapEntry;
  }

  createObjectStore(
    btx: DatabaseTransaction,
    name: string,
    keyPath: string[] | null,
    autoIncrement: boolean,
  ): void {
    if (this.enableTracing) {
      console.log(
        `TRACING: createObjectStore(${btx.transactionCookie}, ${name})`,
      );
    }
    const myConn = this.requireConnectionFromTransaction(btx);
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
      committedIndexes: {},
      modifiedIndexes: {},
    };
    const schema = myConn.modifiedSchema;
    if (!schema) {
      throw Error("no schema for versionchange tx");
    }
    schema.objectStores[name] = {
      autoIncrement,
      keyPath,
      indexes: {},
    };
    myConn.objectStoreMap[name] = { store: newObjectStore, indexMap: {} };
  }

  createIndex(
    btx: DatabaseTransaction,
    indexName: string,
    objectStoreName: string,
    keyPath: string[],
    multiEntry: boolean,
    unique: boolean,
  ): void {
    if (this.enableTracing) {
      console.log(`TRACING: createIndex(${indexName})`);
    }
    const myConn = this.requireConnectionFromTransaction(btx);
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
    myConn.objectStoreMap[objectStoreName].indexMap[indexName] = newIndex;
    const schema = myConn.modifiedSchema;
    if (!schema) {
      throw Error("no schema in versionchange tx");
    }
    const objectStoreProperties = schema.objectStores[objectStoreName];
    if (!objectStoreProperties) {
      throw Error("object store not found");
    }
    objectStoreProperties.indexes[indexName] = indexProperties;

    const objectStoreMapEntry = myConn.objectStoreMap[objectStoreName];
    if (!objectStoreMapEntry) {
      throw Error("object store does not exist");
    }

    const storeData =
      objectStoreMapEntry.store.modifiedData ||
      objectStoreMapEntry.store.originalData;

    storeData.forEach((v, k) => {
      try {
        this.insertIntoIndex(newIndex, k, v.value, indexProperties);
      } catch (e) {
        if (e instanceof DataError) {
          // We don't propagate this error here.
          return;
        }
        throw e;
      }
    });
  }

  async clearObjectStore(
    btx: DatabaseTransaction,
    objectStoreName: string,
  ): Promise<void> {
    const myConn = this.requireConnectionFromTransaction(btx);
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.Write) {
      throw Error("only allowed in write transaction");
    }
    if (
      db.txRestrictObjectStores &&
      !db.txRestrictObjectStores.includes(objectStoreName)
    ) {
      throw Error(
        `Not allowed to access store '${objectStoreName}', transaction is over ${JSON.stringify(
          db.txRestrictObjectStores,
        )}`,
      );
    }

    const schema = myConn.modifiedSchema;
    const objectStoreMapEntry = myConn.objectStoreMap[objectStoreName];

    objectStoreMapEntry.store.modifiedData = new BTree([], compareKeys);

    for (const indexName of Object.keys(
      schema.objectStores[objectStoreName].indexes,
    )) {
      const index = myConn.objectStoreMap[objectStoreName].indexMap[indexName];
      if (!index) {
        throw Error("index referenced by object store does not exist");
      }
      index.modifiedData = new BTree([], compareKeys);
    }
  }

  async deleteRecord(
    btx: DatabaseTransaction,
    objectStoreName: string,
    range: IDBKeyRange,
  ): Promise<void> {
    if (this.enableTracing) {
      console.log(`TRACING: deleteRecord from store ${objectStoreName}`);
    }
    const myConn = this.requireConnectionFromTransaction(btx);
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.Write) {
      throw Error("only allowed in write transaction");
    }
    if (
      db.txRestrictObjectStores &&
      !db.txRestrictObjectStores.includes(objectStoreName)
    ) {
      throw Error(
        `Not allowed to access store '${objectStoreName}', transaction is over ${JSON.stringify(
          db.txRestrictObjectStores,
        )}`,
      );
    }
    if (typeof range !== "object") {
      throw Error("deleteRecord got invalid range (must be object)");
    }
    if (!("lowerOpen" in range)) {
      throw Error(
        "deleteRecord got invalid range (sanity check failed, 'lowerOpen' missing)",
      );
    }

    const schema = myConn.modifiedSchema;
    const objectStoreMapEntry = myConn.objectStoreMap[objectStoreName];

    if (!objectStoreMapEntry.store.modifiedData) {
      objectStoreMapEntry.store.modifiedData =
        objectStoreMapEntry.store.originalData;
    }

    let modifiedData = objectStoreMapEntry.store.modifiedData;
    let currKey: Key | undefined;

    if (range.lower === undefined || range.lower === null) {
      currKey = modifiedData.minKey();
    } else {
      currKey = range.lower;
      // We have a range with an lowerOpen lower bound, so don't start
      // deleting the lower bound.  Instead start with the next higher key.
      if (range.lowerOpen && currKey !== undefined) {
        currKey = modifiedData.nextHigherKey(currKey);
      }
    }

    if (currKey === undefined) {
      throw Error("invariant violated");
    }

    // make sure that currKey is either undefined or pointing to an
    // existing object.
    let firstValue = modifiedData.get(currKey);
    if (!firstValue) {
      if (currKey !== undefined) {
        currKey = modifiedData.nextHigherKey(currKey);
      }
    }

    // loop invariant: (currKey is undefined) or (currKey is a valid key)
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
        if (!range.upperOpen && compareKeys(currKey, range.upper) > 0) {
          // The upper range is inclusive, only stop if we're after the upper range.
          break;
        }
      }

      const storeEntry = modifiedData.get(currKey);
      if (!storeEntry) {
        throw Error("assertion failed");
      }

      for (const indexName of Object.keys(
        schema.objectStores[objectStoreName].indexes,
      )) {
        const index =
          myConn.objectStoreMap[objectStoreName].indexMap[indexName];
        if (!index) {
          throw Error("index referenced by object store does not exist");
        }
        this.enableTracing &&
          console.log(
            `deleting from index ${indexName} for object store ${objectStoreName}`,
          );
        const indexProperties =
          schema.objectStores[objectStoreName].indexes[indexName];
        this.deleteFromIndex(
          index,
          storeEntry.primaryKey,
          storeEntry.value,
          indexProperties,
        );
      }

      modifiedData = modifiedData.without(currKey);

      currKey = modifiedData.nextHigherKey(currKey);
    }

    objectStoreMapEntry.store.modifiedData = modifiedData;
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
      const existingIndexRecord = indexData.get(indexKey);
      if (!existingIndexRecord) {
        throw Error("db inconsistent: expected index entry missing");
      }
      const newPrimaryKeys =
        existingIndexRecord.primaryKeys.without(primaryKey);
      if (newPrimaryKeys.size === 0) {
        index.modifiedData = indexData.without(indexKey);
      } else {
        const newIndexRecord: IndexRecord = {
          indexKey,
          primaryKeys: newPrimaryKeys,
        };
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
    const myConn = this.requireConnectionFromTransaction(btx);
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.Read) {
      throw Error("only allowed while running a transaction");
    }
    if (
      db.txRestrictObjectStores &&
      !db.txRestrictObjectStores.includes(req.objectStoreName)
    ) {
      throw Error(
        `Not allowed to access store '${
          req.objectStoreName
        }', transaction is over ${JSON.stringify(db.txRestrictObjectStores)}`,
      );
    }
    const objectStoreMapEntry = myConn.objectStoreMap[req.objectStoreName];
    if (!objectStoreMapEntry) {
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

    const forward: boolean =
      req.direction === "next" || req.direction === "nextunique";
    const unique: boolean =
      req.direction === "prevunique" || req.direction === "nextunique";

    const storeData =
      objectStoreMapEntry.store.modifiedData ||
      objectStoreMapEntry.store.originalData;

    const haveIndex = req.indexName !== undefined;

    let resp: RecordGetResponse;

    if (haveIndex) {
      const index =
        myConn.objectStoreMap[req.objectStoreName].indexMap[req.indexName!];
      const indexData = index.modifiedData || index.originalData;
      resp = getIndexRecords({
        forward,
        indexData,
        storeData,
        limit: req.limit,
        unique,
        range,
        resultLevel: req.resultLevel,
        advanceIndexKey: req.advanceIndexKey,
        advancePrimaryKey: req.advancePrimaryKey,
        lastIndexPosition: req.lastIndexPosition,
        lastObjectStorePosition: req.lastObjectStorePosition,
      });
      if (this.trackStats) {
        const k = `${req.objectStoreName}.${req.indexName}`;
        this.accessStats.readsPerIndex[k] =
          (this.accessStats.readsPerIndex[k] ?? 0) + 1;
        this.accessStats.readItemsPerIndex[k] =
          (this.accessStats.readItemsPerIndex[k] ?? 0) + resp.count;
      }
    } else {
      if (req.advanceIndexKey !== undefined) {
        throw Error("unsupported request");
      }
      resp = getObjectStoreRecords({
        forward,
        storeData,
        limit: req.limit,
        range,
        resultLevel: req.resultLevel,
        advancePrimaryKey: req.advancePrimaryKey,
        lastIndexPosition: req.lastIndexPosition,
        lastObjectStorePosition: req.lastObjectStorePosition,
      });
      if (this.trackStats) {
        const k = `${req.objectStoreName}`;
        this.accessStats.readsPerStore[k] =
          (this.accessStats.readsPerStore[k] ?? 0) + 1;
        this.accessStats.readItemsPerStore[k] =
          (this.accessStats.readItemsPerStore[k] ?? 0) + resp.count;
      }
    }
    if (this.enableTracing) {
      console.log(`TRACING: getRecords got ${resp.count} results`);
    }
    return resp;
  }

  async storeRecord(
    btx: DatabaseTransaction,
    storeReq: RecordStoreRequest,
  ): Promise<RecordStoreResponse> {
    if (this.enableTracing) {
      console.log(`TRACING: storeRecord`);
      console.log(
        `key ${storeReq.key}, record ${JSON.stringify(
          structuredEncapsulate(storeReq.value),
        )}`,
      );
    }
    const myConn = this.requireConnectionFromTransaction(btx);
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.Write) {
      throw Error("store operation only allowed while running a transaction");
    }
    if (
      db.txRestrictObjectStores &&
      !db.txRestrictObjectStores.includes(storeReq.objectStoreName)
    ) {
      throw Error(
        `Not allowed to access store '${
          storeReq.objectStoreName
        }', transaction is over ${JSON.stringify(db.txRestrictObjectStores)}`,
      );
    }

    if (this.trackStats) {
      this.accessStats.writesPerStore[storeReq.objectStoreName] =
        (this.accessStats.writesPerStore[storeReq.objectStoreName] ?? 0) + 1;
    }

    const schema = myConn.modifiedSchema;
    const objectStoreMapEntry = myConn.objectStoreMap[storeReq.objectStoreName];

    if (!objectStoreMapEntry.store.modifiedData) {
      objectStoreMapEntry.store.modifiedData =
        objectStoreMapEntry.store.originalData;
    }
    const modifiedData = objectStoreMapEntry.store.modifiedData;

    let key;
    let value;

    if (storeReq.storeLevel === StoreLevel.UpdateExisting) {
      if (storeReq.key === null || storeReq.key === undefined) {
        throw Error("invalid update request (key not given)");
      }

      if (!objectStoreMapEntry.store.modifiedData.has(storeReq.key)) {
        throw Error("invalid update request (record does not exist)");
      }
      key = storeReq.key;
      value = storeReq.value;
    } else {
      const keygen =
        objectStoreMapEntry.store.modifiedKeyGenerator ||
        objectStoreMapEntry.store.originalKeyGenerator;
      const autoIncrement =
        schema.objectStores[storeReq.objectStoreName].autoIncrement;
      const keyPath = schema.objectStores[storeReq.objectStoreName].keyPath;

      if (
        keyPath !== null &&
        keyPath !== undefined &&
        storeReq.key !== undefined
      ) {
        // If in-line keys are used, a key can't be explicitly specified.
        throw new DataError();
      }

      let storeKeyResult: StoreKeyResult;
      try {
        storeKeyResult = makeStoreKeyValue(
          storeReq.value,
          storeReq.key,
          keygen,
          autoIncrement,
          keyPath,
        );
      } catch (e) {
        if (e instanceof DataError) {
          const kp = JSON.stringify(keyPath);
          const n = storeReq.objectStoreName;
          const m = `Could not extract key from value, objectStore=${n}, keyPath=${kp}, value=${JSON.stringify(
            storeReq.value,
          )}`;
          if (this.enableTracing) {
            console.error(e);
            console.error("value was:", storeReq.value);
            console.error("key was:", storeReq.key);
          }
          throw new DataError(m);
        } else {
          throw e;
        }
      }
      key = storeKeyResult.key;
      value = storeKeyResult.value;
      objectStoreMapEntry.store.modifiedKeyGenerator =
        storeKeyResult.updatedKeyGenerator;
      const hasKey = modifiedData.has(key);

      if (hasKey && storeReq.storeLevel !== StoreLevel.AllowOverwrite) {
        throw new ConstraintError("refusing to overwrite");
      }
    }

    const oldStoreRecord = modifiedData.get(key);

    const newObjectStoreRecord: ObjectStoreRecord = {
      // FIXME: We should serialize the key here, not just clone it.
      primaryKey: structuredClone(key),
      value: structuredClone(value),
    };

    objectStoreMapEntry.store.modifiedData = modifiedData.with(
      key,
      newObjectStoreRecord,
      true,
    );

    for (const indexName of Object.keys(
      schema.objectStores[storeReq.objectStoreName].indexes,
    )) {
      const index =
        myConn.objectStoreMap[storeReq.objectStoreName].indexMap[indexName];
      if (!index) {
        throw Error("index referenced by object store does not exist");
      }
      const indexProperties =
        schema.objectStores[storeReq.objectStoreName].indexes[indexName];

      // Remove old index entry first!
      if (oldStoreRecord) {
        try {
          this.deleteFromIndex(
            index,
            key,
            oldStoreRecord.value,
            indexProperties,
          );
        } catch (e) {
          if (e instanceof DataError) {
            // Do nothing
          } else {
            throw e;
          }
        }
      }
      try {
        this.insertIntoIndex(index, key, value, indexProperties);
      } catch (e) {
        if (e instanceof DataError) {
          // https://www.w3.org/TR/IndexedDB-2/#object-store-storage-operation
          // Do nothing
        } else {
          throw e;
        }
      }
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
    let indexKeys;
    try {
      indexKeys = getIndexKeys(
        value,
        indexProperties.keyPath,
        indexProperties.multiEntry,
      );
    } catch (e) {
      if (e instanceof DataError) {
        const n = index.modifiedName || index.originalName;
        const p = JSON.stringify(indexProperties.keyPath);
        const m = `Failed to extract index keys from index ${n} for keyPath ${p}.`;
        if (this.enableTracing) {
          console.error(m);
          console.error("value was", value);
        }
        throw new DataError(m);
      } else {
        throw e;
      }
    }
    for (const indexKey of indexKeys) {
      const existingRecord = indexData.get(indexKey);
      if (existingRecord) {
        if (indexProperties.unique) {
          throw new ConstraintError();
        } else {
          const newIndexRecord: IndexRecord = {
            indexKey: indexKey,
            primaryKeys: existingRecord.primaryKeys.with(primaryKey),
          };
          index.modifiedData = indexData.with(indexKey, newIndexRecord, true);
        }
      } else {
        const primaryKeys: ISortedSetF<IDBValidKey> = new BTree(
          [[primaryKey, undefined]],
          compareKeys,
        );
        const newIndexRecord: IndexRecord = {
          indexKey: indexKey,
          primaryKeys,
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
      throw Error("unknown transaction");
    }
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    if (db.txLevel < TransactionLevel.Read) {
      throw Error("rollback is only allowed while running a transaction");
    }
    db.txLevel = TransactionLevel.None;
    db.txRestrictObjectStores = undefined;
    myConn.modifiedSchema = structuredClone(db.committedSchema);
    myConn.objectStoreMap = this.makeObjectStoreMap(db);
    for (const objectStoreName in db.committedObjectStores) {
      const objectStore = db.committedObjectStores[objectStoreName];
      objectStore.deleted = false;
      objectStore.modifiedData = undefined;
      objectStore.modifiedName = undefined;
      objectStore.modifiedKeyGenerator = undefined;
      objectStore.modifiedIndexes = {};

      for (const indexName of Object.keys(
        db.committedSchema.objectStores[objectStoreName].indexes,
      )) {
        const index = objectStore.committedIndexes[indexName];
        index.deleted = false;
        index.modifiedData = undefined;
        index.modifiedName = undefined;
      }
    }
    delete this.connectionsByTransaction[btx.transactionCookie];
    this.transactionDoneCond.trigger();
  }

  async commit(btx: DatabaseTransaction): Promise<void> {
    if (this.enableTracing) {
      console.log(`TRACING: commit`);
    }
    const myConn = this.requireConnectionFromTransaction(btx);
    const db = this.databases[myConn.dbName];
    if (!db) {
      throw Error("db not found");
    }
    const txLevel = db.txLevel;
    if (txLevel < TransactionLevel.Read) {
      throw Error("only allowed while running a transaction");
    }

    db.committedSchema = structuredClone(myConn.modifiedSchema);
    db.txLevel = TransactionLevel.None;
    db.txRestrictObjectStores = undefined;

    db.committedObjectStores = {};
    db.committedObjectStores = {};

    for (const objectStoreName in myConn.objectStoreMap) {
      const objectStoreMapEntry = myConn.objectStoreMap[objectStoreName];
      const store = objectStoreMapEntry.store;
      store.deleted = false;
      store.originalData = store.modifiedData || store.originalData;
      store.originalName = store.modifiedName || store.originalName;
      store.modifiedIndexes = {};
      if (store.modifiedKeyGenerator !== undefined) {
        store.originalKeyGenerator = store.modifiedKeyGenerator;
      }
      db.committedObjectStores[objectStoreName] = store;

      for (const indexName in objectStoreMapEntry.indexMap) {
        const index = objectStoreMapEntry.indexMap[indexName];
        index.deleted = false;
        index.originalData = index.modifiedData || index.originalData;
        index.originalName = index.modifiedName || index.originalName;
        store.committedIndexes[indexName] = index;
      }
    }

    myConn.objectStoreMap = this.makeObjectStoreMap(db);

    delete this.connectionsByTransaction[btx.transactionCookie];
    this.transactionDoneCond.trigger();

    if (this.afterCommitCallback && txLevel >= TransactionLevel.Write) {
      await this.afterCommitCallback();
    }
  }
}

function getIndexRecords(req: {
  indexData: ISortedMapF<IDBValidKey, IndexRecord>;
  storeData: ISortedMapF<IDBValidKey, ObjectStoreRecord>;
  lastIndexPosition?: IDBValidKey;
  forward: boolean;
  unique: boolean;
  range: IDBKeyRange;
  lastObjectStorePosition?: IDBValidKey;
  advancePrimaryKey?: IDBValidKey;
  advanceIndexKey?: IDBValidKey;
  limit: number;
  resultLevel: ResultLevel;
}): RecordGetResponse {
  let numResults = 0;
  const indexKeys: Key[] = [];
  const primaryKeys: Key[] = [];
  const values: Value[] = [];
  const { unique, range, forward, indexData } = req;

  function nextIndexEntry(prevPos: IDBValidKey): IndexRecord | undefined {
    const res: [IDBValidKey, IndexRecord] | undefined = forward
      ? indexData.nextHigherPair(prevPos)
      : indexData.nextLowerPair(prevPos);
    return res ? res[1] : undefined;
  }

  function packResult(): RecordGetResponse {
    // Collect the values based on the primary keys,
    // if requested.
    if (req.resultLevel === ResultLevel.Full) {
      for (let i = 0; i < numResults; i++) {
        const result = req.storeData.get(primaryKeys[i]);
        if (!result) {
          console.error("invariant violated during read");
          console.error("request was", req);
          throw Error("invariant violated during read");
        }
        values.push(structuredClone(result.value));
      }
    }
    return {
      count: numResults,
      indexKeys:
        req.resultLevel >= ResultLevel.OnlyKeys ? indexKeys : undefined,
      primaryKeys:
        req.resultLevel >= ResultLevel.OnlyKeys ? primaryKeys : undefined,
      values: req.resultLevel >= ResultLevel.Full ? values : undefined,
    };
  }

  let firstIndexPos = req.lastIndexPosition;
  {
    const rangeStart = forward ? range.lower : range.upper;
    const dataStart = forward ? indexData.minKey() : indexData.maxKey();
    firstIndexPos = furthestKey(forward, firstIndexPos, rangeStart);
    firstIndexPos = furthestKey(forward, firstIndexPos, dataStart);
  }

  if (firstIndexPos == null) {
    return packResult();
  }

  let objectStorePos: IDBValidKey | undefined = undefined;
  let indexEntry: IndexRecord | undefined = undefined;

  // Now we align at indexPos and after objectStorePos

  indexEntry = indexData.get(firstIndexPos);
  if (!indexEntry) {
    // We're not aligned to an index key, go to next index entry
    indexEntry = nextIndexEntry(firstIndexPos);
    if (!indexEntry) {
      return packResult();
    }
    objectStorePos = nextKey(true, indexEntry.primaryKeys, undefined);
  } else if (
    req.lastIndexPosition != null &&
    compareKeys(req.lastIndexPosition, indexEntry.indexKey) !== 0
  ) {
    // We're already past the desired lastIndexPosition, don't use
    // lastObjectStorePosition.
    objectStorePos = nextKey(true, indexEntry.primaryKeys, undefined);
  } else {
    objectStorePos = nextKey(
      true,
      indexEntry.primaryKeys,
      req.lastObjectStorePosition,
    );
  }

  // Now skip lower/upper bound of open ranges

  if (
    forward &&
    range.lowerOpen &&
    range.lower != null &&
    compareKeys(range.lower, indexEntry.indexKey) === 0
  ) {
    indexEntry = nextIndexEntry(indexEntry.indexKey);
    if (!indexEntry) {
      return packResult();
    }
    objectStorePos = indexEntry.primaryKeys.minKey();
  }

  if (
    !forward &&
    range.upperOpen &&
    range.upper != null &&
    compareKeys(range.upper, indexEntry.indexKey) === 0
  ) {
    indexEntry = nextIndexEntry(indexEntry.indexKey);
    if (!indexEntry) {
      return packResult();
    }
    objectStorePos = indexEntry.primaryKeys.minKey();
  }

  // If requested, return only unique results

  if (
    unique &&
    req.lastIndexPosition != null &&
    compareKeys(indexEntry.indexKey, req.lastIndexPosition) === 0
  ) {
    indexEntry = nextIndexEntry(indexEntry.indexKey);
    if (!indexEntry) {
      return packResult();
    }
    objectStorePos = indexEntry.primaryKeys.minKey();
  }

  if (req.advanceIndexKey != null) {
    const ik = furthestKey(forward, indexEntry.indexKey, req.advanceIndexKey)!;
    indexEntry = indexData.get(ik);
    if (!indexEntry) {
      indexEntry = nextIndexEntry(ik);
    }
    if (!indexEntry) {
      return packResult();
    }
  }

  // Use advancePrimaryKey if necessary
  if (
    req.advanceIndexKey != null &&
    req.advancePrimaryKey &&
    compareKeys(indexEntry.indexKey, req.advanceIndexKey) == 0
  ) {
    if (
      objectStorePos == null ||
      compareKeys(req.advancePrimaryKey, objectStorePos) > 0
    ) {
      objectStorePos = nextKey(
        true,
        indexEntry.primaryKeys,
        req.advancePrimaryKey,
      );
    }
  }

  while (1) {
    if (req.limit != 0 && numResults == req.limit) {
      break;
    }
    if (!range.includes(indexEntry.indexKey)) {
      break;
    }
    if (indexEntry === undefined) {
      break;
    }
    if (objectStorePos == null) {
      // We don't have any more records with the current index key.
      indexEntry = nextIndexEntry(indexEntry.indexKey);
      if (!indexEntry) {
        return packResult();
      }
      objectStorePos = indexEntry.primaryKeys.minKey();
      continue;
    }

    indexKeys.push(structuredClone(indexEntry.indexKey));
    primaryKeys.push(structuredClone(objectStorePos));
    numResults++;
    if (unique) {
      objectStorePos = undefined;
    } else {
      objectStorePos = indexEntry.primaryKeys.nextHigherKey(objectStorePos);
    }
  }

  return packResult();
}

function getObjectStoreRecords(req: {
  storeData: ISortedMapF<IDBValidKey, ObjectStoreRecord>;
  lastIndexPosition?: IDBValidKey;
  forward: boolean;
  range: IDBKeyRange;
  lastObjectStorePosition?: IDBValidKey;
  advancePrimaryKey?: IDBValidKey;
  limit: number;
  resultLevel: ResultLevel;
}): RecordGetResponse {
  let numResults = 0;
  const indexKeys: Key[] = [];
  const primaryKeys: Key[] = [];
  const values: Value[] = [];
  const { storeData, range, forward } = req;

  function packResult(): RecordGetResponse {
    return {
      count: numResults,
      indexKeys:
        req.resultLevel >= ResultLevel.OnlyKeys ? indexKeys : undefined,
      primaryKeys:
        req.resultLevel >= ResultLevel.OnlyKeys ? primaryKeys : undefined,
      values: req.resultLevel >= ResultLevel.Full ? values : undefined,
    };
  }

  const rangeStart = forward ? range.lower : range.upper;
  const dataStart = forward ? storeData.minKey() : storeData.maxKey();
  let storePos = req.lastObjectStorePosition;
  storePos = furthestKey(forward, storePos, rangeStart);
  storePos = furthestKey(forward, storePos, dataStart);
  storePos = furthestKey(forward, storePos, req.advancePrimaryKey);

  if (storePos != null) {
    // Advance store position if we are either still at the last returned
    // store key, or if we are currently not on a key.
    const storeEntry = storeData.get(storePos);
    if (
      !storeEntry ||
      (req.lastObjectStorePosition != null &&
        compareKeys(req.lastObjectStorePosition, storePos) === 0)
    ) {
      storePos = forward
        ? storeData.nextHigherKey(storePos)
        : storeData.nextLowerKey(storePos);
    }
  } else {
    storePos = forward ? storeData.minKey() : storeData.maxKey();
  }

  if (
    storePos != null &&
    forward &&
    range.lowerOpen &&
    range.lower != null &&
    compareKeys(range.lower, storePos) === 0
  ) {
    storePos = storeData.nextHigherKey(storePos);
  }

  if (
    storePos != null &&
    !forward &&
    range.upperOpen &&
    range.upper != null &&
    compareKeys(range.upper, storePos) === 0
  ) {
    storePos = storeData.nextLowerKey(storePos);
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
      values.push(structuredClone(res.value));
    }

    numResults++;
    storePos = nextStoreKey(forward, storeData, storePos);
  }

  return packResult();
}
