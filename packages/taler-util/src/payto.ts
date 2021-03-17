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

import { URLSearchParams } from "./url.js";

interface PaytoUri {
  targetType: string;
  targetPath: string;
  params: { [name: string]: string };
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
  for (const k of Object.keys(params)) {
    searchParams.set(k, params[k]);
  }
  return paytoPfx + acct + "?" + searchParams.toString();
}

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
    params[v] = k;
  });

  return {
    targetPath,
    targetType,
    params,
  };
}
