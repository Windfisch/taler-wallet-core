/*
 * Copyright 2019 Florian Dold
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

import BridgeIDBDatabase from "./BridgeIDBDatabase";
import BridgeIDBOpenDBRequest from "./BridgeIDBOpenDBRequest";
import BridgeIDBVersionChangeEvent from "./BridgeIDBVersionChangeEvent";
import compareKeys from "./util/cmp";
import enforceRange from "./util/enforceRange";
import { AbortError, VersionError } from "./util/errors";
import FakeEvent from "./util/FakeEvent";
import { Backend, DatabaseConnection } from "./backend-interface";
import queueTask from "./util/queueTask";

type DatabaseList = Array<{ name: string; version: number }>;

class BridgeIDBFactory {
  public cmp = compareKeys;
  private backend: Backend;
  private connections: BridgeIDBDatabase[] = [];

  public constructor(backend: Backend) {
    this.backend = backend;
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBFactory-deleteDatabase-IDBOpenDBRequest-DOMString-name
  public deleteDatabase(name: string): BridgeIDBOpenDBRequest {
    const request = new BridgeIDBOpenDBRequest();
    request.source = null;

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
        const backendTransaction = await this.backend.enterVersionChange(dbconn, 0);
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
  public open(name: string, version?: number) {
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

      if (existingVersion > requestedVersion) {
        request._finishWithError(new VersionError());
        return;
      }

      const db = new BridgeIDBDatabase(this.backend, dbconn);

      if (existingVersion < requestedVersion) {
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

        const backendTransaction = await this.backend.enterVersionChange(dbconn, requestedVersion);
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

        await transaction._waitDone();

        db._runningVersionchangeTransaction = false;
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
    return this.connections.some(c => !c._closed && !c._closePending);
  }
}

export default BridgeIDBFactory;
