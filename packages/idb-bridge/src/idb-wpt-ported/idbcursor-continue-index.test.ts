import test from "ava";
import { BridgeIDBCursor } from "..";
import { createdb } from "./wptsupport";

test("WPT test idbcursor_continue_index.htm", async (t) => {
  await new Promise<void>((resolve, reject) => {
    var db: any;
    let count = 0;
    const records = [ { pKey: "primaryKey_0",   iKey: "indexKey_0" },
                { pKey: "primaryKey_1",   iKey: "indexKey_1" },
                { pKey: "primaryKey_1-2", iKey: "indexKey_1" } ];

  var open_rq = createdb(t);
  open_rq.onupgradeneeded = function(e: any) {
      db = e.target.result;
      var objStore = db.createObjectStore("test", { keyPath:"pKey" });

      objStore.createIndex("index", "iKey");

      for (var i = 0; i < records.length; i++)
          objStore.add(records[i]);
  };

  open_rq.onsuccess = function(e) {
      var cursor_rq = db.transaction("test")
                        .objectStore("test")
                        .index("index")
                        .openCursor();

      cursor_rq.onsuccess = function(e: any) {
          var cursor = e.target.result;
          if (!cursor) {
              t.deepEqual(count, records.length, "cursor run count");
              resolve();
          }

          var record = cursor.value;
          t.deepEqual(record.pKey, records[count].pKey, "primary key");
          t.deepEqual(record.iKey, records[count].iKey, "index key");

          cursor.continue();
          count++;
      };
  };
  });
});
