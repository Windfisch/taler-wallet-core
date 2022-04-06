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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { amountFractionalBase, ExchangeListItem } from "@gnu-taler/taler-util";
import { createExample } from "../test-utils.js";
import { termsHtml, termsPdf, termsPlain, termsXml } from "./termsExample.js";
import { View as TestedComponent } from "./Withdraw.js";

function parseFromString(s: string): Document {
  if (typeof window === "undefined") {
    return {} as Document;
  }
  return new window.DOMParser().parseFromString(s, "text/xml");
}

export default {
  title: "cta/withdraw",
  component: TestedComponent,
};

const exchangeList: ExchangeListItem[] = [
  {
    currency: "USD",
    exchangeBaseUrl: "exchange.demo.taler.net",
    tos: {
      currentVersion: "1",
      acceptedVersion: "1",
      content: "terms of service content",
      contentType: "text/plain",
    },
    paytoUris: ["asd"],
  },
  {
    currency: "USD",
    exchangeBaseUrl: "exchange.test.taler.net",
    tos: {
      currentVersion: "1",
      acceptedVersion: "1",
      content: "terms of service content",
      contentType: "text/plain",
    },
    paytoUris: ["asd"],
  },
];

export const NewTerms = createExample(TestedComponent, {
  knownExchanges: exchangeList,
  exchangeBaseUrl: "exchange.demo.taler.net",
  withdrawalFee: {
    currency: "USD",
    fraction: 0,
    value: 1,
  },
  amount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },

  onSwitchExchange: async () => {
    null;
  },
  terms: {
    content: {
      type: "xml",
      document: parseFromString(termsXml),
    },
    status: "new",
    version: "",
  },
});

export const TermsReviewingPLAIN = createExample(TestedComponent, {
  knownExchanges: exchangeList,
  exchangeBaseUrl: "exchange.demo.taler.net",
  withdrawalFee: {
    currency: "USD",
    fraction: 0,
    value: 0,
  },
  amount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },

  onSwitchExchange: async () => {
    null;
  },
  terms: {
    content: {
      type: "plain",
      content: termsPlain,
    },
    status: "new",
    version: "",
  },
  reviewing: true,
});

export const TermsReviewingHTML = createExample(TestedComponent, {
  knownExchanges: exchangeList,
  exchangeBaseUrl: "exchange.demo.taler.net",
  withdrawalFee: {
    currency: "USD",
    fraction: 0,
    value: 0,
  },
  amount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },

  onSwitchExchange: async () => {
    null;
  },
  terms: {
    content: {
      type: "html",
      href: new URL(`data:text/html;base64,${toBase64(termsHtml)}`),
    },
    version: "",
    status: "new",
  },
  reviewing: true,
});

function toBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    }),
  );
}

export const TermsReviewingPDF = createExample(TestedComponent, {
  knownExchanges: exchangeList,
  exchangeBaseUrl: "exchange.demo.taler.net",
  withdrawalFee: {
    currency: "USD",
    fraction: 0,
    value: 0,
  },
  amount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },

  onSwitchExchange: async () => {
    null;
  },
  terms: {
    content: {
      type: "pdf",
      location: new URL(`data:text/html;base64,${toBase64(termsPdf)}`),
    },
    status: "new",
    version: "",
  },
  reviewing: true,
});

export const TermsReviewingXML = createExample(TestedComponent, {
  knownExchanges: exchangeList,
  exchangeBaseUrl: "exchange.demo.taler.net",
  withdrawalFee: {
    currency: "USD",
    fraction: 0,
    value: 0,
  },
  amount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },

  onSwitchExchange: async () => {
    null;
  },
  terms: {
    content: {
      type: "xml",
      document: parseFromString(termsXml),
    },
    status: "new",
    version: "",
  },
  reviewing: true,
});

export const NewTermsAccepted = createExample(TestedComponent, {
  knownExchanges: exchangeList,
  exchangeBaseUrl: "exchange.demo.taler.net",
  withdrawalFee: {
    currency: "USD",
    fraction: 0,
    value: 0,
  },
  amount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },
  onSwitchExchange: async () => {
    null;
  },
  terms: {
    content: {
      type: "xml",
      document: parseFromString(termsXml),
    },
    status: "new",
    version: "",
  },
  reviewed: true,
});

export const TermsShowAgainXML = createExample(TestedComponent, {
  knownExchanges: exchangeList,
  exchangeBaseUrl: "exchange.demo.taler.net",
  withdrawalFee: {
    currency: "USD",
    fraction: 0,
    value: 0,
  },
  amount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },

  onSwitchExchange: async () => {
    null;
  },
  terms: {
    content: {
      type: "xml",
      document: parseFromString(termsXml),
    },
    version: "",
    status: "new",
  },
  reviewed: true,
  reviewing: true,
});

export const TermsChanged = createExample(TestedComponent, {
  knownExchanges: exchangeList,
  exchangeBaseUrl: "exchange.demo.taler.net",
  withdrawalFee: {
    currency: "USD",
    fraction: 0,
    value: 0,
  },
  amount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },

  onSwitchExchange: async () => {
    null;
  },
  terms: {
    content: {
      type: "xml",
      document: parseFromString(termsXml),
    },
    version: "",
    status: "changed",
  },
});

export const TermsNotFound = createExample(TestedComponent, {
  knownExchanges: exchangeList,
  exchangeBaseUrl: "exchange.demo.taler.net",
  withdrawalFee: {
    currency: "USD",
    fraction: 0,
    value: 0,
  },
  amount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },

  onSwitchExchange: async () => {
    null;
  },
  terms: {
    content: undefined,
    status: "notfound",
    version: "",
  },
});

export const TermsAlreadyAccepted = createExample(TestedComponent, {
  knownExchanges: exchangeList,
  exchangeBaseUrl: "exchange.demo.taler.net",
  withdrawalFee: {
    currency: "USD",
    fraction: amountFractionalBase * 0.5,
    value: 0,
  },
  amount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },

  onSwitchExchange: async () => {
    null;
  },
  terms: {
    status: "accepted",
    content: undefined,
    version: "",
  },
});

export const WithoutFee = createExample(TestedComponent, {
  knownExchanges: exchangeList,
  exchangeBaseUrl: "exchange.demo.taler.net",
  withdrawalFee: {
    currency: "USD",
    fraction: 0,
    value: 0,
  },
  amount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },

  onSwitchExchange: async () => {
    null;
  },
  terms: {
    content: {
      type: "xml",
      document: parseFromString(termsXml),
    },
    status: "accepted",
    version: "",
  },
});
