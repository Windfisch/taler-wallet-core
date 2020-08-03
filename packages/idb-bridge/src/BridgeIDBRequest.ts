/*
 * Copyright 2017 Jeremy Scheff
 * Copyright 2019 Florian Dold
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

import { BridgeIDBCursor as BridgeFIBCursor } from "./BridgeIDBCursor";
import { BridgeIDBIndex } from "./BridgeIDBIndex";
import { BridgeIDBObjectStore } from "./BridgeIDBObjectStore";
import { BridgeIDBTransaction } from "./BridgeIDBTransaction";
import { InvalidStateError } from "./util/errors";
import FakeEventTarget from "./util/FakeEventTarget";
import { EventCallback } from "./util/types";
import FakeEvent from "./util/FakeEvent";

export class BridgeIDBRequest extends FakeEventTarget {
  _result: any = null;
  _error: Error | null | undefined = null;
  source: BridgeFIBCursor | BridgeIDBIndex | BridgeIDBObjectStore | null = null;
  transaction: BridgeIDBTransaction | null = null;
  readyState: "done" | "pending" = "pending";
  onsuccess: EventCallback | null = null;
  onerror: EventCallback | null = null;

  get error() {
    if (this.readyState === "pending") {
      throw new InvalidStateError();
    }
    return this._error;
  }

  set error(value: any) {
    this._error = value;
  }

  get result() {
    if (this.readyState === "pending") {
      throw new InvalidStateError();
    }
    return this._result;
  }

  set result(value: any) {
    this._result = value;
  }

  toString() {
    return "[object IDBRequest]";
  }

  _finishWithError(err: Error) {
    this.result = undefined;
    this.readyState = "done";

    this.error = new Error(err.message);
    this.error.name = err.name;

    const event = new FakeEvent("error", {
      bubbles: true,
      cancelable: true,
    });
    event.eventPath = [];
    this.dispatchEvent(event);
  }

  _finishWithResult(result: any) {
    this.result = result;
    this.readyState = "done";

    const event = new FakeEvent("success");
    event.eventPath = [];
    this.dispatchEvent(event);
  }
}
