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
import { BalanceView as TestedComponent } from "./BalancePage";

export default {
  title: "popup/balance",
  component: TestedComponent,
  argTypes: {},
};

export const EmptyBalance = createExample(TestedComponent, {
  balances: [],
});

export const SomeCoins = createExample(TestedComponent, {
  balances: [
    {
      available: "USD:10.5",
      hasPendingTransactions: false,
      pendingIncoming: "USD:0",
      pendingOutgoing: "USD:0",
      requiresUserInput: false,
    },
  ],
});

export const SomeCoinsInTreeCurrencies = createExample(TestedComponent, {
  balances: [
    {
      available: "EUR:1",
      hasPendingTransactions: false,
      pendingIncoming: "USD:0",
      pendingOutgoing: "USD:0",
      requiresUserInput: false,
    },
    {
      available: "TESTKUDOS:2000",
      hasPendingTransactions: false,
      pendingIncoming: "USD:0",
      pendingOutgoing: "USD:0",
      requiresUserInput: false,
    },
    {
      available: "JPY:4",
      hasPendingTransactions: false,
      pendingIncoming: "EUR:15",
      pendingOutgoing: "EUR:0",
      requiresUserInput: false,
    },
  ],
});

export const NoCoinsInTreeCurrencies = createExample(TestedComponent, {
  balances: [
    {
      available: "EUR:3",
      hasPendingTransactions: false,
      pendingIncoming: "USD:0",
      pendingOutgoing: "USD:0",
      requiresUserInput: false,
    },
    {
      available: "USD:2",
      hasPendingTransactions: false,
      pendingIncoming: "USD:0",
      pendingOutgoing: "USD:0",
      requiresUserInput: false,
    },
    {
      available: "ARS:1",
      hasPendingTransactions: false,
      pendingIncoming: "EUR:15",
      pendingOutgoing: "EUR:0",
      requiresUserInput: false,
    },
  ],
});

export const SomeCoinsInFiveCurrencies = createExample(TestedComponent, {
  balances: [
    {
      available: "USD:0",
      hasPendingTransactions: false,
      pendingIncoming: "USD:0",
      pendingOutgoing: "USD:0",
      requiresUserInput: false,
    },
    {
      available: "ARS:13451",
      hasPendingTransactions: false,
      pendingIncoming: "USD:0",
      pendingOutgoing: "USD:0",
      requiresUserInput: false,
    },
    {
      available: "EUR:202.02",
      hasPendingTransactions: false,
      pendingIncoming: "EUR:0",
      pendingOutgoing: "EUR:0",
      requiresUserInput: false,
    },
    {
      available: "JPY:0",
      hasPendingTransactions: false,
      pendingIncoming: "EUR:0",
      pendingOutgoing: "EUR:0",
      requiresUserInput: false,
    },
    {
      available: "JPY:51223233",
      hasPendingTransactions: false,
      pendingIncoming: "EUR:0",
      pendingOutgoing: "EUR:0",
      requiresUserInput: false,
    },
    {
      available: "DEMOKUDOS:6",
      hasPendingTransactions: false,
      pendingIncoming: "USD:0",
      pendingOutgoing: "USD:0",
      requiresUserInput: false,
    },
    {
      available: "TESTKUDOS:6",
      hasPendingTransactions: false,
      pendingIncoming: "USD:5",
      pendingOutgoing: "USD:0",
      requiresUserInput: false,
    },
  ],
});
