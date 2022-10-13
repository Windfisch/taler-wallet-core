import {
  Backend,
  DatabaseConnection,
  DatabaseTransaction,
  IndexProperties,
  ObjectStoreProperties,
  RecordGetRequest,
  RecordGetResponse,
  RecordStoreRequest,
  RecordStoreResponse,
  ResultLevel,
  Schema,
  StoreLevel,
} from "./backend-interface.js";
import {
  BridgeIDBCursor,
  BridgeIDBDatabase,
  BridgeIDBFactory,
  BridgeIDBIndex,
  BridgeIDBKeyRange,
  BridgeIDBObjectStore,
  BridgeIDBOpenDBRequest,
  BridgeIDBRequest,
  BridgeIDBTransaction,
  BridgeIDBVersionChangeEvent,
  DatabaseList,
  RequestObj,
} from "./bridge-idb.js";
import { Event } from "./idbtypes.js";
import {
  DatabaseDump,
  IndexRecord,
  MemoryBackendDump,
  ObjectStoreDump,
  ObjectStoreRecord,
} from "./MemoryBackend.js";
import { Listener } from "./util/FakeEventTarget.js";

export * from "./idbtypes.js";
export { MemoryBackend } from "./MemoryBackend.js";
export type { AccessStats } from "./MemoryBackend.js";
export * from "./util/structuredClone.js";
export {
  BridgeIDBCursor,
  BridgeIDBDatabase,
  BridgeIDBFactory,
  BridgeIDBIndex,
  BridgeIDBKeyRange,
  BridgeIDBObjectStore,
  BridgeIDBOpenDBRequest,
  BridgeIDBRequest,
  BridgeIDBTransaction,
  StoreLevel,
  ResultLevel,
};
export type {
  DatabaseTransaction,
  RecordGetRequest,
  RecordGetResponse,
  Schema,
  Backend,
  DatabaseList,
  RecordStoreRequest,
  RecordStoreResponse,
  DatabaseConnection,
  ObjectStoreProperties,
  RequestObj,
  DatabaseDump,
  ObjectStoreDump,
  IndexRecord,
  ObjectStoreRecord,
  IndexProperties,
  MemoryBackendDump,
  Event,
  Listener,
};

// globalThis polyfill, see https://mathiasbynens.be/notes/globalthis
(function () {
  if (typeof globalThis === "object") return;
  Object.defineProperty(Object.prototype, "__magic__", {
    get: function () {
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
 * Global indexeddb objects, either from the native or bridge-idb
 * implementation, depending on what is available in
 * the global environment.
 */
export const GlobalIDB: {
  KeyRange: typeof BridgeIDBKeyRange;
} = {
  KeyRange: (globalThis as any).IDBKeyRange ?? BridgeIDBKeyRange,
};

/**
 * Populate the global name space such that the given IndexedDB factory is made
 * available globally.
 *
 * @public
 */
export function shimIndexedDB(factory: BridgeIDBFactory): void {
  // @ts-ignore: shimming
  const g = globalThis as any;

  g.indexedDB = factory;
  g.IDBCursor = BridgeIDBCursor;
  g.IDBKeyRange = BridgeIDBKeyRange;
  g.IDBDatabase = BridgeIDBDatabase;
  g.IDBFactory = BridgeIDBFactory;
  g.IDBIndex = BridgeIDBIndex;
  g.IDBKeyRange = BridgeIDBKeyRange;
  g.IDBObjectStore = BridgeIDBObjectStore;
  g.IDBOpenDBRequest = BridgeIDBOpenDBRequest;
  g.IDBRequest = BridgeIDBRequest;
  g.IDBTransaction = BridgeIDBTransaction;
  g.IDBVersionChangeEvent = BridgeIDBVersionChangeEvent;
}
