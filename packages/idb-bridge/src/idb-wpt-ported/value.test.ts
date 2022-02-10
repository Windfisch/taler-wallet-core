import test from "ava";
import { IDBVersionChangeEvent } from "../idbtypes.js";
import { createdb } from "./wptsupport.js";

test("WPT test value.htm, array", (t) => {
  return new Promise((resolve, reject) => {
    const value = new Array();
    const _instanceof = Array;

    t.plan(1);

    createdb(t).onupgradeneeded = function (e: IDBVersionChangeEvent) {
      (e.target as any).result.createObjectStore("store").add(value, 1);
      (e.target as any).onsuccess = (e: any) => {
        console.log("in first onsuccess");
        e.target.result
          .transaction("store")
          .objectStore("store")
          .get(1).onsuccess = (e: any) => {
          t.assert(e.target.result instanceof _instanceof, "instanceof");
          resolve();
        };
      };
    };
  });
});

test("WPT test value.htm, date", (t) => {
  return new Promise((resolve, reject) => {
    const value = new Date();
    const _instanceof = Date;

    t.plan(1);

    createdb(t).onupgradeneeded = function (e: IDBVersionChangeEvent) {
      (e.target as any).result.createObjectStore("store").add(value, 1);
      (e.target as any).onsuccess = (e: any) => {
        console.log("in first onsuccess");
        e.target.result
          .transaction("store")
          .objectStore("store")
          .get(1).onsuccess = (e: any) => {
          console.log("target", e.target);
          console.log("result", e.target.result);
          t.assert(e.target.result instanceof _instanceof, "instanceof");
          resolve();
        };
      };
    };
  });
});
