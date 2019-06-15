/*
  Copyright 2019 Florian Dold
  Copyright 2017 Jeremy Scheff

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

import compareKeys from "./util/cmp";
import { DataError } from "./util/errors";
import { Key } from "./util/types";
import valueToKey from "./util/valueToKey";

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#range-concept
class BridgeIDBKeyRange {
  public static only(value: Key) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    value = valueToKey(value);
    return new BridgeIDBKeyRange(value, value, false, false);
  }

  static lowerBound(lower: Key, open: boolean = false) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    lower = valueToKey(lower);
    return new BridgeIDBKeyRange(lower, undefined, open, true);
  }

  static upperBound(upper: Key, open: boolean = false) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    upper = valueToKey(upper);
    return new BridgeIDBKeyRange(undefined, upper, true, open);
  }

  static bound(
    lower: Key,
    upper: Key,
    lowerOpen: boolean = false,
    upperOpen: boolean = false,
  ) {
    if (arguments.length < 2) {
      throw new TypeError();
    }

    const cmpResult = compareKeys(lower, upper);
    if (cmpResult === 1 || (cmpResult === 0 && (lowerOpen || upperOpen))) {
      throw new DataError();
    }

    lower = valueToKey(lower);
    upper = valueToKey(upper);
    return new BridgeIDBKeyRange(lower, upper, lowerOpen, upperOpen);
  }

  readonly lower: Key | undefined;
  readonly upper: Key | undefined;
  readonly lowerOpen: boolean;
  readonly upperOpen: boolean;

  constructor(
    lower: Key | undefined,
    upper: Key | undefined,
    lowerOpen: boolean,
    upperOpen: boolean,
  ) {
    this.lower = lower;
    this.upper = upper;
    this.lowerOpen = lowerOpen;
    this.upperOpen = upperOpen;
  }

  // https://w3c.github.io/IndexedDB/#dom-idbkeyrange-includes
  includes(key: Key) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    key = valueToKey(key);

    if (this.lower !== undefined) {
      const cmpResult = compareKeys(this.lower, key);

      if (cmpResult === 1 || (cmpResult === 0 && this.lowerOpen)) {
        return false;
      }
    }
    if (this.upper !== undefined) {
      const cmpResult = compareKeys(this.upper, key);

      if (cmpResult === -1 || (cmpResult === 0 && this.upperOpen)) {
        return false;
      }
    }
    return true;
  }

  toString() {
    return "[object IDBKeyRange]";
  }

  static _valueToKeyRange(value: any, nullDisallowedFlag: boolean = false) {
    if (value instanceof BridgeIDBKeyRange) {
        return value;
    }

    if (value === null || value === undefined) {
        if (nullDisallowedFlag) {
            throw new DataError();
        }
        return new BridgeIDBKeyRange(undefined, undefined, false, false);
    }

    const key = valueToKey(value);

    return BridgeIDBKeyRange.only(key);
  }

}

export default BridgeIDBKeyRange;
