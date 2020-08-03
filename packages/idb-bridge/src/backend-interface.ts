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
  TransactionMode,
  Value,
  BridgeIDBCursorDirection,
  Key,
  KeyPath,
  BridgeIDBDatabaseInfo,
} from "./util/types";
import { BridgeIDBKeyRange } from "./BridgeIDBKeyRange";

export interface ObjectStoreProperties {
  keyPath: KeyPath | null;
  autoIncrement: boolean;
  indexes: { [nameame: string]: IndexProperties };
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
}

export interface DatabaseConnection {
  connectionCookie: string;
}

export interface DatabaseTransaction {
  transactionCookie: string;
}

export enum ResultLevel {
  OnlyCount,
  OnlyKeys,
  Full,
}

export enum StoreLevel {
  NoOverwrite,
  AllowOverwrite,
  UpdateExisting,
}

export interface RecordGetRequest {
  direction: BridgeIDBCursorDirection;
  objectStoreName: string;
  indexName: string | undefined;
  /**
   * The range of keys to return.
   * If indexName is defined, the range refers to the index keys.
   * Otherwise it refers to the object store keys.
   */
  range: BridgeIDBKeyRange | undefined;
  /**
   * Last cursor position in terms of the index key.
   * Can only be specified if indexName is defined and
   * lastObjectStorePosition is defined.
   *
   * Must either be undefined or within range.
   */
  lastIndexPosition?: Key;
  /**
   * Last position in terms of the object store key.
   */
  lastObjectStorePosition?: Key;
  /**
   * If specified, the index key of the results must be
   * greater or equal to advanceIndexKey.
   *
   * Only applicable if indexName is specified.
   */
  advanceIndexKey?: Key;
  /**
   * If specified, the primary key of the results must be greater
   * or equal to advancePrimaryKey.
   */
  advancePrimaryKey?: Key;
  /**
   * Maximum number of resuts to return.
   * If -1, return all available results
   */
  limit: number;
  resultLevel: ResultLevel;
}

export interface RecordGetResponse {
  values: Value[] | undefined;
  indexKeys: Key[] | undefined;
  primaryKeys: Key[] | undefined;
  count: number;
}

export interface RecordStoreRequest {
  objectStoreName: string;
  value: Value;
  key: Key | undefined;
  storeLevel: StoreLevel;
}

export interface RecordStoreResponse {
  /**
   * Key that the record was stored under in the object store.
   */
  key: Key;
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

  renameIndex(
    btx: DatabaseTransaction,
    objectStoreName: string,
    oldName: string,
    newName: string,
  ): void;

  deleteIndex(
    btx: DatabaseTransaction,
    objectStoreName: string,
    indexName: string,
  ): void;

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
  ): Promise<RecordStoreResponse>;
}
