import { ExecutionContext } from "ava";
import { BridgeIDBFactory } from "..";
import { IDBOpenDBRequest } from "../idbtypes";
import { MemoryBackend } from "../MemoryBackend";
import { compareKeys } from "../util/cmp";

BridgeIDBFactory.enableTracing = true;
const backend = new MemoryBackend();
backend.enableTracing = true;
const idbFactory = new BridgeIDBFactory(backend);

const self = {
  indexedDB: idbFactory,
};

export function createdb(
  t: ExecutionContext<unknown>,
  dbname?: string,
  version?: number,
): IDBOpenDBRequest {
  var rq_open: IDBOpenDBRequest;
  dbname = dbname ? dbname : "testdb-" + new Date().getTime() + Math.random();
  if (version) rq_open = self.indexedDB.open(dbname, version);
  else rq_open = self.indexedDB.open(dbname);
  return rq_open;
}

export function assert_key_equals(
  actual: any,
  expected: any,
  description?: string,
) {
  if (0 != compareKeys(actual, expected)) {
    throw Error("expected keys to be the same");
  }
}

export function assert_equals(actual: any, expected: any) {
  if (actual !== expected) {
    throw Error("assert_equals failed");
  }
}
