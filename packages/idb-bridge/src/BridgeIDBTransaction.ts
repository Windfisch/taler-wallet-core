import { BridgeIDBDatabase } from "./BridgeIDBDatabase";
import { BridgeIDBObjectStore } from "./BridgeIDBObjectStore";
import { BridgeIDBRequest } from "./BridgeIDBRequest";
import {
  AbortError,
  InvalidStateError,
  NotFoundError,
  TransactionInactiveError,
} from "./util/errors";
import fakeDOMStringList from "./util/fakeDOMStringList";
import FakeEvent from "./util/FakeEvent";
import FakeEventTarget from "./util/FakeEventTarget";
import {
  EventCallback,
  FakeDOMStringList,
  RequestObj,
  TransactionMode,
} from "./util/types";
import queueTask from "./util/queueTask";
import openPromise from "./util/openPromise";
import { DatabaseTransaction, Backend } from "./backend-interface";
import { BridgeIDBFactory } from "./BridgeIDBFactory";

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#transaction
export class BridgeIDBTransaction extends FakeEventTarget {
  public _state: "active" | "inactive" | "committing" | "finished" = "active";
  public _started = false;
  public _objectStoresCache: Map<string, BridgeIDBObjectStore> = new Map();

  public _backendTransaction?: DatabaseTransaction;

  public objectStoreNames: FakeDOMStringList;
  public mode: TransactionMode;
  public db: BridgeIDBDatabase;
  public error: Error | null = null;
  public onabort: EventCallback | null = null;
  public oncomplete: EventCallback | null = null;
  public onerror: EventCallback | null = null;

  private _waitPromise: Promise<void>;
  private _resolveWait: () => void;

  public _scope: Set<string>;
  private _requests: Array<{
    operation: () => void;
    request: BridgeIDBRequest;
  }> = [];

  get _backend(): Backend {
    return this.db._backend;
  }

  constructor(
    storeNames: string[],
    mode: TransactionMode,
    db: BridgeIDBDatabase,
    backendTransaction?: DatabaseTransaction,
  ) {
    super();

    const myOpenPromise = openPromise<void>();
    this._waitPromise = myOpenPromise.promise;
    this._resolveWait = myOpenPromise.resolve;

    this._scope = new Set(storeNames);
    this._backendTransaction = backendTransaction;
    this.mode = mode;
    this.db = db;
    this.objectStoreNames = fakeDOMStringList(Array.from(this._scope).sort());

    this.db._transactions.push(this);
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-aborting-a-transaction
  async _abort(errName: string | null) {
    this._state = "finished";

    if (errName !== null) {
      const e = new Error();
      e.name = errName;
      this.error = e;
    }

    // Should this directly remove from _requests?
    for (const { request } of this._requests) {
      if (request.readyState !== "done") {
        request.readyState = "done"; // This will cancel execution of this request's operation
        if (request.source) {
          request.result = undefined;
          request.error = new AbortError();

          const event = new FakeEvent("error", {
            bubbles: true,
            cancelable: true,
          });
          event.eventPath = [this.db, this];
          request.dispatchEvent(event);
        }
      }
    }

    // Only roll back if we actually executed the scheduled operations.
    const maybeBtx = this._backendTransaction;
    if (maybeBtx) {
      await this._backend.rollback(maybeBtx);
    }

    queueTask(() => {
      const event = new FakeEvent("abort", {
        bubbles: true,
        cancelable: false,
      });
      event.eventPath = [this.db];
      this.dispatchEvent(event);
    });
  }

  public abort() {
    if (this._state === "committing" || this._state === "finished") {
      throw new InvalidStateError();
    }
    this._state = "active";

    this._abort(null);
  }

  // http://w3c.github.io/IndexedDB/#dom-idbtransaction-objectstore
  public objectStore(name: string) {
    if (this._state !== "active") {
      throw new InvalidStateError();
    }

    const objectStore = this._objectStoresCache.get(name);
    if (objectStore !== undefined) {
      return objectStore;
    }

    return new BridgeIDBObjectStore(this, name);
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-asynchronously-executing-a-request
  public _execRequestAsync(obj: RequestObj) {
    const source = obj.source;
    const operation = obj.operation;
    let request = obj.hasOwnProperty("request") ? obj.request : null;

    if (this._state !== "active") {
      throw new TransactionInactiveError();
    }

    // Request should only be passed for cursors
    if (!request) {
      if (!source) {
        // Special requests like indexes that just need to run some code
        request = new BridgeIDBRequest();
      } else {
        request = new BridgeIDBRequest();
        request.source = source;
        request.transaction = (source as any).transaction;
      }
    }

    this._requests.push({
      operation,
      request,
    });

    return request;
  }

  /**
   * Actually execute the scheduled work for this transaction.
   */
  public async _start() {
    if (BridgeIDBFactory.enableTracing) {
      console.log(
        `TRACE: IDBTransaction._start, ${this._requests.length} queued`,
      );
    }
    this._started = true;

    if (!this._backendTransaction) {
      this._backendTransaction = await this._backend.beginTransaction(
        this.db._backendConnection,
        Array.from(this._scope),
        this.mode,
      );
    }

    // Remove from request queue - cursor ones will be added back if necessary by cursor.continue and such
    let operation;
    let request;
    while (this._requests.length > 0) {
      const r = this._requests.shift();

      // This should only be false if transaction was aborted
      if (r && r.request.readyState !== "done") {
        request = r.request;
        operation = r.operation;
        break;
      }
    }

    if (request && operation) {
      if (!request.source) {
        // Special requests like indexes that just need to run some code, with error handling already built into
        // operation
        await operation();
      } else {
        let event;
        try {
          BridgeIDBFactory.enableTracing &&
            console.log("TRACE: running operation in transaction");
          const result = await operation();
          BridgeIDBFactory.enableTracing &&
            console.log(
              "TRACE: operation in transaction finished with success",
            );
          request.readyState = "done";
          request.result = result;
          request.error = undefined;

          // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-fire-a-success-event
          if (this._state === "inactive") {
            this._state = "active";
          }
          event = new FakeEvent("success", {
            bubbles: false,
            cancelable: false,
          });

          try {
            event.eventPath = [request, this, this.db];
            request.dispatchEvent(event);
          } catch (err) {
            if (this._state !== "committing") {
              this._abort("AbortError");
            }
            throw err;
          }
        } catch (err) {
          if (BridgeIDBFactory.enableTracing) {
            console.log("TRACING: error during operation: ", err);
          }
          request.readyState = "done";
          request.result = undefined;
          request.error = err;

          // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-fire-an-error-event
          if (this._state === "inactive") {
            this._state = "active";
          }
          event = new FakeEvent("error", {
            bubbles: true,
            cancelable: true,
          });

          try {
            event.eventPath = [this.db, this];
            request.dispatchEvent(event);
          } catch (err) {
            if (this._state !== "committing") {
              this._abort("AbortError");
            }
            throw err;
          }
          if (!event.canceled) {
            this._abort(err.name);
          }
        }
      }

      // On to the next one
      if (this._requests.length > 0) {
        this._start();
      } else {
        // Give it another chance for new handlers to be set before finishing
        queueTask(() => this._start());
      }
      return;
    }

    if (this._state !== "finished" && this._state !== "committing") {
      if (BridgeIDBFactory.enableTracing) {
        console.log("finishing transaction");
      }

      this._state = "committing";

      await this._backend.commit(this._backendTransaction);

      this._state = "finished";

      if (!this.error) {
        if (BridgeIDBFactory.enableTracing) {
          console.log("dispatching 'complete' event on transaction");
        }
        const event = new FakeEvent("complete");
        event.eventPath = [this, this.db];
        this.dispatchEvent(event);
      }

      const idx = this.db._transactions.indexOf(this);
      if (idx < 0) {
        throw Error("invariant failed");
      }
      this.db._transactions.splice(idx, 1);

      this._resolveWait();
    }
  }

  public commit() {
    if (this._state !== "active") {
      throw new InvalidStateError();
    }

    this._state = "committing";
    // We now just wait for auto-commit ...
  }

  public toString() {
    return "[object IDBRequest]";
  }

  _waitDone(): Promise<void> {
    return this._waitPromise;
  }
}
