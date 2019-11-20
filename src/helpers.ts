/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Small helper functions that don't fit anywhere else.
 */

/**
 * Imports.
 */
import { AmountJson } from "./amounts";
import * as Amounts from "./amounts";

import URI = require("urijs");
import { Timestamp } from "./walletTypes";

/**
 * Show an amount in a form suitable for the user.
 * FIXME:  In the future, this should consider currency-specific
 * settings such as significant digits or currency symbols.
 */
export function amountToPretty(amount: AmountJson): string {
  const x = amount.value + amount.fraction / Amounts.fractionalBase;
  return `${x} ${amount.currency}`;
}


/**
 * Canonicalize a base url, typically for the exchange.
 *
 * See http://api.taler.net/wallet.html#general
 */
export function canonicalizeBaseUrl(url: string) {
  const x = new URI(url);
  if (!x.protocol()) {
    x.protocol("https");
  }
  x.path(x.path() + "/").normalizePath();
  x.fragment("");
  x.query();
  return x.href();
}


/**
 * Convert object to JSON with canonical ordering of keys
 * and whitespace omitted.
 */
export function canonicalJson(obj: any): string {
  // Check for cycles, etc.
  JSON.stringify(obj);
  if (typeof obj === "string" || typeof obj === "number" || obj === null) {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    const objs: string[] = obj.map((e) => canonicalJson(e));
    return `[${objs.join(",")}]`;
  }
  const keys: string[] = [];
  for (const key in obj) {
    keys.push(key);
  }
  keys.sort();
  let s = "{";
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    s += JSON.stringify(key) + ":" + canonicalJson(obj[key]);
    if (i !== keys.length - 1) {
      s += ",";
    }
  }
  return s + "}";
}


/**
 * Check for deep equality of two objects.
 * Only arrays, objects and primitives are supported.
 */
export function deepEquals(x: any, y: any): boolean {
  if (x === y) {
    return true;
  }

  if (Array.isArray(x) && x.length !== y.length) {
    return false;
  }

  const p = Object.keys(x);
  return Object.keys(y).every((i) => p.indexOf(i) !== -1) &&
    p.every((i) => deepEquals(x[i], y[i]));
}


/**
 * Map from a collection to a list or results and then
 * concatenate the results.
 */
export function flatMap<T, U>(xs: T[], f: (x: T) => U[]): U[] {
  return xs.reduce((acc: U[], next: T) => [...f(next), ...acc], []);
}


/**
 * Extract a numeric timstamp (in seconds) from the Taler date format
 * ("/Date([n])/").  Returns null if input is not in the right format.
 */
export function getTalerStampSec(stamp: string): number | null {
  const m = stamp.match(/\/?Date\(([0-9]*)\)\/?/);
  if (!m || !m[1]) {
    return null;
  }
  return parseInt(m[1], 10);
}

/**
 * Extract a timestamp from a Taler timestamp string.
 */
export function extractTalerStamp(stamp: string): Timestamp | undefined {
  const m = stamp.match(/\/?Date\(([0-9]*)\)\/?/);
  if (!m || !m[1]) {
    return undefined;
  }
  return {
    t_ms: parseInt(m[1], 10) * 1000,
  };
}

/**
 * Check if a timestamp is in the right format.
 */
export function timestampCheck(stamp: string): boolean {
  return getTalerStampSec(stamp) !== null;
}


/**
 * Get a JavaScript Date object from a Taler date string.
 * Returns null if input is not in the right format.
 */
export function getTalerStampDate(stamp: string): Date | null {
  const sec = getTalerStampSec(stamp);
  if (sec == null) {
    return null;
  }
  return new Date(sec * 1000);
}

/**
 * Compute the hash function of a JSON object.
 */
export function hash(val: any): number {
  const str = canonicalJson(val);
  // https://github.com/darkskyapp/string-hash
  let h = 5381;
  let i = str.length;
  while (i) {
    h = (h * 33) ^ str.charCodeAt(--i);
  }

  /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
  * integers. Since we want the results to be always positive, convert the
  * signed int to an unsigned by doing an unsigned bitshift. */
  return h >>> 0;
}


/**
 * Lexically compare two strings.
 */
export function strcmp(s1: string, s2: string): number {
  if (s1 < s2) {
    return -1;
  }
  if (s1 > s2) {
    return 1;
  }
  return 0;
}
