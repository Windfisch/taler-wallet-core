import {
  Backend,
  DatabaseConnection,
  DatabaseTransaction,
  Schema,
  RecordStoreRequest,
  IndexProperties,
} from "./backend-interface";
import structuredClone from "./util/structuredClone";
import { InvalidStateError, InvalidAccessError } from "./util/errors";
import BTree, { ISortedMap, ISortedMapF } from "./tree/b+tree";
import BridgeIDBFactory from "./BridgeIDBFactory";
import compareKeys from "./util/cmp";
import extractKey from "./util/extractKey";
import { Key, Value, KeyPath } from "./util/types";

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
  originalData: ISortedMapF;
  modifiedData: ISortedMapF | undefined;
  deleted: boolean;
  originalKeyGenerator: number;
  modifiedKeyGenerator: number | undefined;
}

interface Index {
  originalName: string;
  modifiedName: string | undefined;
  originalData: ISortedMapF;
  modifiedData: ISortedMapF | undefined;
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

class AsyncCondition {
  wait(): Promise<void> {
    throw Error("not implemented");
  }

  trigger(): void {}
}




function insertIntoIndex(
  index: Index,
  value: Value,
  indexProperties: IndexProperties,
) {
  if (indexProperties.multiEntry) {

  } else {
    const key = extractKey(value, indexProperties.keyPath);
  }
  throw Error("not implemented");
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

  async getDatabases(): Promise<{ name: string; version: number }[]> {
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

    return { connectionCookie };
  }

  async beginTransaction(
    conn: DatabaseConnection,
    objectStores: string[],
    mode: import("./util/types").TransactionMode,
  ): Promise<DatabaseTransaction> {
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
  }

  getSchema(dbConn: DatabaseConnection): Schema {
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

    // FIXME: build index from existing object store!
  }

  async deleteRecord(
    btx: DatabaseTransaction,
    objectStoreName: string,
    range: import("./BridgeIDBKeyRange").default,
  ): Promise<void> {
    const myConn = this.connections[btx.transactionCookie];
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
  }

  async getRecords(
    btx: DatabaseTransaction,
    req: import("./backend-interface").RecordGetRequest,
  ): Promise<import("./backend-interface").RecordGetResponse> {
    const myConn = this.connections[btx.transactionCookie];
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
    throw Error("not implemented");
  }

  async storeRecord(
    btx: DatabaseTransaction,
    storeReq: RecordStoreRequest,
  ): Promise<void> {
    const myConn = this.connections[btx.transactionCookie];
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

    const storeKeyResult: StoreKeyResult = getStoreKey(
      storeReq.value,
      storeReq.key,
      objectStore.modifiedKeyGenerator || objectStore.originalKeyGenerator,
      schema.objectStores[storeReq.objectStoreName].autoIncrement,
      schema.objectStores[storeReq.objectStoreName].keyPath,
    );
    let key = storeKeyResult.key;
    let value = storeKeyResult.value;
    objectStore.modifiedKeyGenerator = storeKeyResult.updatedKeyGenerator;

    if (!objectStore.modifiedData) {
      objectStore.modifiedData = objectStore.originalData;
    }
    const modifiedData = objectStore.modifiedData;
    const hasKey = modifiedData.has(key);
    if (hasKey && !storeReq.overwrite) {
      throw Error("refusing to overwrite");
    }

    objectStore.modifiedData = modifiedData.with(key, value, true);

    for (const indexName of schema.objectStores[storeReq.objectStoreName]
      .indexes) {
      const index = myConn.indexMap[indexName];
      if (!index) {
        throw Error("index referenced by object store does not exist");
      }
      const indexProperties = schema.indexes[indexName];
      insertIntoIndex(index, value, indexProperties);
    }
  }

  async rollback(btx: DatabaseTransaction): Promise<void> {
    const myConn = this.connections[btx.transactionCookie];
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
  }

  async commit(btx: DatabaseTransaction): Promise<void> {
    const myConn = this.connections[btx.transactionCookie];
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
  }
}

export default MemoryBackend;
