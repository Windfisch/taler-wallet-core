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
import { string } from "prop-types";

export interface PayUriResult {
  downloadUrl: string;
  sessionId?: string;
}

export interface WithdrawUriResult {
  statusUrl: string;
}

export interface RefundUriResult {
  refundUrl: string;
}

export interface TipUriResult {
  tipPickupUrl: string;
  tipId: string;
  merchantInstance: string;
  merchantOrigin: string;
}

export function parseWithdrawUri(s: string): WithdrawUriResult | undefined {
  const parsedUri = new URI(s);
  if (parsedUri.scheme() !== "taler") {
    return undefined;
  }
  if (parsedUri.authority() != "withdraw") {
    return undefined;
  }

  let [host, path, withdrawId] = parsedUri.segmentCoded();

  if (path === "-") {
    path = "/api/withdraw-operation";
  }

  return {
    statusUrl: new URI({ protocol: "https", hostname: host, path: path })
      .segmentCoded(withdrawId)
      .href(),
  };
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
    maybePath = "";
  } else {
    maybePath = decodeURIComponent(maybePath) + "/";
  }
  let maybeInstancePath = "";
  if (maybeInstance !== "-") {
    maybeInstancePath = `instances/${maybeInstance}/`;
  }

  const downloadUrl = new URI(
    "https://" + host + "/" + decodeURIComponent(maybePath) + maybeInstancePath + "public/proposal",
  )
    .addQuery({ order_id: orderId })
    .href();

  return {
    downloadUrl,
    sessionId: maybeSessionid,
  };
}

export function parseTipUri(s: string): TipUriResult | undefined {
  const parsedUri = new URI(s);
  if (parsedUri.scheme() != "taler") {
    return undefined;
  }
  if (parsedUri.authority() != "tip") {
    return undefined;
  }

  let [_, host, maybePath, maybeInstance, tipId] = parsedUri.path().split("/");

  if (!host) {
    return undefined;
  }

  if (!maybePath) {
    return undefined;
  }

  if (!tipId) {
    return undefined;
  }

  if (maybePath === "-") {
    maybePath = "public/tip-pickup";
  } else {
    maybePath = decodeURIComponent(maybePath);
  }
  if (maybeInstance === "-") {
    maybeInstance = "default";
  }

  const tipPickupUrl = new URI(
    "https://" + host + "/" + decodeURIComponent(maybePath),
  ).href();

  return {
    tipPickupUrl,
    tipId: tipId,
    merchantInstance: maybeInstance,
    merchantOrigin: new URI(tipPickupUrl).origin(),
  };
}

export function parseRefundUri(s: string): RefundUriResult | undefined {
  const parsedUri = new URI(s);
  if (parsedUri.scheme() != "taler") {
    return undefined;
  }
  if (parsedUri.authority() != "refund") {
    return undefined;
  }

  let [
    _,
    host,
    maybePath,
    maybeInstance,
    orderId,
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
    maybePath = "public/refund";
  } else {
    maybePath = decodeURIComponent(maybePath);
  }
  if (maybeInstance === "-") {
    maybeInstance = "default";
  }

  const refundUrl = new URI(
    "https://" + host + "/" + decodeURIComponent(maybePath),
  )
    .addQuery({ instance: maybeInstance, order_id: orderId })
    .href();

  return {
    refundUrl,
  };
}
