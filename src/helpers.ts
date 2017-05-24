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
import {AmountJson, Amounts} from "./types";
import URI = require("urijs");

/**
 * Show an amount in a form suitable for the user.
 * FIXME:  In the future, this should consider currency-specific
 * settings such as significant digits or currency symbols.
 */
export function amountToPretty(amount: AmountJson): string {
  let x = amount.value + amount.fraction / Amounts.fractionalBase;
  return `${x} ${amount.currency}`;
}


/**
 * Canonicalize a base url, typically for the exchange.
 *
 * See http://api.taler.net/wallet.html#general
 */
export function canonicalizeBaseUrl(url: string) {
  let x = new URI(url);
  if (!x.protocol()) {
    x.protocol("https");
  }
  x.path(x.path() + "/").normalizePath();
  x.fragment("");
  x.query();
  return x.href()
}


/**
 * Convert object to JSON with canonical ordering of keys
 * and whitespace omitted.
 */
export function canonicalJson(obj: any): string {
  // Check for cycles, etc.
  JSON.stringify(obj);
  if (typeof obj == "string" || typeof obj == "number" || obj === null) {
    return JSON.stringify(obj)
  }
  if (Array.isArray(obj)) {
    let objs: string[] = obj.map((e) => canonicalJson(e));
    return `[${objs.join(',')}]`;
  }
  let keys: string[] = [];
  for (let key in obj) {
    keys.push(key);
  }
  keys.sort();
  let s = "{";
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    s += JSON.stringify(key) + ":" + canonicalJson(obj[key]);
    if (i != keys.length - 1) {
      s += ",";
    }
  }
  return s + "}";
}


export function deepEquals(x: any, y: any): boolean {
  if (x === y) {
    return true;
  }

  if (Array.isArray(x) && x.length !== y.length) {
    return false;
  }

  var p = Object.keys(x);
  return Object.keys(y).every((i) => p.indexOf(i) !== -1) &&
    p.every((i) => deepEquals(x[i], y[i]));
}


export function flatMap<T, U>(xs: T[], f: (x: T) => U[]): U[] {
  return xs.reduce((acc: U[], next: T) => [...f(next), ...acc], []);
}


/**
 * Extract a numeric timstamp (in seconds) from the Taler date format
 * ("/Date([n])/").  Returns null if input is not in the right format.
 */
export function getTalerStampSec(stamp: string): number | null {
  const m = stamp.match(/\/?Date\(([0-9]*)\)\/?/);
  if (!m) {
    return null;
  }
  return parseInt(m[1]);
}


/**
 * Get a JavaScript Date object from a Taler date string.
 * Returns null if input is not in the right format.
 */
export function getTalerStampDate(stamp: string): Date | null {
  let sec = getTalerStampSec(stamp);
  if (sec == null) {
    return null;
  }
  return new Date(sec * 1000);
}

