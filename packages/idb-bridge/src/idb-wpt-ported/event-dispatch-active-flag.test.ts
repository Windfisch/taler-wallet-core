import test from "ava";
import { BridgeIDBRequest } from "..";
import {
  createdb,
  indexeddb_test,
  is_transaction_active,
  keep_alive,
} from "./wptsupport";

test("WPT test abort-in-initial-upgradeneeded.htm", async (t) => {
  // Transactions are active during success handlers
  await indexeddb_test(
    t,
    (done, db, tx) => {
      db.createObjectStore("store");
    },
    (done, db) => {
      const tx = db.transaction("store");
      const release_tx = keep_alive(t, tx, "store");

      t.assert(
        is_transaction_active(t, tx, "store"),
        "Transaction should be active after creation",
      );

      const request = tx.objectStore("store").get(4242);
      (request as BridgeIDBRequest)._debugName = "req-main"; 
      request.onerror = () => t.fail("request should succeed");
      request.onsuccess = () => {

        t.true(
          is_transaction_active(t, tx, "store"),
          "Transaction should be active during success handler",
        );

        let saw_handler_promise = false;
        Promise.resolve().then(() => {
          saw_handler_promise = true;
          t.true(
            is_transaction_active(t, tx, "store"),
            "Transaction should be active in handler's microtasks",
          );
        });

        setTimeout(() => {
          t.true(saw_handler_promise);
          t.false(
            is_transaction_active(t, tx, "store"),
            "Transaction should be inactive in next task",
          );
          release_tx();
          done();
        }, 0);
      };
    },
  );
});
