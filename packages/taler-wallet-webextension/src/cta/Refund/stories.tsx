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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { Amounts } from "@gnu-taler/taler-util";
import beer from "../../../static-dev/beer.png";
import { createExample } from "../../test-utils.js";
import { IgnoredView, InProgressView, ReadyView } from "./views.js";
export default {
  title: "refund",
};

export const InProgress = createExample(InProgressView, {
  status: "in-progress",
  error: undefined,
  amount: Amounts.parseOrThrow("USD:1"),
  awaitingAmount: Amounts.parseOrThrow("USD:1"),
  granted: Amounts.parseOrThrow("USD:0"),
  merchantName: "the merchant",
  products: undefined,
});

export const Ready = createExample(ReadyView, {
  status: "ready",
  error: undefined,
  accept: {},
  ignore: {},

  amount: Amounts.parseOrThrow("USD:1"),
  awaitingAmount: Amounts.parseOrThrow("USD:1"),
  granted: Amounts.parseOrThrow("USD:0"),
  merchantName: "the merchant",
  products: [],
  orderId: "abcdef",
});

export const WithAProductList = createExample(ReadyView, {
  status: "ready",
  error: undefined,
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
});

export const Ignored = createExample(IgnoredView, {
  status: "ignored",
  error: undefined,
  merchantName: "the merchant",
});
