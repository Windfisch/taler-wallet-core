import {
  TransactionMode,
  Value,
  BridgeIDBCursorDirection,
  Key,
  KeyPath,
  BridgeIDBDatabaseInfo,
} from "./util/types";
import BridgeIDBKeyRange from "./BridgeIDBKeyRange";

export interface ObjectStoreProperties {
  keyPath: KeyPath | null;
  autoIncrement: boolean;
  indexes: string[];
}

export interface IndexProperties {
  keyPath: KeyPath;
  multiEntry: boolean;
  unique: boolean;
}

export interface Schema {
  databaseName: string;
  databaseVersion: number;
  objectStores: { [name: string]: ObjectStoreProperties };
  indexes: { [name: string]: IndexProperties };
}

export interface DatabaseConnection {
  connectionCookie: string;
}

export interface DatabaseTransaction {
  transactionCookie: string;
}

export enum ResultLevel {
  Full,
  OnlyKeys,
  OnlyCount,
}

export interface RecordGetRequest {
  direction: BridgeIDBCursorDirection;
  objectStoreName: string;
  indexName: string | undefined;
  range: BridgeIDBKeyRange | undefined;
  lastIndexPosition?: Key;
  lastObjectStorePosition?: Key;
  advanceIndexKey?: Key;
  advancePrimaryKey?: Key;
  limit: number;
  resultLevel: ResultLevel;
}

export interface RecordGetResponse {
  values: Value[] | undefined;
  keys: Key[] | undefined;
  primaryKeys: Key[] | undefined;
  count: number;
}

export interface RecordStoreRequest {
  objectStoreName: string;
  value: Value;
  key: Key | undefined;
  overwrite: boolean;
}

export interface Backend {
  getDatabases(): Promise<BridgeIDBDatabaseInfo[]>;

  connectDatabase(name: string): Promise<DatabaseConnection>;

  beginTransaction(
    conn: DatabaseConnection,
    objectStores: string[],
    mode: TransactionMode,
  ): Promise<DatabaseTransaction>;

  enterVersionChange(
    conn: DatabaseConnection,
    newVersion: number,
  ): Promise<DatabaseTransaction>;

  /**
   * Even though the standard interface for indexedDB doesn't require
   * the client to run deleteDatabase in a version transaction, there is
   * implicitly one running. 
   */
  deleteDatabase(btx: DatabaseTransaction, name: string): Promise<void>;

  close(db: DatabaseConnection): Promise<void>;

  getSchema(db: DatabaseConnection): Schema;

  renameIndex(btx: DatabaseTransaction, oldName: string, newName: string): void;

  deleteIndex(btx: DatabaseTransaction, indexName: string): void;

  rollback(btx: DatabaseTransaction): Promise<void>;

  commit(btx: DatabaseTransaction): Promise<void>;

  deleteObjectStore(btx: DatabaseTransaction, name: string): void;

  createObjectStore(
    btx: DatabaseTransaction,
    name: string,
    keyPath: string | string[] | null,
    autoIncrement: boolean,
  ): void;

  renameObjectStore(
    btx: DatabaseTransaction,
    oldName: string,
    newName: string,
  ): void;

  createIndex(
    btx: DatabaseTransaction,
    indexName: string,
    objectStoreName: string,
    keyPath: KeyPath,
    multiEntry: boolean,
    unique: boolean,
  ): void;

  deleteRecord(
    btx: DatabaseTransaction,
    objectStoreName: string,
    range: BridgeIDBKeyRange,
  ): Promise<void>;

  getRecords(
    btx: DatabaseTransaction,
    req: RecordGetRequest,
  ): Promise<RecordGetResponse>;

  storeRecord(
    btx: DatabaseTransaction,
    storeReq: RecordStoreRequest,
  ): Promise<void>;
}
