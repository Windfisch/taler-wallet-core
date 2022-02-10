import test from "ava";
import { createdb } from "./wptsupport.js";

// When db.close is called in upgradeneeded, the db is cleaned up on refresh
test("WPT test close-in-upgradeneeded.htm", (t) => {
  return new Promise((resolve, reject) => {
    var db: any;
    var open_rq = createdb(t);
    var sawTransactionComplete = false;

    open_rq.onupgradeneeded = function (e: any) {
      db = e.target.result;
      t.deepEqual(db.version, 1);

      db.createObjectStore("os");
      db.close();

      e.target.transaction.oncomplete = function () {
        sawTransactionComplete = true;
      };
    };

    open_rq.onerror = function (e: any) {
      t.true(sawTransactionComplete, "saw transaction.complete");

      t.deepEqual(e.target.error.name, "AbortError");
      t.deepEqual(e.result, undefined);

      t.true(!!db);
      t.deepEqual(db.version, 1);
      t.deepEqual(db.objectStoreNames.length, 1);
      t.throws(
        () => {
          db.transaction("os");
        },
        {
          name: "InvalidStateError",
        },
      );

      resolve();
    };
  });
});
