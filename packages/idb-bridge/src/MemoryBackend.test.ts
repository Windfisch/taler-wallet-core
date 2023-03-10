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

import test from "ava";
import {
  BridgeIDBCursorWithValue,
  BridgeIDBDatabase,
  BridgeIDBFactory,
  BridgeIDBKeyRange,
  BridgeIDBRequest,
  BridgeIDBTransaction,
} from "./bridge-idb.js";
import {
  IDBCursorDirection,
  IDBCursorWithValue,
  IDBDatabase,
  IDBKeyRange,
  IDBValidKey,
} from "./idbtypes.js";
import { MemoryBackend } from "./MemoryBackend.js";

function promiseFromRequest(request: BridgeIDBRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

function promiseFromTransaction(
  transaction: BridgeIDBTransaction,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject();
    };
  });
}

test("Spec: Example 1 Part 1", async (t) => {
  const backend = new MemoryBackend();
  const idb = new BridgeIDBFactory(backend);

  const request = idb.open("library");
  request.onupgradeneeded = () => {
    const db = request.result;
    const store = db.createObjectStore("books", { keyPath: "isbn" });
    const titleIndex = store.createIndex("by_title", "title", { unique: true });
    const authorIndex = store.createIndex("by_author", "author");

    // Populate with initial data.
    store.put({ title: "Quarry Memories", author: "Fred", isbn: 123456 });
    store.put({ title: "Water Buffaloes", author: "Fred", isbn: 234567 });
    store.put({ title: "Bedrock Nights", author: "Barney", isbn: 345678 });
  };

  await promiseFromRequest(request);
  t.pass();
});

test("Spec: Example 1 Part 2", async (t) => {
  const backend = new MemoryBackend();
  const idb = new BridgeIDBFactory(backend);

  const request = idb.open("library");
  request.onupgradeneeded = () => {
    const db = request.result;
    const store = db.createObjectStore("books", { keyPath: "isbn" });
    const titleIndex = store.createIndex("by_title", "title", { unique: true });
    const authorIndex = store.createIndex("by_author", "author");
  };

  const db: BridgeIDBDatabase = await promiseFromRequest(request);

  t.is(db.name, "library");

  const tx = db.transaction("books", "readwrite");
  tx.oncomplete = () => {
    console.log("oncomplete called");
  };

  const store = tx.objectStore("books");

  store.put({ title: "Quarry Memories", author: "Fred", isbn: 123456 });
  store.put({ title: "Water Buffaloes", author: "Fred", isbn: 234567 });
  store.put({ title: "Bedrock Nights", author: "Barney", isbn: 345678 });

  await promiseFromTransaction(tx);

  t.pass();
});

test("Spec: Example 1 Part 3", async (t) => {
  const backend = new MemoryBackend();
  backend.enableTracing = true;
  const idb = new BridgeIDBFactory(backend);

  const request = idb.open("library");
  request.onupgradeneeded = () => {
    const db = request.result;
    const store = db.createObjectStore("books", { keyPath: "isbn" });
    const titleIndex = store.createIndex("by_title", "title", { unique: true });
    const authorIndex = store.createIndex("by_author", "author");
  };

  const db: BridgeIDBDatabase = await promiseFromRequest(request);

  t.is(db.name, "library");

  const tx = db.transaction("books", "readwrite");

  const store = tx.objectStore("books");

  store.put({ title: "Bedrock Nights", author: "Barney", isbn: 345678 });
  store.put({ title: "Quarry Memories", author: "Fred", isbn: 123456 });
  store.put({ title: "Water Buffaloes", author: "Fred", isbn: 234567 });

  await promiseFromTransaction(tx);

  const tx2 = db.transaction("books", "readonly");
  const store2 = tx2.objectStore("books");
  var index2 = store2.index("by_title");
  const request2 = index2.get("Bedrock Nights");
  const result2: any = await promiseFromRequest(request2);

  t.is(result2.author, "Barney");

  const tx3 = db.transaction(["books"], "readonly");
  const store3 = tx3.objectStore("books");
  const index3 = store3.index("by_author");
  const request3 = index3.openCursor(BridgeIDBKeyRange.only("Fred"));

  await promiseFromRequest(request3);

  let cursor: BridgeIDBCursorWithValue | null;
  cursor = request3.result as BridgeIDBCursorWithValue;
  t.is(cursor.value.author, "Fred");
  t.is(cursor.value.isbn, 123456);

  cursor.continue();

  await promiseFromRequest(request3);

  cursor = request3.result as BridgeIDBCursorWithValue;
  t.is(cursor.value.author, "Fred");
  t.is(cursor.value.isbn, 234567);

  await promiseFromTransaction(tx3);

  const tx4 = db.transaction("books", "readonly");
  const store4 = tx4.objectStore("books");
  const request4 = store4.openCursor();

  await promiseFromRequest(request4);

  cursor = request4.result;
  if (!cursor) {
    throw new Error();
  }
  t.is(cursor.value.isbn, 123456);

  cursor.continue();

  await promiseFromRequest(request4);

  cursor = request4.result;
  if (!cursor) {
    throw new Error();
  }
  t.is(cursor.value.isbn, 234567);

  cursor.continue();

  await promiseFromRequest(request4);

  cursor = request4.result;
  if (!cursor) {
    throw new Error();
  }
  t.is(cursor.value.isbn, 345678);

  cursor.continue();
  await promiseFromRequest(request4);

  cursor = request4.result;

  t.is(cursor, null);

  const tx5 = db.transaction("books", "readonly");
  const store5 = tx5.objectStore("books");
  const index5 = store5.index("by_author");

  const request5 = index5.openCursor(null, "next");

  await promiseFromRequest(request5);
  cursor = request5.result;
  if (!cursor) {
    throw new Error();
  }
  t.is(cursor.value.author, "Barney");
  cursor.continue();

  await promiseFromRequest(request5);
  cursor = request5.result;
  if (!cursor) {
    throw new Error();
  }
  t.is(cursor.value.author, "Fred");
  cursor.continue();

  await promiseFromRequest(request5);
  cursor = request5.result;
  if (!cursor) {
    throw new Error();
  }
  t.is(cursor.value.author, "Fred");
  cursor.continue();

  await promiseFromRequest(request5);
  cursor = request5.result;
  t.is(cursor, null);

  const request6 = index5.openCursor(null, "nextunique");

  await promiseFromRequest(request6);
  cursor = request6.result;
  if (!cursor) {
    throw new Error();
  }
  t.is(cursor.value.author, "Barney");
  cursor.continue();

  await promiseFromRequest(request6);
  cursor = request6.result;
  if (!cursor) {
    throw new Error();
  }
  t.is(cursor.value.author, "Fred");
  t.is(cursor.value.isbn, 123456);
  cursor.continue();

  await promiseFromRequest(request6);
  cursor = request6.result;
  t.is(cursor, null);

  const request7 = index5.openCursor(null, "prevunique");
  await promiseFromRequest(request7);
  cursor = request7.result;
  if (!cursor) {
    throw new Error();
  }
  t.is(cursor.value.author, "Fred");
  t.is(cursor.value.isbn, 123456);
  cursor.continue();

  await promiseFromRequest(request7);
  cursor = request7.result;
  if (!cursor) {
    throw new Error();
  }
  t.is(cursor.value.author, "Barney");
  cursor.continue();

  await promiseFromRequest(request7);
  cursor = request7.result;
  t.is(cursor, null);

  db.close();

  t.pass();
});

test("simple deletion", async (t) => {
  const backend = new MemoryBackend();
  const idb = new BridgeIDBFactory(backend);

  const request = idb.open("library");
  request.onupgradeneeded = () => {
    const db = request.result;
    const store = db.createObjectStore("books", { keyPath: "isbn" });
    const titleIndex = store.createIndex("by_title", "title", { unique: true });
    const authorIndex = store.createIndex("by_author", "author");
  };

  const db: BridgeIDBDatabase = await promiseFromRequest(request);

  t.is(db.name, "library");

  const tx = db.transaction("books", "readwrite");
  tx.oncomplete = () => {
    console.log("oncomplete called");
  };

  const store = tx.objectStore("books");

  store.put({ title: "Quarry Memories", author: "Fred", isbn: 123456 });
  store.put({ title: "Water Buffaloes", author: "Fred", isbn: 234567 });
  store.put({ title: "Bedrock Nights", author: "Barney", isbn: 345678 });

  await promiseFromTransaction(tx);

  const tx2 = db.transaction("books", "readwrite");

  const store2 = tx2.objectStore("books");

  const req1 = store2.get(234567);
  await promiseFromRequest(req1);
  t.is(req1.readyState, "done");
  t.is(req1.result.author, "Fred");

  store2.delete(123456);

  const req2 = store2.get(123456);
  await promiseFromRequest(req2);
  t.is(req2.readyState, "done");
  t.is(req2.result, undefined);

  const req3 = store2.get(234567);
  await promiseFromRequest(req3);
  t.is(req3.readyState, "done");
  t.is(req3.result.author, "Fred");

  await promiseFromTransaction(tx2);

  t.pass();
});

test("export", async (t) => {
  const backend = new MemoryBackend();
  const idb = new BridgeIDBFactory(backend);

  const request = idb.open("library", 42);
  request.onupgradeneeded = () => {
    const db = request.result;
    const store = db.createObjectStore("books", { keyPath: "isbn" });
    const titleIndex = store.createIndex("by_title", "title", { unique: true });
    const authorIndex = store.createIndex("by_author", "author");
  };

  const db: BridgeIDBDatabase = await promiseFromRequest(request);

  const tx = db.transaction("books", "readwrite");
  tx.oncomplete = () => {
    console.log("oncomplete called");
  };

  const store = tx.objectStore("books");

  store.put({ title: "Quarry Memories", author: "Fred", isbn: 123456 });
  store.put({ title: "Water Buffaloes", author: "Fred", isbn: 234567 });
  store.put({ title: "Bedrock Nights", author: "Barney", isbn: 345678 });

  await promiseFromTransaction(tx);

  const exportedData = backend.exportDump();
  const backend2 = new MemoryBackend();
  backend2.importDump(exportedData);
  const exportedData2 = backend2.exportDump();

  t.assert(
    exportedData.databases["library"].objectStores["books"].records.length ===
      3,
  );
  t.deepEqual(exportedData, exportedData2);

  t.is(exportedData.databases["library"].schema.databaseVersion, 42);
  t.is(exportedData2.databases["library"].schema.databaseVersion, 42);
  t.pass();
});

test("update with non-existent index values", async (t) => {
  const backend = new MemoryBackend();
  backend.enableTracing = true;
  const idb = new BridgeIDBFactory(backend);
  const request = idb.open("mydb");
  request.onupgradeneeded = () => {
    const db = request.result;
    const store = db.createObjectStore("bla", { keyPath: "x" });
    store.createIndex("by_y", "y");
    store.createIndex("by_z", "z");
  };

  const db: BridgeIDBDatabase = await promiseFromRequest(request);

  t.is(db.name, "mydb");

  {
    const tx = db.transaction("bla", "readwrite");
    const store = tx.objectStore("bla");
    store.put({ x: 0, y: "a", z: 42 });
    const index = store.index("by_z");
    const indRes = await promiseFromRequest(index.get(42));
    t.is(indRes.x, 0);
    const res = await promiseFromRequest(store.get(0));
    t.is(res.z, 42);
    await promiseFromTransaction(tx);
  }

  {
    const tx = db.transaction("bla", "readwrite");
    const store = tx.objectStore("bla");
    store.put({ x: 0, y: "a" });
    const res = await promiseFromRequest(store.get(0));
    t.is(res.z, undefined);
    await promiseFromTransaction(tx);
  }

  {
    const tx = db.transaction("bla", "readwrite");
    const store = tx.objectStore("bla");
    const index = store.index("by_z");
    {
      const indRes = await promiseFromRequest(index.get(42));
      t.is(indRes, undefined);
    }
    const res = await promiseFromRequest(store.get(0));
    t.is(res.z, undefined);
    await promiseFromTransaction(tx);
  }

  t.pass();
});

test("delete from unique index", async (t) => {
  const backend = new MemoryBackend();
  backend.enableTracing = true;
  const idb = new BridgeIDBFactory(backend);
  const request = idb.open("mydb");
  request.onupgradeneeded = () => {
    const db = request.result as IDBDatabase;
    const store = db.createObjectStore("bla", { keyPath: "x" });
    store.createIndex("by_yz", ["y", "z"], {
      unique: true,
    });
  };

  const db: BridgeIDBDatabase = await promiseFromRequest(request);

  t.is(db.name, "mydb");

  {
    const tx = db.transaction("bla", "readwrite");
    const store = tx.objectStore("bla");
    store.put({ x: 0, y: "a", z: 42 });
    const index = store.index("by_yz");
    const indRes = await promiseFromRequest(index.get(["a", 42]));
    t.is(indRes.x, 0);
    const res = await promiseFromRequest(store.get(0));
    t.is(res.z, 42);
    await promiseFromTransaction(tx);
  }

  {
    const tx = db.transaction("bla", "readwrite");
    const store = tx.objectStore("bla");
    store.put({ x: 0, y: "a", z: 42, extra: 123 });
    await promiseFromTransaction(tx);
  }

  t.pass();
});

test("range queries", async (t) => {
  const backend = new MemoryBackend();
  backend.enableTracing = true;
  const idb = new BridgeIDBFactory(backend);

  const request = idb.open("mydb");
  request.onupgradeneeded = () => {
    const db = request.result;
    const store = db.createObjectStore("bla", { keyPath: "x" });
    store.createIndex("by_y", "y");
    store.createIndex("by_z", "z");
  };

  const db: BridgeIDBDatabase = await promiseFromRequest(request);

  t.is(db.name, "mydb");

  const tx = db.transaction("bla", "readwrite");

  const store = tx.objectStore("bla");

  store.put({ x: 0, y: "a" });
  store.put({ x: 2, y: "a" });
  store.put({ x: 4, y: "b" });
  store.put({ x: 8, y: "b" });
  store.put({ x: 10, y: "c" });
  store.put({ x: 12, y: "c" });

  await promiseFromTransaction(tx);

  async function doCursorStoreQuery(
    range: IDBKeyRange | IDBValidKey | undefined,
    direction: IDBCursorDirection | undefined,
    expected: any[],
  ): Promise<void> {
    const tx = db.transaction("bla", "readwrite");
    const store = tx.objectStore("bla");
    const vals: any[] = [];

    const req = store.openCursor(range, direction);
    while (1) {
      await promiseFromRequest(req);
      const cursor: IDBCursorWithValue = req.result;
      if (!cursor) {
        break;
      }
      cursor.continue();
      vals.push(cursor.value);
    }

    await promiseFromTransaction(tx);

    t.deepEqual(vals, expected);
  }

  async function doCursorIndexQuery(
    range: IDBKeyRange | IDBValidKey | undefined,
    direction: IDBCursorDirection | undefined,
    expected: any[],
  ): Promise<void> {
    const tx = db.transaction("bla", "readwrite");
    const store = tx.objectStore("bla");
    const index = store.index("by_y");
    const vals: any[] = [];

    const req = index.openCursor(range, direction);
    while (1) {
      await promiseFromRequest(req);
      const cursor: IDBCursorWithValue = req.result;
      if (!cursor) {
        break;
      }
      cursor.continue();
      vals.push(cursor.value);
    }

    await promiseFromTransaction(tx);

    t.deepEqual(vals, expected);
  }

  await doCursorStoreQuery(undefined, undefined, [
    {
      x: 0,
      y: "a",
    },
    {
      x: 2,
      y: "a",
    },
    {
      x: 4,
      y: "b",
    },
    {
      x: 8,
      y: "b",
    },
    {
      x: 10,
      y: "c",
    },
    {
      x: 12,
      y: "c",
    },
  ]);

  await doCursorStoreQuery(
    BridgeIDBKeyRange.bound(0, 12, true, true),
    undefined,
    [
      {
        x: 2,
        y: "a",
      },
      {
        x: 4,
        y: "b",
      },
      {
        x: 8,
        y: "b",
      },
      {
        x: 10,
        y: "c",
      },
    ],
  );

  await doCursorIndexQuery(
    BridgeIDBKeyRange.bound("a", "c", true, true),
    undefined,
    [
      {
        x: 4,
        y: "b",
      },
      {
        x: 8,
        y: "b",
      },
    ],
  );

  await doCursorIndexQuery(undefined, "nextunique", [
    {
      x: 0,
      y: "a",
    },
    {
      x: 4,
      y: "b",
    },
    {
      x: 10,
      y: "c",
    },
  ]);

  await doCursorIndexQuery(undefined, "prevunique", [
    {
      x: 10,
      y: "c",
    },
    {
      x: 4,
      y: "b",
    },
    {
      x: 0,
      y: "a",
    },
  ]);

  db.close();

  t.pass();
});
