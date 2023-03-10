/*
 This file is part of GNU Taler
 (C) 2019-2020 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { BackupRecovery } from "./backup-types.js";
import { canonicalizeBaseUrl } from "./helpers.js";
import { initNodePrng } from "./prng-node.js";
import { URLSearchParams, URL } from "./url.js";

export interface PayUriResult {
  merchantBaseUrl: string;
  orderId: string;
  sessionId: string;
  claimToken: string | undefined;
  noncePriv: string | undefined;
}

export interface WithdrawUriResult {
  bankIntegrationApiBaseUrl: string;
  withdrawalOperationId: string;
}

export interface RefundUriResult {
  merchantBaseUrl: string;
  orderId: string;
}

export interface TipUriResult {
  merchantTipId: string;
  merchantBaseUrl: string;
}

export interface PayPushUriResult {
  exchangeBaseUrl: string;
  contractPriv: string;
}

export interface PayPullUriResult {
  exchangeBaseUrl: string;
  contractPriv: string;
}

export interface DevExperimentUri {
  devExperimentId: string;
}

/**
 * Parse a taler[+http]://withdraw URI.
 * Return undefined if not passed a valid URI.
 */
export function parseWithdrawUri(s: string): WithdrawUriResult | undefined {
  const pi = parseProtoInfo(s, "withdraw");
  if (!pi) {
    return undefined;
  }
  const parts = pi.rest.split("/");

  if (parts.length < 2) {
    return undefined;
  }

  const host = parts[0].toLowerCase();
  const pathSegments = parts.slice(1, parts.length - 1);
  /**
   * The statement below does not tolerate a slash-ended URI.
   * This results in (1) the withdrawalId being passed as the
   * empty string, and (2) the bankIntegrationApi ending with the
   * actual withdrawal operation ID.  That can be fixed by
   * trimming the parts-list.  FIXME
   */
  const withdrawId = parts[parts.length - 1];
  const p = [host, ...pathSegments].join("/");

  return {
    bankIntegrationApiBaseUrl: canonicalizeBaseUrl(`${pi.innerProto}://${p}/`),
    withdrawalOperationId: withdrawId,
  };
}

export enum TalerUriType {
  TalerPay = "taler-pay",
  TalerWithdraw = "taler-withdraw",
  TalerTip = "taler-tip",
  TalerRefund = "taler-refund",
  TalerPayPush = "taler-pay-push",
  TalerPayPull = "taler-pay-pull",
  TalerRecovery = "taler-recovery",
  TalerDevExperiment = "taler-dev-experiment",
  Unknown = "unknown",
}

const talerActionPayPull = "pay-pull";
const talerActionPayPush = "pay-push";

/**
 * Classify a taler:// URI.
 */
export function classifyTalerUri(s: string): TalerUriType {
  const sl = s.toLowerCase();
  if (sl.startsWith("taler://recovery/")) {
    return TalerUriType.TalerRecovery;
  }
  if (sl.startsWith("taler+http://recovery/")) {
    return TalerUriType.TalerRecovery;
  }
  if (sl.startsWith("taler://pay/")) {
    return TalerUriType.TalerPay;
  }
  if (sl.startsWith("taler+http://pay/")) {
    return TalerUriType.TalerPay;
  }
  if (sl.startsWith("taler://tip/")) {
    return TalerUriType.TalerTip;
  }
  if (sl.startsWith("taler+http://tip/")) {
    return TalerUriType.TalerTip;
  }
  if (sl.startsWith("taler://refund/")) {
    return TalerUriType.TalerRefund;
  }
  if (sl.startsWith("taler+http://refund/")) {
    return TalerUriType.TalerRefund;
  }
  if (sl.startsWith("taler://withdraw/")) {
    return TalerUriType.TalerWithdraw;
  }
  if (sl.startsWith("taler+http://withdraw/")) {
    return TalerUriType.TalerWithdraw;
  }
  if (sl.startsWith(`taler://${talerActionPayPush}/`)) {
    return TalerUriType.TalerPayPush;
  }
  if (sl.startsWith(`taler+http://${talerActionPayPush}/`)) {
    return TalerUriType.TalerPayPush;
  }
  if (sl.startsWith(`taler://${talerActionPayPull}/`)) {
    return TalerUriType.TalerPayPull;
  }
  if (sl.startsWith(`taler+http://${talerActionPayPull}/`)) {
    return TalerUriType.TalerPayPull;
  }
  if (sl.startsWith("taler://dev-experiment/")) {
    return TalerUriType.TalerDevExperiment;
  }
  return TalerUriType.Unknown;
}

interface TalerUriProtoInfo {
  innerProto: "http" | "https";
  rest: string;
}

function parseProtoInfo(
  s: string,
  action: string,
): TalerUriProtoInfo | undefined {
  const pfxPlain = `taler://${action}/`;
  const pfxHttp = `taler+http://${action}/`;
  if (s.toLowerCase().startsWith(pfxPlain)) {
    return {
      innerProto: "https",
      rest: s.substring(pfxPlain.length),
    };
  } else if (s.toLowerCase().startsWith(pfxHttp)) {
    return {
      innerProto: "http",
      rest: s.substring(pfxHttp.length),
    };
  } else {
    return undefined;
  }
}

/**
 * Parse a taler[+http]://pay URI.
 * Return undefined if not passed a valid URI.
 */
export function parsePayUri(s: string): PayUriResult | undefined {
  const pi = parseProtoInfo(s, "pay");
  if (!pi) {
    return undefined;
  }
  const c = pi?.rest.split("?");
  const q = new URLSearchParams(c[1] ?? "");
  const claimToken = q.get("c") ?? undefined;
  const noncePriv = q.get("n") ?? undefined;
  const parts = c[0].split("/");
  if (parts.length < 3) {
    return undefined;
  }
  const host = parts[0].toLowerCase();
  const sessionId = parts[parts.length - 1];
  const orderId = parts[parts.length - 2];
  const pathSegments = parts.slice(1, parts.length - 2);
  const p = [host, ...pathSegments].join("/");
  const merchantBaseUrl = canonicalizeBaseUrl(`${pi.innerProto}://${p}/`);

  return {
    merchantBaseUrl,
    orderId,
    sessionId: sessionId,
    claimToken,
    noncePriv,
  };
}

export function constructPayUri(
  merchantBaseUrl: string,
  orderId: string,
  sessionId: string,
  claimToken?: string,
  noncePriv?: string,
): string {
  const base = canonicalizeBaseUrl(merchantBaseUrl);
  const url = new URL(base);
  const isHttp = base.startsWith("http://");
  let result = isHttp ? `taler+http://pay/` : `taler://pay/`;
  result += `${url.hostname}${url.pathname}${orderId}/${sessionId}?`;
  if (claimToken) result += `c=${claimToken}`;
  if (noncePriv) result += `n=${noncePriv}`;
  return result;
}

export function parsePayPushUri(s: string): PayPushUriResult | undefined {
  const pi = parseProtoInfo(s, talerActionPayPush);
  if (!pi) {
    return undefined;
  }
  const c = pi?.rest.split("?");
  const parts = c[0].split("/");
  if (parts.length < 2) {
    return undefined;
  }
  const host = parts[0].toLowerCase();
  const contractPriv = parts[parts.length - 1];
  const pathSegments = parts.slice(1, parts.length - 1);
  const p = [host, ...pathSegments].join("/");
  const exchangeBaseUrl = canonicalizeBaseUrl(`${pi.innerProto}://${p}/`);

  return {
    exchangeBaseUrl,
    contractPriv,
  };
}

export function parsePayPullUri(s: string): PayPullUriResult | undefined {
  const pi = parseProtoInfo(s, talerActionPayPull);
  if (!pi) {
    return undefined;
  }
  const c = pi?.rest.split("?");
  const parts = c[0].split("/");
  if (parts.length < 2) {
    return undefined;
  }
  const host = parts[0].toLowerCase();
  const contractPriv = parts[parts.length - 1];
  const pathSegments = parts.slice(1, parts.length - 1);
  const p = [host, ...pathSegments].join("/");
  const exchangeBaseUrl = canonicalizeBaseUrl(`${pi.innerProto}://${p}/`);

  return {
    exchangeBaseUrl,
    contractPriv,
  };
}

/**
 * Parse a taler[+http]://tip URI.
 * Return undefined if not passed a valid URI.
 */
export function parseTipUri(s: string): TipUriResult | undefined {
  const pi = parseProtoInfo(s, "tip");
  if (!pi) {
    return undefined;
  }
  const c = pi?.rest.split("?");
  const parts = c[0].split("/");
  if (parts.length < 2) {
    return undefined;
  }
  const host = parts[0].toLowerCase();
  const tipId = parts[parts.length - 1];
  const pathSegments = parts.slice(1, parts.length - 1);
  const p = [host, ...pathSegments].join("/");
  const merchantBaseUrl = canonicalizeBaseUrl(`${pi.innerProto}://${p}/`);

  return {
    merchantBaseUrl,
    merchantTipId: tipId,
  };
}

/**
 * Parse a taler[+http]://refund URI.
 * Return undefined if not passed a valid URI.
 */
export function parseRefundUri(s: string): RefundUriResult | undefined {
  const pi = parseProtoInfo(s, "refund");
  if (!pi) {
    return undefined;
  }
  const c = pi?.rest.split("?");
  const parts = c[0].split("/");
  if (parts.length < 3) {
    return undefined;
  }
  const host = parts[0].toLowerCase();
  const sessionId = parts[parts.length - 1];
  const orderId = parts[parts.length - 2];
  const pathSegments = parts.slice(1, parts.length - 2);
  const p = [host, ...pathSegments].join("/");
  const merchantBaseUrl = canonicalizeBaseUrl(`${pi.innerProto}://${p}/`);

  return {
    merchantBaseUrl,
    orderId,
  };
}

export function parseDevExperimentUri(s: string): DevExperimentUri | undefined {
  const pi = parseProtoInfo(s, "dev-experiment");
  const c = pi?.rest.split("?");
  if (!c) {
    return undefined;
  }
  // const q = new URLSearchParams(c[1] ?? "");
  const parts = c[0].split("/");
  return {
    devExperimentId: parts[0],
  };
}

export function constructPayPushUri(args: {
  exchangeBaseUrl: string;
  contractPriv: string;
}): string {
  const url = new URL(args.exchangeBaseUrl);
  let proto: string;
  if (url.protocol === "https:") {
    proto = "taler";
  } else if (url.protocol === "http:") {
    proto = "taler+http";
  } else {
    throw Error(`Unsupported exchange URL protocol ${args.exchangeBaseUrl}`);
  }
  if (!url.pathname.endsWith("/")) {
    throw Error(
      `exchange base URL must end with a slash (got ${args.exchangeBaseUrl}instead)`,
    );
  }
  return `${proto}://pay-push/${url.host}${url.pathname}${args.contractPriv}`;
}

export function constructPayPullUri(args: {
  exchangeBaseUrl: string;
  contractPriv: string;
}): string {
  const url = new URL(args.exchangeBaseUrl);
  let proto: string;
  if (url.protocol === "https:") {
    proto = "taler";
  } else if (url.protocol === "http:") {
    proto = "taler+http";
  } else {
    throw Error(`Unsupported exchange URL protocol ${args.exchangeBaseUrl}`);
  }
  if (!url.pathname.endsWith("/")) {
    throw Error(
      `exchange base URL must end with a slash (got ${args.exchangeBaseUrl}instead)`,
    );
  }
  return `${proto}://pay-pull/${url.host}${url.pathname}${args.contractPriv}`;
}

export function constructRecoveryUri(args: BackupRecovery): string {
  const key = args.walletRootPriv;
  //FIXME: name may contain non valid characters
  const urls = args.providers
    .map((p) => `${p.name}=${canonicalizeBaseUrl(p.url)}`)
    .join("&");

  return `taler://recovery/${key}?${urls}`;
}
export function parseRecoveryUri(uri: string): BackupRecovery | undefined {
  const pi = parseProtoInfo(uri, "recovery");
  if (!pi) {
    return undefined;
  }
  const idx = pi.rest.indexOf("?");
  if (idx === -1) {
    return undefined;
  }
  const path = pi.rest.slice(0, idx);
  const params = pi.rest.slice(idx + 1);
  if (!path || !params) {
    return undefined;
  }
  const parts = path.split("/");
  const walletRootPriv = parts[0];
  if (!walletRootPriv) return undefined;
  const providers = new Array<{ name: string; url: string }>();
  const args = params.split("&");
  for (const param in args) {
    const eq = args[param].indexOf("=");
    if (eq === -1) return undefined;
    const name = args[param].slice(0, eq);
    const url = args[param].slice(eq + 1);
    providers.push({ name, url });
  }
  return { walletRootPriv, providers };
}
