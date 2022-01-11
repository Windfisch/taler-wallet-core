/*
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

import { DataCloneError } from "./errors.js";

const { toString: toStr } = {};
const hasOwn = {}.hasOwnProperty;
const getProto = Object.getPrototypeOf;
const fnToString = hasOwn.toString;

function toStringTag(val: any) {
  return toStr.call(val).slice(8, -1);
}

function hasConstructorOf(a: any, b: any) {
  if (!a || typeof a !== "object") {
    return false;
  }
  const proto = getProto(a);
  if (!proto) {
    return b === null;
  }
  const Ctor = hasOwn.call(proto, "constructor") && proto.constructor;
  if (typeof Ctor !== "function") {
    return b === null;
  }
  if (b === Ctor) {
    return true;
  }
  if (b !== null && fnToString.call(Ctor) === fnToString.call(b)) {
    return true;
  }
  return false;
}

function isPlainObject(val: any): boolean {
  if (!val || toStringTag(val) !== "Object") {
    return false;
  }

  const proto = getProto(val);
  if (!proto) {
    // `Object.create(null)`
    return true;
  }

  return hasConstructorOf(val, Object);
}

function isUserObject(val: any): boolean {
  if (!val || toStringTag(val) !== "Object") {
    return false;
  }

  const proto = getProto(val);
  if (!proto) {
    // `Object.create(null)`
    return true;
  }
  return hasConstructorOf(val, Object) || isUserObject(proto);
}

function isRegExp(val: any): boolean {
  return toStringTag(val) === "RegExp";
}

function copyBuffer(cur: any) {
  if (cur instanceof Buffer) {
    return Buffer.from(cur);
  }

  return new cur.constructor(cur.buffer.slice(), cur.byteOffset, cur.length);
}

function checkCloneableOrThrow(x: any) {
  if (x == null) return;
  if (typeof x !== "object" && typeof x !== "function") return;
  if (x instanceof Date) return;
  if (Array.isArray(x)) return;
  if (x instanceof Map) return;
  if (x instanceof Set) return;
  if (isUserObject(x)) return;
  if (isPlainObject(x)) return;
  throw new DataCloneError();
}

export function mkDeepClone() {
  const refs = [] as any;
  const refsNew = [] as any;

  return clone;

  function cloneArray(a: any) {
    var keys = Object.keys(a);
    var a2 = new Array(keys.length);
    refs.push(a);
    refsNew.push(a2);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i] as any;
      var cur = a[k];
      checkCloneableOrThrow(cur);
      if (typeof cur !== "object" || cur === null) {
        a2[k] = cur;
      } else if (cur instanceof Date) {
        a2[k] = new Date(cur);
      } else if (ArrayBuffer.isView(cur)) {
        a2[k] = copyBuffer(cur);
      } else {
        var index = refs.indexOf(cur);
        if (index !== -1) {
          a2[k] = refsNew[index];
        } else {
          a2[k] = clone(cur);
        }
      }
    }
    refs.pop();
    refsNew.pop();
    return a2;
  }

  function clone(o: any) {
    checkCloneableOrThrow(o);
    if (typeof o !== "object" || o === null) return o;
    if (o instanceof Date) return new Date(o);
    if (Array.isArray(o)) return cloneArray(o);
    if (o instanceof Map) return new Map(cloneArray(Array.from(o)));
    if (o instanceof Set) return new Set(cloneArray(Array.from(o)));
    var o2 = {} as any;
    refs.push(o);
    refsNew.push(o2);
    for (var k in o) {
      if (Object.hasOwnProperty.call(o, k) === false) continue;
      var cur = o[k] as any;
      checkCloneableOrThrow(cur);
      if (typeof cur !== "object" || cur === null) {
        o2[k] = cur;
      } else if (cur instanceof Date) {
        o2[k] = new Date(cur);
      } else if (cur instanceof Map) {
        o2[k] = new Map(cloneArray(Array.from(cur)));
      } else if (cur instanceof Set) {
        o2[k] = new Set(cloneArray(Array.from(cur)));
      } else if (ArrayBuffer.isView(cur)) {
        o2[k] = copyBuffer(cur);
      } else {
        var i = refs.indexOf(cur);
        if (i !== -1) {
          o2[k] = refsNew[i];
        } else {
          o2[k] = clone(cur);
        }
      }
    }
    refs.pop();
    refsNew.pop();
    return o2;
  }
}

/**
 * Check if an object is deeply cloneable.
 * Only called for the side-effect of throwing an exception.
 */
export function mkDeepCloneCheckOnly() {
  const refs = [] as any;

  return clone;

  function cloneArray(a: any) {
    var keys = Object.keys(a);
    refs.push(a);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i] as any;
      var cur = a[k];
      checkCloneableOrThrow(cur);
      if (typeof cur !== "object" || cur === null) {
        // do nothing
      } else if (cur instanceof Date) {
        // do nothing
      } else if (ArrayBuffer.isView(cur)) {
        // do nothing
      } else {
        var index = refs.indexOf(cur);
        if (index !== -1) {
          // do nothing
        } else {
          clone(cur);
        }
      }
    }
    refs.pop();
  }

  function clone(o: any) {
    checkCloneableOrThrow(o);
    if (typeof o !== "object" || o === null) return o;
    if (o instanceof Date) return;
    if (Array.isArray(o)) return cloneArray(o);
    if (o instanceof Map) return cloneArray(Array.from(o));
    if (o instanceof Set) return cloneArray(Array.from(o));
    refs.push(o);
    for (var k in o) {
      if (Object.hasOwnProperty.call(o, k) === false) continue;
      var cur = o[k] as any;
      checkCloneableOrThrow(cur);
      if (typeof cur !== "object" || cur === null) {
        // do nothing
      } else if (cur instanceof Date) {
        // do nothing
      } else if (cur instanceof Map) {
        cloneArray(Array.from(cur));
      } else if (cur instanceof Set) {
        cloneArray(Array.from(cur));
      } else if (ArrayBuffer.isView(cur)) {
        // do nothing
      } else {
        var i = refs.indexOf(cur);
        if (i !== -1) {
          // do nothing
        } else {
          clone(cur);
        }
      }
    }
    refs.pop();
  }
}

function internalEncapsulate(
  val: any,
  outRoot: any,
  path: string[],
  memo: Map<any, string[]>,
  types: Array<[string[], string]>,
): any {
  const memoPath = memo.get(val);
  if (memoPath) {
    types.push([path, "ref"]);
    return memoPath;
  }
  if (val === null) {
    return null;
  }
  if (val === undefined) {
    types.push([path, "undef"]);
    return 0;
  }
  if (Array.isArray(val)) {
    memo.set(val, path);
    const outArr: any[] = [];
    let special = false;
    for (const x in val) {
      const n = Number(x);
      if (n < 0 || n >= val.length || Number.isNaN(n)) {
        special = true;
        break;
      }
    }
    if (special) {
      types.push([path, "array"]);
    }
    for (const x in val) {
      const p = [...path, x];
      outArr[x] = internalEncapsulate(val[x], outRoot, p, memo, types);
    }
    return outArr;
  }
  if (val instanceof Date) {
    types.push([path, "date"]);
    return val.getTime();
  }
  if (isUserObject(val) || isPlainObject(val)) {
    memo.set(val, path);
    const outObj: any = {};
    for (const x in val) {
      const p = [...path, x];
      outObj[x] = internalEncapsulate(val[x], outRoot, p, memo, types);
    }
    return outObj;
  }
  if (typeof val === "bigint") {
    types.push([path, "bigint"]);
    return val.toString();
  }
  if (typeof val === "boolean") {
    return val;
  }
  if (typeof val === "number") {
    return val;
  }
  if (typeof val === "string") {
    return val;
  }
  throw Error();
}

/**
 * Encapsulate a cloneable value into a plain JSON object.
 */
export function structuredEncapsulate(val: any): any {
  const outRoot = {};
  const types: Array<[string[], string]> = [];
  let res;
  res = internalEncapsulate(val, outRoot, [], new Map(), types);
  if (res === null) {
    return res;
  }
  // We need to further encapsulate the outer layer
  if (
    Array.isArray(res) ||
    typeof res !== "object" ||
    "$" in res ||
    "$types" in res
  ) {
    res = { $: res };
  }
  if (types.length > 0) {
    res["$types"] = types;
  }
  return res;
}

export function internalStructuredRevive(val: any): any {
  val = JSON.parse(JSON.stringify(val));
  if (val === null) {
    return null;
  }
  if (typeof val === "number") {
    return val;
  }
  if (typeof val === "string") {
    return val;
  }
  if (typeof val === "boolean") {
    return val;
  }
  if (!isPlainObject(val)) {
    throw Error();
  }
  let types = val.$types ?? [];
  delete val.$types;
  let outRoot: any;
  if ("$" in val) {
    outRoot = val.$;
  } else {
    outRoot = val;
  }
  function mutatePath(path: string[], f: (x: any) => any): void {
    if (path.length == 0) {
      outRoot = f(outRoot);
      return;
    }
    let obj = outRoot;
    for (let i = 0; i < path.length - 1; i++) {
      const n = path[i];
      if (!(n in obj)) {
        obj[n] = {};
      }
      obj = obj[n];
    }
    const last = path[path.length - 1];
    obj[last] = f(obj[last]);
  }
  function lookupPath(path: string[]): any {
    let obj = outRoot;
    for (const n of path) {
      obj = obj[n];
    }
    return obj;
  }
  for (const [path, type] of types) {
    switch (type) {
      case "bigint": {
        mutatePath(path, (x) => BigInt(x));
        break;
      }
      case "array": {
        mutatePath(path, (x) => {
          const newArr: any = [];
          for (const k in x) {
            newArr[k] = x[k];
          }
          return newArr;
        });
        break;
      }
      case "date": {
        mutatePath(path, (x) => new Date(x));
        break;
      }
      case "undef": {
        mutatePath(path, (x) => undefined);
        break;
      }
      case "ref": {
        mutatePath(path, (x) => lookupPath(x));
        break;
      }
      default:
        throw Error(`type '${type}' not implemented`);
    }
  }
  return outRoot;
}

export function structuredRevive(val: any): any {
  return internalStructuredRevive(val);
}

/**
 * Structured clone for IndexedDB.
 */
export function structuredClone(val: any): any {
  return mkDeepClone()(val);
}

/**
 * Structured clone for IndexedDB.
 */
export function checkStructuredCloneOrThrow(val: any): void {
  return mkDeepCloneCheckOnly()(val);
}
