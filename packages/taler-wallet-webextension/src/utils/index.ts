/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import {
  AmountJson,
  Amounts,
  GetExchangeTosResult,
} from "@gnu-taler/taler-util";

function getJsonIfOk(r: Response): Promise<any> {
  if (r.ok) {
    return r.json();
  }

  if (r.status >= 400 && r.status < 500) {
    throw new Error(`URL may not be right: (${r.status}) ${r.statusText}`);
  }

  throw new Error(
    `Try another server: (${r.status}) ${
      r.statusText || "internal server error"
    }`,
  );
}

export async function queryToSlashConfig<T>(url: string): Promise<T> {
  return fetch(new URL("config", url).href)
    .catch(() => {
      throw new Error(`Network error`);
    })
    .then(getJsonIfOk);
}

function timeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `Timeout: the query took longer than ${Math.floor(ms / 1000)} secs`,
        ),
      );
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((reason) => {
        clearTimeout(timer);
        reject(reason);
      });
  });
}

export async function queryToSlashKeys<T>(url: string): Promise<T> {
  const endpoint = new URL("keys", url);
  endpoint.searchParams.set("cacheBreaker", new Date().getTime() + "");

  const query = fetch(endpoint.href)
    .catch(() => {
      throw new Error(`Network error`);
    })
    .then(getJsonIfOk);

  return timeout(3000, query);
}

export function buildTermsOfServiceState(
  tos: GetExchangeTosResult,
): TermsState {
  const content: TermsDocument | undefined = parseTermsOfServiceContent(
    tos.contentType,
    tos.content,
  );

  const status: TermsStatus = buildTermsOfServiceStatus(
    tos.content,
    tos.acceptedEtag,
    tos.currentEtag,
  );

  return { content, status, version: tos.currentEtag };
}
export function buildTermsOfServiceStatus(
  content: string | undefined,
  acceptedVersion: string | undefined,
  currentVersion: string | undefined,
): TermsStatus {
  return !content
    ? "notfound"
    : !acceptedVersion
    ? "new"
    : acceptedVersion !== currentVersion
    ? "changed"
    : "accepted";
}

function parseTermsOfServiceContent(
  type: string,
  text: string,
): TermsDocument | undefined {
  if (type === "text/xml") {
    try {
      const document = new DOMParser().parseFromString(text, "text/xml");
      return { type: "xml", document };
    } catch (e) {
      console.log(e);
    }
  } else if (type === "text/html") {
    try {
      const href = new URL(text);
      return { type: "html", href };
    } catch (e) {
      console.log(e);
    }
  } else if (type === "text/json") {
    try {
      const data = JSON.parse(text);
      return { type: "json", data };
    } catch (e) {
      console.log(e);
    }
  } else if (type === "text/pdf") {
    try {
      const location = new URL(text);
      return { type: "pdf", location };
    } catch (e) {
      console.log(e);
    }
  } else if (type === "text/plain") {
    try {
      const content = text;
      return { type: "plain", content };
    } catch (e) {
      console.log(e);
    }
  }
  return undefined;
}

export type TermsState = {
  content: TermsDocument | undefined;
  status: TermsStatus;
  version: string;
};

type TermsStatus = "new" | "accepted" | "changed" | "notfound";

type TermsDocument =
  | TermsDocumentXml
  | TermsDocumentHtml
  | TermsDocumentPlain
  | TermsDocumentJson
  | TermsDocumentPdf;

export interface TermsDocumentXml {
  type: "xml";
  document: Document;
}

export interface TermsDocumentHtml {
  type: "html";
  href: URL;
}

export interface TermsDocumentPlain {
  type: "plain";
  content: string;
}

export interface TermsDocumentJson {
  type: "json";
  data: any;
}

export interface TermsDocumentPdf {
  type: "pdf";
  location: URL;
}
