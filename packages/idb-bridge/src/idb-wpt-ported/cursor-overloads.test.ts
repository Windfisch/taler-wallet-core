import test from "ava";
import { BridgeIDBCursor } from "..";
import { BridgeIDBCursorWithValue } from "../bridge-idb";
import { createdb } from "./wptsupport";

// Validate the overloads of IDBObjectStore.openCursor(), IDBIndex.openCursor() and IDBIndex.openKeyCursor()
test.cb("WPT test cursor-overloads.htm", (t) => {
  var db: any, trans: any, store: any, index: any;

  var request = createdb(t);
  request.onupgradeneeded = function (e) {
    db = request.result;
    store = db.createObjectStore("store");
    index = store.createIndex("index", "value");
    store.put({ value: 0 }, 0);
    trans = request.transaction;
    trans.oncomplete = verifyOverloads;
  };

  function verifyOverloads() {
    trans = db.transaction("store");
    store = trans.objectStore("store");
    index = store.index("index");

    checkCursorDirection("store.openCursor()", "next");
    checkCursorDirection("store.openCursor(0)", "next");
    checkCursorDirection("store.openCursor(0, 'next')", "next");
    checkCursorDirection("store.openCursor(0, 'nextunique')", "nextunique");
    checkCursorDirection("store.openCursor(0, 'prev')", "prev");
    checkCursorDirection("store.openCursor(0, 'prevunique')", "prevunique");

    checkCursorDirection("store.openCursor(IDBKeyRange.only(0))", "next");
    checkCursorDirection(
      "store.openCursor(IDBKeyRange.only(0), 'next')",
      "next",
    );
    checkCursorDirection(
      "store.openCursor(IDBKeyRange.only(0), 'nextunique')",
      "nextunique",
    );
    checkCursorDirection(
      "store.openCursor(IDBKeyRange.only(0), 'prev')",
      "prev",
    );
    checkCursorDirection(
      "store.openCursor(IDBKeyRange.only(0), 'prevunique')",
      "prevunique",
    );

    checkCursorDirection("index.openCursor()", "next");
    checkCursorDirection("index.openCursor(0)", "next");
    checkCursorDirection("index.openCursor(0, 'next')", "next");
    checkCursorDirection("index.openCursor(0, 'nextunique')", "nextunique");
    checkCursorDirection("index.openCursor(0, 'prev')", "prev");
    checkCursorDirection("index.openCursor(0, 'prevunique')", "prevunique");

    checkCursorDirection("index.openCursor(IDBKeyRange.only(0))", "next");
    checkCursorDirection(
      "index.openCursor(IDBKeyRange.only(0), 'next')",
      "next",
    );
    checkCursorDirection(
      "index.openCursor(IDBKeyRange.only(0), 'nextunique')",
      "nextunique",
    );
    checkCursorDirection(
      "index.openCursor(IDBKeyRange.only(0), 'prev')",
      "prev",
    );
    checkCursorDirection(
      "index.openCursor(IDBKeyRange.only(0), 'prevunique')",
      "prevunique",
    );

    checkCursorDirection("index.openKeyCursor()", "next");
    checkCursorDirection("index.openKeyCursor(0)", "next");
    checkCursorDirection("index.openKeyCursor(0, 'next')", "next");
    checkCursorDirection("index.openKeyCursor(0, 'nextunique')", "nextunique");
    checkCursorDirection("index.openKeyCursor(0, 'prev')", "prev");
    checkCursorDirection("index.openKeyCursor(0, 'prevunique')", "prevunique");

    checkCursorDirection("index.openKeyCursor(IDBKeyRange.only(0))", "next");
    checkCursorDirection(
      "index.openKeyCursor(IDBKeyRange.only(0), 'next')",
      "next",
    );
    checkCursorDirection(
      "index.openKeyCursor(IDBKeyRange.only(0), 'nextunique')",
      "nextunique",
    );
    checkCursorDirection(
      "index.openKeyCursor(IDBKeyRange.only(0), 'prev')",
      "prev",
    );
    checkCursorDirection(
      "index.openKeyCursor(IDBKeyRange.only(0), 'prevunique')",
      "prevunique",
    );

    t.end();
  }

  function checkCursorDirection(statement: string, direction: string) {
    request = eval(statement);
    request.onsuccess = function (event: any) {
      t.notDeepEqual(event.target.result, null, "Check the result is not null");
      t.deepEqual(
        event.target.result.direction,
        direction,
        "Check the result direction",
      );
    };
  }
});
