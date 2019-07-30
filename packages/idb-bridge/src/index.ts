import { BridgeIDBFactory } from "./BridgeIDBFactory";
import { BridgeIDBCursor } from "./BridgeIDBCursor";
import { BridgeIDBIndex } from "./BridgeIDBIndex";
import BridgeIDBDatabase from "./BridgeIDBDatabase";
import BridgeIDBKeyRange from "./BridgeIDBKeyRange";
import BridgeIDBObjectStore from "./BridgeIDBObjectStore";
import BridgeIDBOpenDBRequest from "./BridgeIDBOpenDBRequest";
import BridgeIDBRequest from "./BridgeIDBRequest";
import BridgeIDBTransaction from "./BridgeIDBTransaction";
import BridgeIDBVersionChangeEvent from "./BridgeIDBVersionChangeEvent";

export { BridgeIDBFactory, BridgeIDBCursor };

export { MemoryBackend } from "./MemoryBackend";

// globalThis polyfill, see https://mathiasbynens.be/notes/globalthis
(function() {
  if (typeof globalThis === "object") return;
  Object.defineProperty(Object.prototype, "__magic__", {
    get: function() {
      return this;
    },
    configurable: true, // This makes it possible to `delete` the getter later.
  });
  // @ts-ignore: polyfill magic
  __magic__.globalThis = __magic__; // lolwat
  // @ts-ignore: polyfill magic
  delete Object.prototype.__magic__;
})();

/**
 * Populate the global name space such that the given IndexedDB factory is made
 * available globally.
 */
export function shimIndexedDB(factory: BridgeIDBFactory): void {
  // @ts-ignore: shimming
  globalThis.indexedDB = factory;
  // @ts-ignore: shimming
  globalThis.IDBCursor = BridgeIDBCursor;
  // @ts-ignore: shimming
  globalThis.IDBKeyRange = BridgeIDBKeyRange;
  // @ts-ignore: shimming
  globalThis.IDBDatabase = BridgeIDBDatabase;
  // @ts-ignore: shimming
  globalThis.IDBFactory = BridgeIDBFactory;
  // @ts-ignore: shimming
  globalThis.IDBIndex = BridgeIDBIndex;
  // @ts-ignore: shimming
  globalThis.IDBKeyRange = BridgeIDBKeyRange;
  // @ts-ignore: shimming
  globalThis.IDBObjectStore = BridgeIDBObjectStore;
  // @ts-ignore: shimming
  globalThis.IDBOpenDBRequest = BridgeIDBOpenDBRequest;
  // @ts-ignore: shimming
  globalThis.IDBRequest = BridgeIDBRequest;
  // @ts-ignore: shimming
  globalThis.IDBTransaction = BridgeIDBTransaction;
  // @ts-ignore: shimming
  globalThis.IDBVersionChangeEvent = BridgeIDBVersionChangeEvent;
}
