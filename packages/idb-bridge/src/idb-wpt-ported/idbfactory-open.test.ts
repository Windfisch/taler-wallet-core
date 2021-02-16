import test from "ava";
import { createdb, idbFactory } from "./wptsupport";

// IDBFactory.open() - request has no source
test("WPT idbfactory-open.htm", async (t) => {
  await new Promise<void>((resolve, reject) => {
    var open_rq = createdb(t, undefined, 9);

    open_rq.onupgradeneeded = function (e) {};
    open_rq.onsuccess = function (e: any) {
      t.deepEqual(e.target.source, null, "source");
      resolve();
    };
  });
  t.pass();
});

// IDBFactory.open() - database 'name' and 'version' are correctly set
test("WPT idbfactory-open2.htm", async (t) => {
  await new Promise<void>((resolve, reject) => {
    var database_name = __filename + "-database_name";
    var open_rq = createdb(t, database_name, 13);

    open_rq.onupgradeneeded = function (e) {};
    open_rq.onsuccess = function (e: any) {
      var db = e.target.result;
      t.deepEqual(db.name, database_name, "db.name");
      t.deepEqual(db.version, 13, "db.version");
      resolve;
    };
  });
  t.pass();
});

// IDBFactory.open() - no version opens current database
test("WPT idbfactory-open3.htm", async (t) => {
  const indexedDB = idbFactory;
  await new Promise<void>((resolve, reject) => {
    var open_rq = createdb(t, undefined, 13);
    var did_upgrade = false;

    open_rq.onupgradeneeded = function () {};
    open_rq.onsuccess = function (e: any) {
      var db = e.target.result;
      db.close();

      var open_rq2 = indexedDB.open(db.name);
      open_rq2.onsuccess = function (e: any) {
        t.deepEqual(e.target.result.version, 13, "db.version");
        e.target.result.close();
        resolve();
      };
      open_rq2.onupgradeneeded = () => t.fail("Unexpected upgradeneeded");
      open_rq2.onerror = () => t.fail("Unexpected error");
    };
  });
  t.pass();
});


// IDBFactory.open() - new database has default version
test("WPT idbfactory-open4.htm", async (t) => {
  const indexedDB = idbFactory;
  await new Promise<void>((resolve, reject) => {
    var open_rq = createdb(t, __filename + '-database_name');

    open_rq.onupgradeneeded = function(e: any) {
        t.deepEqual(e.target.result.version, 1, "db.version");
    };
    open_rq.onsuccess = function(e: any) {
        t.deepEqual(e.target.result.version, 1, "db.version");
        resolve();
    };
  });
  t.pass();
});
