import test from "ava";
import MemoryBackend from "./MemoryBackend";
import BridgeIDBFactory from "./BridgeIDBFactory";
import BridgeIDBRequest from "./BridgeIDBRequest";
import BridgeIDBDatabase from "./BridgeIDBDatabase";
import BridgeIDBTransaction from "./BridgeIDBTransaction";


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

function promiseFromTransaction(transaction: BridgeIDBTransaction): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log("attaching event handlers");
    transaction.oncomplete = () => {
      console.log("oncomplete was called from promise")
      resolve();
    };
    transaction.onerror = () => {
      reject();
    };
  });
}

test("Spec: Example 1 Part 1", async t => {
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


test("Spec: Example 1 Part 2", async t => {
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
    console.log("oncomplete called")
  };

  const store = tx.objectStore("books");
  
  store.put({title: "Quarry Memories", author: "Fred", isbn: 123456});
  store.put({title: "Water Buffaloes", author: "Fred", isbn: 234567});
  store.put({title: "Bedrock Nights", author: "Barney", isbn: 345678});

  await promiseFromTransaction(tx);

  t.pass();
});


test("Spec: Example 1 Part 3", async t => {
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
    console.log("oncomplete called")
  };

  const store = tx.objectStore("books");
  
  store.put({title: "Quarry Memories", author: "Fred", isbn: 123456});
  store.put({title: "Water Buffaloes", author: "Fred", isbn: 234567});
  store.put({title: "Bedrock Nights", author: "Barney", isbn: 345678});

  await promiseFromTransaction(tx);

  const tx2 = db.transaction("books", "readonly");
  const store2 = tx2.objectStore("books");
  var index2 = store2.index("by_title");
  const request2 = index2.get("Bedrock Nights");
  const result2: any = await promiseFromRequest(request2);

  t.is(result2.author, "Barney");

  t.pass();
});
