/*
 This file is part of TALER
 (C) 2017 Inria and GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import {test} from "ava";
import * as memidb from "./memidb";

test.cb("db open", (t) => {
  let ncb = 0;
  const idb = new memidb.MemoryIDBFactory();
  const req = idb.open("testdb");
  let called = false;
  req.onupgradeneeded = (evt) => {
    ncb += 1;
    called = true;
    t.is(req.result, evt.target);
    t.is(evt.oldVersion, 0);
    t.is(evt.newVersion, 1);
    t.truthy(req.result);
    t.pass();
  }
  req.onsuccess = (evt) => {
    t.is(ncb, 1);
    t.is(req.result, evt.target);
    t.truthy(req.result);
    t.end();
  }
});

test.cb("store creation", (t) => {
  const idb = new memidb.MemoryIDBFactory();
  const req = idb.open("testdb");
  req.onupgradeneeded = (evt) => {
    const db: IDBDatabase = req.result;

    const store1 = db.createObjectStore("b-store");
    t.is(store1.name, "b-store");
    t.deepEqual(Array.from(db.objectStoreNames), ["b-store"]);

    const store2 = db.createObjectStore("a-store");
    t.is(store2.name, "a-store");
    t.deepEqual(Array.from(db.objectStoreNames), ["a-store", "b-store"]);

    const store3 = db.createObjectStore("c-store");
    t.is(store3.name, "c-store");
    t.deepEqual(Array.from(db.objectStoreNames), ["a-store", "b-store", "c-store"]);
    t.pass();
  }
  req.onsuccess = (evt) => {
    t.end();
  }
});


test.cb("put and get", (t) => {
  const idb = new memidb.MemoryIDBFactory();
  const req = idb.open("testdb");
  req.onupgradeneeded = (evt) => {
    const db: IDBDatabase = req.result;
    const store1 = db.createObjectStore("mystore");
    store1.put({answer: 42}, "a");
  }
  req.onsuccess = (evt) => {
    t.end()
  }
});


test("key path evaluation", (t) => {
  const obj = {
    a: {
      b: {
        c: 42,
      },
    },
    b: "hello",
    "": "spam",
    arr: ["foo", "bar"],
  }
  t.deepEqual(memidb.evaluateKeyPath(obj, ""), obj);
  t.deepEqual(memidb.evaluateKeyPath(obj, "a.b.c"), 42);
  t.deepEqual(memidb.evaluateKeyPath(obj, "a.b"), {c: 42});
  t.deepEqual(memidb.evaluateKeyPath(obj, "foo"), undefined);
  t.deepEqual(memidb.evaluateKeyPath(obj, ["a.b.c", "foo"]), undefined);
  t.deepEqual(memidb.evaluateKeyPath(obj, ["a.b.c", "b"]), [42, "hello"]);
  t.deepEqual(memidb.evaluateKeyPath(obj, "arr.0"), "foo");
  t.deepEqual(memidb.evaluateKeyPath(obj, "."), "spam");
});

test("key path evaluation with replacement", (t) => {
  const obj: any = {
    a: {
      b: {
        c: 42,
      },
    },
  }
  memidb.evaluateKeyPath(obj, "a.b.c", 24);
  t.is(obj.a.b.c, 24);
  memidb.evaluateKeyPath(obj, "a.b", 24);
  t.is(obj.a.b, 24);
});
