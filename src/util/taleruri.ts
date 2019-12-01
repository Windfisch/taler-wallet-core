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
  merchantTipId: string;
  merchantOrigin: string;
  merchantBaseUrl: string;
}

export function parseWithdrawUri(s: string): WithdrawUriResult | undefined {
  const pfx = "taler://withdraw/";
  if (!s.startsWith(pfx)) {
    return undefined;
  }

  const rest = s.substring(pfx.length);

  let [host, path, withdrawId] = rest.split("/");

  if (path === "-") {
    path = "api/withdraw-operation";
  }

  return {
    statusUrl: `https://${host}/${path}/${withdrawId}`,
  };
}

export function parsePayUri(s: string): PayUriResult | undefined {
  if (s.startsWith("https://") || s.startsWith("http://")) {
    return {
      downloadUrl: s,
      sessionId: undefined,
    };
  }
  const pfx = "taler://pay/";
  if (!s.startsWith(pfx)) {
    return undefined;
  }

  const [path, search] = s.slice(pfx.length).split("?");

  let [host, maybePath, maybeInstance, orderId, maybeSessionid] = path.split(
    "/",
  );

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
    maybePath = "public/";
  } else {
    maybePath = decodeURIComponent(maybePath) + "/";
  }
  let maybeInstancePath = "";
  if (maybeInstance !== "-") {
    maybeInstancePath = `instances/${maybeInstance}/`;
  }

  let protocol = "https";
  const searchParams = new URLSearchParams(search);
  if (searchParams.get("insecure") === "1") {
    protocol = "http";
  }

  const downloadUrl =
    `${protocol}://${host}/` +
    decodeURIComponent(maybePath) +
    maybeInstancePath +
    `proposal?order_id=${orderId}`;

  return {
    downloadUrl,
    sessionId: maybeSessionid,
  };
}

export function parseTipUri(s: string): TipUriResult | undefined {
  const pfx = "taler://tip/";
  if (!s.startsWith(pfx)) {
    return undefined;
  }

  const path = s.slice(pfx.length);

  let [host, maybePath, maybeInstance, tipId] = path.split("/");

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
    maybePath = "public/";
  } else {
    maybePath = decodeURIComponent(maybePath) + "/";
  }
  let maybeInstancePath = "";
  if (maybeInstance !== "-") {
    maybeInstancePath = `instances/${maybeInstance}/`;
  }

  const merchantBaseUrl = `https://${host}/${maybePath}${maybeInstancePath}`;

  return {
    merchantTipId: tipId,
    merchantOrigin: new URL(merchantBaseUrl).origin,
    merchantBaseUrl,
  };
}

export function parseRefundUri(s: string): RefundUriResult | undefined {
  const pfx = "taler://refund/";

  if (!s.startsWith(pfx)) {
    return undefined;
  }

  const path = s.slice(pfx.length);

  let [host, maybePath, maybeInstance, orderId] = path.split("/");

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
    maybePath = "public/";
  } else {
    maybePath = decodeURIComponent(maybePath) + "/";
  }
  let maybeInstancePath = "";
  if (maybeInstance !== "-") {
    maybeInstancePath = `instances/${maybeInstance}/`;
  }

  const refundUrl =
    "https://" +
    host +
    "/" +
    maybePath +
    maybeInstancePath +
    "refund" +
    "?order_id=" +
    orderId;

  return {
    refundUrl,
  };
}
