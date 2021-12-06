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

import { createExample } from "../test-utils";
import { queryToSlashKeys } from "../utils";
import { ExchangeSetUrlPage as TestedComponent } from "./ExchangeSetUrl";

export default {
  title: "wallet/exchange add/set url",
  component: TestedComponent,
  argTypes: {
    onRetry: { action: "onRetry" },
    onDelete: { action: "onDelete" },
    onBack: { action: "onBack" },
  },
};

export const ExpectedUSD = createExample(TestedComponent, {
  expectedCurrency: "USD",
  onVerify: queryToSlashKeys,
});

export const ExpectedKUDOS = createExample(TestedComponent, {
  expectedCurrency: "KUDOS",
  onVerify: queryToSlashKeys,
});

export const InitialState = createExample(TestedComponent, {
  onVerify: queryToSlashKeys,
});

const knownExchanges = [
  {
    currency: "TESTKUDOS",
    exchangeBaseUrl: "https://exchange.demo.taler.net/",
    tos: {
      currentVersion: "1",
      acceptedVersion: "1",
      content: "content of tos",
      contentType: "text/plain",
    },
    paytoUris: [],
  },
];

export const WithDemoAsKnownExchange = createExample(TestedComponent, {
  onVerify: async (url) => {
    const found =
      knownExchanges.findIndex((e) => e.exchangeBaseUrl === url) !== -1;

    if (found) {
      throw Error("This exchange is already known");
    }
    return queryToSlashKeys(url);
  },
});
