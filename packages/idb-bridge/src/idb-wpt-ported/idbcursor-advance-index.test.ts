import test from "ava";
import { BridgeIDBCursor } from "..";
import { createdb } from "./wptsupport";

test("WPT test idbcursor_advance_index.htm", async (t) => {
  await new Promise<void>((resolve, reject) => {
    let db: any;
    let count = 0;
    const records = [
      { pKey: "primaryKey_0", iKey: "indexKey_0" },
      { pKey: "primaryKey_1", iKey: "indexKey_1" },
      { pKey: "primaryKey_2", iKey: "indexKey_2" },
      { pKey: "primaryKey_3", iKey: "indexKey_3" },
    ];

    var open_rq = createdb(t);
    open_rq.onupgradeneeded = function (e: any) {
      db = e.target.result;
      var store = db.createObjectStore("test", { keyPath: "pKey" });
      store.createIndex("idx", "iKey");

      for (var i = 0; i < records.length; i++) {
        store.add(records[i]);
      }
    };

    open_rq.onsuccess = function (e) {
      var cursor_rq = db
        .transaction("test")
        .objectStore("test")
        .index("idx")
        .openCursor();

      cursor_rq.onsuccess = function (e: any) {
        var cursor = e.target.result;
        t.log(cursor);
        t.true(cursor instanceof BridgeIDBCursor);

        switch (count) {
          case 0:
            count += 3;
            cursor.advance(3);
            break;
          case 3:
            var record = cursor.value;
            t.deepEqual(record.pKey, records[count].pKey, "record.pKey");
            t.deepEqual(record.iKey, records[count].iKey, "record.iKey");
            resolve();
            break;
          default:
            t.fail("unexpected count");
            break;
        }
      }
    };
  });
});
