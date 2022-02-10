import test from "ava";
import { createdb } from "./wptsupport.js";

// IDBIndex.openCursor() - throw InvalidStateError when the index is deleted
test("WPT test idbindex-openCursor.htm", (t) => {
  return new Promise((resolve, reject) => {
    var db;

    var open_rq = createdb(t);
    open_rq.onupgradeneeded = function (e: any) {
      db = e.target.result;
      var store = db.createObjectStore("store", { keyPath: "key" });
      var index = store.createIndex("index", "indexedProperty");

      store.add({ key: 1, indexedProperty: "data" });
      store.deleteIndex("index");

      t.throws(
        () => {
          index.openCursor();
        },
        { name: "InvalidStateError" },
      );

      resolve();
    };
  });
});

// IDBIndex.openCursor() - throw TransactionInactiveError on aborted transaction
test("WPT test idbindex-openCursor2.htm", (t) => {
  return new Promise((resolve, reject) => {
    var db;

    var open_rq = createdb(t);
    open_rq.onupgradeneeded = function (e: any) {
      db = e.target.result;
      var store = db.createObjectStore("store", { keyPath: "key" });
      var index = store.createIndex("index", "indexedProperty");
      store.add({ key: 1, indexedProperty: "data" });
    };
    open_rq.onsuccess = function (e: any) {
      db = e.target.result;
      var tx = db.transaction("store");
      var index = tx.objectStore("store").index("index");
      tx.abort();

      t.throws(
        () => {
          index.openCursor();
        },
        { name: "TransactionInactiveError" },
      );

      resolve();
    };
  });
});

// IDBIndex.openCursor() - throw InvalidStateError on index deleted by aborted upgrade
test("WPT test idbindex-openCursor3.htm", (t) => {
  return new Promise((resolve, reject) => {
    var db;

    var open_rq = createdb(t);
    open_rq.onupgradeneeded = function (e: any) {
      db = e.target.result;
      var store = db.createObjectStore("store", { keyPath: "key" });
      var index = store.createIndex("index", "indexedProperty");
      store.add({ key: 1, indexedProperty: "data" });

      e.target.transaction.abort();

      t.throws(
        () => {
          console.log("index before openCursor", index);
          index.openCursor();
        },
        { name: "InvalidStateError" },
      );

      resolve();
    };
  });
});
