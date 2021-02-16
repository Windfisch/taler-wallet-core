import test, { ExecutionContext } from "ava";
import { BridgeIDBFactory } from "..";
import {
  IDBDatabase,
  IDBIndex,
  IDBObjectStore,
  IDBOpenDBRequest,
  IDBRequest,
  IDBTransaction,
  IDBTransactionMode,
} from "../idbtypes";
import { MemoryBackend } from "../MemoryBackend";
import { compareKeys } from "../util/cmp";

BridgeIDBFactory.enableTracing = true;
const backend = new MemoryBackend();
backend.enableTracing = true;
export const idbFactory = new BridgeIDBFactory(backend);

const self = {
  indexedDB: idbFactory,
};

export function createdb(
  t: ExecutionContext<unknown>,
  dbname?: string,
  version?: number,
): IDBOpenDBRequest {
  var rq_open: IDBOpenDBRequest;
  dbname = dbname ? dbname : "testdb-" + new Date().getTime() + Math.random();
  if (version) rq_open = self.indexedDB.open(dbname, version);
  else rq_open = self.indexedDB.open(dbname);
  return rq_open;
}

export function assert_key_equals(
  actual: any,
  expected: any,
  description?: string,
) {
  if (0 != compareKeys(actual, expected)) {
    throw Error("expected keys to be the same");
  }
}

export function assert_equals(actual: any, expected: any) {
  if (actual !== expected) {
    throw Error("assert_equals failed");
  }
}

function makeDatabaseName(testCase: string): string {
  return "db-" + testCase;
}

// Promise that resolves with an IDBRequest's result.
//
// The promise only resolves if IDBRequest receives the "success" event. Any
// other event causes the promise to reject with an error. This is correct in
// most cases, but insufficient for indexedDB.open(), which issues
// "upgradeneded" events under normal operation.
function promiseForRequest<T = any>(
  t: ExecutionContext,
  request: IDBRequest<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", (evt: any) => {
      resolve(evt.target.result);
    });
    request.addEventListener("blocked", (evt: any) => reject(evt.target.error));
    request.addEventListener("error", (evt: any) => reject(evt.target.error));
    request.addEventListener("upgradeneeded", (evt: any) =>
      reject(evt.target.error),
    );
  });
}

type MigrationCallback = (
  db: IDBDatabase,
  tx: IDBTransaction,
  req: IDBOpenDBRequest,
) => void;

export async function migrateDatabase(
  t: ExecutionContext,
  newVersion: number,
  migrationCallback: MigrationCallback,
): Promise<IDBDatabase> {
  return migrateNamedDatabase(
    t,
    makeDatabaseName(t.title),
    newVersion,
    migrationCallback,
  );
}

export async function migrateNamedDatabase(
  t: ExecutionContext,
  databaseName: string,
  newVersion: number,
  migrationCallback: MigrationCallback,
): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = self.indexedDB.open(databaseName, newVersion);
    request.onupgradeneeded = (event: any) => {
      const database = event.target.result;
      const transaction = event.target.transaction;
      let shouldBeAborted = false;
      let requestEventPromise: any = null;

      // We wrap IDBTransaction.abort so we can set up the correct event
      // listeners and expectations if the test chooses to abort the
      // versionchange transaction.
      const transactionAbort = transaction.abort.bind(transaction);
      transaction.abort = () => {
        transaction._willBeAborted();
        transactionAbort();
      };
      transaction._willBeAborted = () => {
        requestEventPromise = new Promise((resolve, reject) => {
          request.onerror = (event: any) => {
            event.preventDefault();
            resolve(event.target.error);
          };
          request.onsuccess = () =>
            reject(
              new Error(
                "indexedDB.open should not succeed for an aborted " +
                  "versionchange transaction",
              ),
            );
        });
        shouldBeAborted = true;
      };

      // If migration callback returns a promise, we'll wait for it to resolve.
      // This simplifies some tests.
      const callbackResult = migrationCallback(database, transaction, request);
      if (!shouldBeAborted) {
        request.onerror = null;
        request.onsuccess = null;
        requestEventPromise = promiseForRequest(t, request);
      }

      // requestEventPromise needs to be the last promise in the chain, because
      // we want the event that it resolves to.
      resolve(Promise.resolve(callbackResult).then(() => requestEventPromise));
    };
    request.onerror = (event: any) => reject(event.target.error);
    request.onsuccess = () => {
      const database = request.result;
      t.teardown(() => database.close());
      reject(
        new Error(
          "indexedDB.open should not succeed without creating a " +
            "versionchange transaction",
        ),
      );
    };
  });
}

export async function createDatabase(
  t: ExecutionContext,
  setupCallback: MigrationCallback,
): Promise<IDBDatabase> {
  const databaseName = makeDatabaseName(t.title);
  const request = self.indexedDB.deleteDatabase(databaseName);
  return migrateNamedDatabase(t, databaseName, 1, setupCallback);
}

// The data in the 'books' object store records in the first example of the
// IndexedDB specification.
const BOOKS_RECORD_DATA = [
  { title: "Quarry Memories", author: "Fred", isbn: 123456 },
  { title: "Water Buffaloes", author: "Fred", isbn: 234567 },
  { title: "Bedrock Nights", author: "Barney", isbn: 345678 },
];

// Creates a 'books' object store whose contents closely resembles the first
// example in the IndexedDB specification.
export const createBooksStore = (
  testCase: ExecutionContext,
  database: IDBDatabase,
) => {
  const store = database.createObjectStore("books", {
    keyPath: "isbn",
    autoIncrement: true,
  });
  store.createIndex("by_author", "author");
  store.createIndex("by_title", "title", { unique: true });
  for (const record of BOOKS_RECORD_DATA) store.put(record);
  return store;
};

// Verifies that an object store's contents matches the contents used to create
// the books store in the test database's version 1.
//
// The errorMessage is used if the assertions fail. It can state that the
// IndexedDB implementation being tested is incorrect, or that the testing code
// is using it incorrectly.
export async function checkStoreContents(
  testCase: ExecutionContext,
  store: IDBObjectStore,
  errorMessage: string,
) {
  const request = store.get(123456);
  const result = await promiseForRequest(testCase, request);
  testCase.deepEqual(result.isbn, BOOKS_RECORD_DATA[0].isbn, errorMessage);
  testCase.deepEqual(result.author, BOOKS_RECORD_DATA[0].author, errorMessage);
  testCase.deepEqual(result.title, BOOKS_RECORD_DATA[0].title, errorMessage);
}

// Verifies that an object store's indexes match the indexes used to create the
// books store in the test database's version 1.
//
// The errorMessage is used if the assertions fail. It can state that the
// IndexedDB implementation being tested is incorrect, or that the testing code
// is using it incorrectly.
export function checkStoreIndexes(
  testCase: ExecutionContext,
  store: IDBObjectStore,
  errorMessage: string,
) {
  testCase.deepEqual(
    store.indexNames as any,
    ["by_author", "by_title"],
    errorMessage,
  );
  const authorIndex = store.index("by_author");
  const titleIndex = store.index("by_title");
  return Promise.all([
    checkAuthorIndexContents(testCase, authorIndex, errorMessage),
    checkTitleIndexContents(testCase, titleIndex, errorMessage),
  ]);
}

// Verifies that index matches the 'by_author' index used to create the
// by_author books store in the test database's version 1.
//
// The errorMessage is used if the assertions fail. It can state that the
// IndexedDB implementation being tested is incorrect, or that the testing code
// is using it incorrectly.
async function checkAuthorIndexContents(
  testCase: ExecutionContext,
  index: IDBIndex,
  errorMessage: string,
) {
  const request = index.get(BOOKS_RECORD_DATA[2].author);
  const result = await promiseForRequest(testCase, request);
  testCase.deepEqual(result.isbn, BOOKS_RECORD_DATA[2].isbn, errorMessage);
  testCase.deepEqual(result.title, BOOKS_RECORD_DATA[2].title, errorMessage);
}

// Verifies that an index matches the 'by_title' index used to create the books
// store in the test database's version 1.
//
// The errorMessage is used if the assertions fail. It can state that the
// IndexedDB implementation being tested is incorrect, or that the testing code
// is using it incorrectly.
async function checkTitleIndexContents(
  testCase: ExecutionContext,
  index: IDBIndex,
  errorMessage: string,
) {
  const request = index.get(BOOKS_RECORD_DATA[2].title);
  const result = await promiseForRequest(testCase, request);
  testCase.deepEqual(result.isbn, BOOKS_RECORD_DATA[2].isbn, errorMessage);
  testCase.deepEqual(result.author, BOOKS_RECORD_DATA[2].author, errorMessage);
}

// Verifies that an object store's key generator is in the same state as the
// key generator created for the books store in the test database's version 1.
//
// The errorMessage is used if the assertions fail. It can state that the
// IndexedDB implementation being tested is incorrect, or that the testing code
// is using it incorrectly.
export function checkStoreGenerator(
  testCase: ExecutionContext,
  store: IDBObjectStore,
  expectedKey: any,
  errorMessage: string,
) {
  const request = store.put({
    title: "Bedrock Nights " + expectedKey,
    author: "Barney",
  });
  return promiseForRequest(testCase, request).then((result) => {
    testCase.deepEqual(result, expectedKey, errorMessage);
  });
}

// Creates a 'not_books' object store used to test renaming into existing or
// deleted store names.
export function createNotBooksStore(
  testCase: ExecutionContext,
  database: IDBDatabase,
) {
  const store = database.createObjectStore("not_books");
  store.createIndex("not_by_author", "author");
  store.createIndex("not_by_title", "title", { unique: true });
  return store;
}
