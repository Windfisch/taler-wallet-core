/*
 * Copyright 2017 Jeremy Scheff
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import BridgeIDBTransaction from "./BridgeIDBTransaction";
import {
  ConstraintError,
  InvalidAccessError,
  InvalidStateError,
  NotFoundError,
  TransactionInactiveError,
} from "./util/errors";
import fakeDOMStringList from "./util/fakeDOMStringList";
import FakeEventTarget from "./util/FakeEventTarget";
import { FakeDOMStringList, KeyPath, TransactionMode } from "./util/types";
import validateKeyPath from "./util/validateKeyPath";
import queueTask from "./util/queueTask";
import {
  Backend,
  DatabaseConnection,
  Schema,
  DatabaseTransaction,
} from "./backend-interface";

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
class BridgeIDBDatabase extends FakeEventTarget {
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
    options: { autoIncrement?: boolean; keyPath?: KeyPath } | null = {},
  ) {
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

    transaction._backend.createObjectStore(backendTx, name, keyPath, autoIncrement);

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
    mode?: TransactionMode,
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
          transaction.db === this
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

    const tx = new BridgeIDBTransaction(storeNames, mode, this, backendTransaction);
    this._transactions.push(tx);
    queueTask(() => tx._start());
    return tx;
  }

  public transaction(
    storeNames: string | string[],
    mode?: TransactionMode,
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

export default BridgeIDBDatabase;
