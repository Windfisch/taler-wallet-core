/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { canonicalizeBaseUrl } from "@gnu-taler/taler-util";

/**
 * Validate (the number part of) an amount.  If needed,
 * replace comma with a dot.  Returns 'false' whenever
 * the input is invalid, the valid amount otherwise.
 */
const amountRegex = /^[0-9]+(.[0-9]+)?$/;
export function validateAmount(
  maybeAmount: string | undefined,
): string | undefined {
  if (!maybeAmount || !amountRegex.test(maybeAmount)) {
    return;
  }
  return maybeAmount;
}

/**
 * Extract IBAN from a Payto URI.
 */
export function getIbanFromPayto(url: string): string {
  const pathSplit = new URL(url).pathname.split("/");
  let lastIndex = pathSplit.length - 1;
  // Happens if the path ends with "/".
  if (pathSplit[lastIndex] === "") lastIndex--;
  const iban = pathSplit[lastIndex];
  return iban;
}

const maybeRootPath = "https://bank.demo.taler.net/demobanks/default/";

export function getBankBackendBaseUrl(): string {
  const overrideUrl = localStorage.getItem("bank-base-url");
  return canonicalizeBaseUrl(overrideUrl ? overrideUrl : maybeRootPath);
}

export function undefinedIfEmpty<T extends object>(obj: T): T | undefined {
  return Object.keys(obj).some((k) => (obj as any)[k] !== undefined)
    ? obj
    : undefined;
}

/**
 * Craft headers with Authorization and Content-Type.
 */
export function prepareHeaders(username?: string, password?: string): Headers {
  const headers = new Headers();
  if (username && password) {
    headers.append(
      "Authorization",
      `Basic ${window.btoa(`${username}:${password}`)}`,
    );
  }
  headers.append("Content-Type", "application/json");
  return headers;
}
