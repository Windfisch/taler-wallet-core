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

import { termsXml } from "../cta/termsExample.js";
import { createExample } from "../test-utils.js";
import { View as TestedComponent } from "./ExchangeAddConfirm.js";

function parseFromString(s: string): Document {
  if (typeof window === "undefined") {
    return {
      querySelector: () => ({
        children: [],
      }),
    } as any;
  }
  return new window.DOMParser().parseFromString(s, "text/xml");
}

export default {
  title: "wallet/exchange add/confirm",
  component: TestedComponent,
  argTypes: {
    onRetry: { action: "onRetry" },
    onDelete: { action: "onDelete" },
    onBack: { action: "onBack" },
  },
};

export const TermsNotFound = createExample(TestedComponent, {
  url: "https://exchange.demo.taler.net/",
  terms: {
    status: "notfound",
    version: "1",
    content: undefined,
  },
  onAccept: async () => undefined,
});

export const NewTerms = createExample(TestedComponent, {
  url: "https://exchange.demo.taler.net/",
  terms: {
    status: "new",
    version: "1",
    content: undefined,
  },
  onAccept: async () => undefined,
});

export const TermsChanged = createExample(TestedComponent, {
  url: "https://exchange.demo.taler.net/",
  terms: {
    status: "changed",
    version: "1",
    content: {
      type: "xml",
      document: parseFromString(termsXml),
    },
  },
  onAccept: async () => undefined,
});
