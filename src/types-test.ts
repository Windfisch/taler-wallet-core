/*
 This file is part of TALER
 (C) 2017 Inria and GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import {test} from "ava";
import {Amounts} from "./types";
import * as types from "./types";

const amt = (value: number, fraction: number, currency: string): types.AmountJson => ({value, fraction, currency});

test("amount addition (simple)", (t) => {
  const a1 = amt(1, 0, "EUR");
  const a2 = amt(1, 0, "EUR");
  const a3 = amt(2, 0, "EUR");
  t.true(0 === types.Amounts.cmp(Amounts.add(a1, a2).amount, a3));
  t.pass();
});

test("amount addition (saturation)", (t) => {
  const a1 = amt(1, 0, "EUR");
  const res = Amounts.add(Amounts.getMaxAmount("EUR"), a1);
  t.true(res.saturated);
  t.pass();
});

test("amount subtraction (simple)", (t) => {
  const a1 = amt(2, 5, "EUR");
  const a2 = amt(1, 0, "EUR");
  const a3 = amt(1, 5, "EUR");
  t.true(0 === types.Amounts.cmp(Amounts.sub(a1, a2).amount, a3));
  t.pass();
});

test("amount subtraction (saturation)", (t) => {
  const a1 = amt(0, 0, "EUR");
  const a2 = amt(1, 0, "EUR");
  let res = Amounts.sub(a1, a2);
  t.true(res.saturated);
  res = Amounts.sub(a1, a1);
  t.true(!res.saturated);
  t.pass();
});


test("contract validation", (t) => {
  const c = {
    H_wire: "123",
    amount: amt(1, 2, "EUR"),
    auditors: [],
    exchanges: [{master_pub: "foo", url: "foo"}],
    fulfillment_url: "foo",
    max_fee: amt(1, 2, "EUR"),
    merchant_pub: "12345",
    order_id: "test_order",
    pay_deadline: "Date(12346)",
    pay_url: "https://example.com/pay",
    products: [],
    refund_deadline: "Date(12345)",
    summary: "hello",
    timestamp: "Date(12345)",
    wire_method: "test",
  };

  types.Contract.checked(c);

  const c1 = JSON.parse(JSON.stringify(c));
  c1.exchanges = [];

  try {
    types.Contract.checked(c1);
  } catch (e) {
    t.pass();
    return;
  }

  t.fail();
});
