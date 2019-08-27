/*
 This file is part of TALER
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

import URI = require("urijs");

export interface PayUriResult {
  downloadUrl: string;
  sessionId?: string;
}

export function parsePayUri(s: string): PayUriResult | undefined {
  const parsedUri = new URI(s);
  if (parsedUri.scheme() === "http" || parsedUri.scheme() === "https") {
    return {
      downloadUrl: s,
      sessionId: undefined,
    };
  }
  if (parsedUri.scheme() != "taler") {
    return undefined;
  }
  if (parsedUri.authority() != "pay") {
    return undefined;
  }

  let [
    _,
    host,
    maybePath,
    maybeInstance,
    orderId,
    maybeSessionid,
  ] = parsedUri.path().split("/");

  if (!host) {
    return undefined;
  }

  if (!maybePath) {
    return undefined;
  }

  if (!orderId) {
    return undefined;
  }

  if (maybePath === "-") {
    maybePath = "public/proposal";
  } else {
    maybePath = decodeURIComponent(maybePath);
  }
  if (maybeInstance === "-") {
    maybeInstance = "default";
  }

  const downloadUrl = new URI(
    "https://" + host + "/" + decodeURIComponent(maybePath),
  ).addQuery({ instance: maybeInstance, order_id: orderId }).href();

  return {
    downloadUrl,
    sessionId: maybeSessionid,
  }
}
