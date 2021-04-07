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
import { URL } from "./url";

/**
 * Show an amount in a form suitable for the user.
 * FIXME:  In the future, this should consider currency-specific
 * settings such as significant digits or currency symbols.
 */
export function amountToPretty(amount: AmountJson): string {
  const x = amount.value + amount.fraction / Amounts.amountFractionalBase;
  return `${x} ${amount.currency}`;
}

/**
 * Canonicalize a base url, typically for the exchange.
 *
 * See http://api.taler.net/wallet.html#general
 */
export function canonicalizeBaseUrl(url: string): string {
  if (!url.startsWith("http") && !url.startsWith("https")) {
    url = "https://" + url;
  }
  const x = new URL(url);
  if (!x.pathname.endsWith("/")) {
    x.pathname = x.pathname + "/";
  }
  x.search = "";
  x.hash = "";
  return x.href;
}

/**
 * Convert object to JSON with canonical ordering of keys
 * and whitespace omitted.
 */
export function canonicalJson(obj: any): string {
  // Check for cycles, etc.
  obj = JSON.parse(JSON.stringify(obj));
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

/**
 * Shorthand function for formatted JSON stringification.
 */
export function j2s(x: any): string {
  return JSON.stringify(x, undefined, 2);
}
