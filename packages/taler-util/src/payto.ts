/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { generateFakeSegwitAddress } from "./bitcoin.js";
import { URLSearchParams } from "./url.js";

export type PaytoUri =
  | PaytoUriUnknown
  | PaytoUriIBAN
  | PaytoUriTalerBank
  | PaytoUriBitcoin;

export interface PaytoUriGeneric {
  targetType: string;
  targetPath: string;
  params: { [name: string]: string };
}

export interface PaytoUriUnknown extends PaytoUriGeneric {
  isKnown: false;
}

export interface PaytoUriIBAN extends PaytoUriGeneric {
  isKnown: true;
  targetType: "iban";
  iban: string;
}

export interface PaytoUriTalerBank extends PaytoUriGeneric {
  isKnown: true;
  targetType: "x-taler-bank";
  host: string;
  account: string;
}

export interface PaytoUriBitcoin extends PaytoUriGeneric {
  isKnown: true;
  targetType: "bitcoin";
  segwitAddrs: Array<string>;
}

const paytoPfx = "payto://";

/**
 * Add query parameters to a payto URI
 */
export function addPaytoQueryParams(
  s: string,
  params: { [name: string]: string },
): string {
  const [acct, search] = s.slice(paytoPfx.length).split("?");
  const searchParams = new URLSearchParams(search || "");
  const keys = Object.keys(params);
  if (keys.length === 0) {
    return paytoPfx + acct;
  }
  for (const k of keys) {
    searchParams.set(k, params[k]);
  }
  return paytoPfx + acct + "?" + searchParams.toString();
}

/**
 * Serialize a PaytoURI into a valid payto:// string
 *
 * @param p
 * @returns
 */
export function stringifyPaytoUri(p: PaytoUri): string {
  const url = `${paytoPfx}${p.targetType}/${p.targetPath}`;
  const paramList = !p.params ? [] : Object.entries(p.params);
  if (paramList.length > 0) {
    const search = paramList.map(([key, value]) => `${key}=${value}`).join("&");
    return `${url}?${search}`;
  }
  return url;
}

/**
 * Parse a valid payto:// uri into a PaytoUri object
 * RFC 8905
 *
 * @param s
 * @returns
 */
export function parsePaytoUri(s: string): PaytoUri | undefined {
  if (!s.startsWith(paytoPfx)) {
    return undefined;
  }

  const [acct, search] = s.slice(paytoPfx.length).split("?");

  const firstSlashPos = acct.indexOf("/");

  if (firstSlashPos === -1) {
    return undefined;
  }

  const targetType = acct.slice(0, firstSlashPos);
  const targetPath = acct.slice(firstSlashPos + 1);

  const params: { [k: string]: string } = {};

  const searchParams = new URLSearchParams(search || "");

  searchParams.forEach((v, k) => {
    params[k] = v;
  });

  if (targetType === "x-taler-bank") {
    const parts = targetPath.split("/");
    const host = parts[0];
    const account = parts[1];
    return {
      targetPath,
      targetType,
      params,
      isKnown: true,
      host,
      account,
    };
  }
  if (targetType === "iban") {
    return {
      isKnown: true,
      targetPath,
      targetType,
      params,
      iban: targetPath,
    };
  }
  if (targetType === "bitcoin") {
    const msg = /\b([A-Z0-9]{52})\b/.exec(params["message"]);
    const reserve = !msg ? params["subject"] : msg[0];
    const segwitAddrs = !reserve
      ? []
      : generateFakeSegwitAddress(reserve, targetPath);

    const result: PaytoUriBitcoin = {
      isKnown: true,
      targetPath,
      targetType,
      params,
      segwitAddrs,
    };

    return result;
  }
  return {
    targetPath,
    targetType,
    params,
    isKnown: false,
  };
}
