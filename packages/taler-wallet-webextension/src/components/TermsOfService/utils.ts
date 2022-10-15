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

import { ExchangeTosStatus, GetExchangeTosResult } from "@gnu-taler/taler-util";

export function buildTermsOfServiceState(
  tos: GetExchangeTosResult,
): TermsState {
  const content: TermsDocument | undefined = parseTermsOfServiceContent(
    tos.contentType,
    tos.content,
  );

  return { content, status: tos.tosStatus, version: tos.currentEtag };
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
  status: ExchangeTosStatus;
  version: string;
};

export type TermsDocument =
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
