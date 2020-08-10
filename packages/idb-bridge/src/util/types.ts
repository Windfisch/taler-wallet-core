/*
 Copyright 2017 Jeremy Scheff
 Copyright 2019 Florian Dold

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
*/

import { BridgeIDBRequest } from "../BridgeIDBRequest";
import { BridgeIDBKeyRange } from "../BridgeIDBKeyRange";
import { BridgeIDBIndex } from "../BridgeIDBIndex";
import { BridgeIDBObjectStore } from "../BridgeIDBObjectStore";
import { Event } from "../idbtypes";

/** @public */
export type EventType =
  | "abort"
  | "blocked"
  | "complete"
  | "error"
  | "success"
  | "upgradeneeded"
  | "versionchange";

/** @public */
export type CursorSource = BridgeIDBIndex | BridgeIDBObjectStore;

/** @public */
export interface FakeDOMStringList extends Array<string> {
  contains: (value: string) => boolean;
  item: (i: number) => string | undefined;
}

/**
 * @public
 */
export type BridgeIDBCursorDirection =
  | "next"
  | "nextunique"
  | "prev"
  | "prevunique";

/** @public */
export type KeyPath = string | string[];

/** @public */
export type Key = any;

/** @public */
export type CursorRange = Key | BridgeIDBKeyRange | undefined;

/** @public */
export type Value = any;

/** @public */
export interface Record {
  key: Key;
  value: Key | Value; // For indexes, will be Key. For object stores, will be Value.
}

/** @public */
export type TransactionMode = "readonly" | "readwrite" | "versionchange";

/** @public */
export interface BridgeIDBDatabaseInfo {
  name: string;
  version: number;
}

/** @public */
export interface RequestObj {
  operation: () => Promise<any>;
  request?: BridgeIDBRequest | undefined;
  source?: any;
}
