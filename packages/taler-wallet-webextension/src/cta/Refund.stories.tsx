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

import { Amounts } from "@gnu-taler/taler-util";
import { createExample } from "../test-utils.js";
import { View as TestedComponent } from "./Refund.js";

export default {
  title: "cta/refund",
  component: TestedComponent,
  argTypes: {},
};

export const Complete = createExample(TestedComponent, {
  state: {
    status: "completed",
    amount: Amounts.parseOrThrow("USD:1"),
    granted: Amounts.parseOrThrow("USD:1"),
    hook: undefined,
    merchantName: "the merchant",
    products: undefined,
  },
});

export const InProgress = createExample(TestedComponent, {
  state: {
    status: "in-progress",
    hook: undefined,
    amount: Amounts.parseOrThrow("USD:1"),
    awaitingAmount: Amounts.parseOrThrow("USD:1"),
    granted: Amounts.parseOrThrow("USD:0"),
    merchantName: "the merchant",
    products: undefined,
  },
});

export const Ready = createExample(TestedComponent, {
  state: {
    status: "ready",
    hook: undefined,
    accept: {},
    ignore: {},

    amount: Amounts.parseOrThrow("USD:1"),
    awaitingAmount: Amounts.parseOrThrow("USD:1"),
    granted: Amounts.parseOrThrow("USD:0"),
    merchantName: "the merchant",
    products: [],
    orderId: "abcdef",
  },
});

import beer from "../../static-dev/beer.png";

export const WithAProductList = createExample(TestedComponent, {
  state: {
    status: "ready",
    hook: undefined,
    accept: {},
    ignore: {},
    amount: Amounts.parseOrThrow("USD:1"),
    awaitingAmount: Amounts.parseOrThrow("USD:1"),
    granted: Amounts.parseOrThrow("USD:0"),
    merchantName: "the merchant",
    products: [
      {
        description: "beer",
        image: beer,
        quantity: 2,
      },
      {
        description: "t-shirt",
        price: "EUR:1",
        quantity: 5,
      },
    ],
    orderId: "abcdef",
  },
});

export const Ignored = createExample(TestedComponent, {
  state: {
    status: "ignored",
    hook: undefined,
    merchantName: "the merchant",
  },
});
