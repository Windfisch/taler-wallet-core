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

import { test } from "ava";
import * as Amounts from "./amounts";
import { ContractTerms } from "./talerTypes";

const amt = (value: number, fraction: number, currency: string): Amounts.AmountJson => ({value, fraction, currency});

test("amount addition (simple)", (t) => {
  const a1 = amt(1, 0, "EUR");
  const a2 = amt(1, 0, "EUR");
  const a3 = amt(2, 0, "EUR");
  t.true(0 === Amounts.cmp(Amounts.add(a1, a2).amount, a3));
  t.pass();
});

test("amount addition (saturation)", (t) => {
  const a1 = amt(1, 0, "EUR");
  const res = Amounts.add(amt(Amounts.maxAmountValue, 0, "EUR"), a1);
  t.true(res.saturated);
  t.pass();
});

test("amount subtraction (simple)", (t) => {
  const a1 = amt(2, 5, "EUR");
  const a2 = amt(1, 0, "EUR");
  const a3 = amt(1, 5, "EUR");
  t.true(0 === Amounts.cmp(Amounts.sub(a1, a2).amount, a3));
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


test("amount comparison", (t) => {
  t.is(Amounts.cmp(amt(1, 0, "EUR"), amt(1, 0, "EUR")), 0);
  t.is(Amounts.cmp(amt(1, 1, "EUR"), amt(1, 0, "EUR")), 1);
  t.is(Amounts.cmp(amt(1, 1, "EUR"), amt(1, 2, "EUR")), -1);
  t.is(Amounts.cmp(amt(1, 0, "EUR"), amt(0, 0, "EUR")), 1);
  t.is(Amounts.cmp(amt(0, 0, "EUR"), amt(1, 0, "EUR")), -1);
  t.is(Amounts.cmp(amt(1, 0, "EUR"), amt(0, 100000000, "EUR")), 0);
  t.throws(() => Amounts.cmp(amt(1, 0, "FOO"), amt(1, 0, "BAR")));
  t.pass();
});


test("amount parsing", (t) => {
  t.is(Amounts.cmp(Amounts.parseOrThrow("TESTKUDOS:0"),
                   amt(0, 0, "TESTKUDOS")), 0);
  t.is(Amounts.cmp(Amounts.parseOrThrow("TESTKUDOS:10"),
                   amt(10, 0, "TESTKUDOS")), 0);
  t.is(Amounts.cmp(Amounts.parseOrThrow("TESTKUDOS:0.1"),
                   amt(0, 10000000, "TESTKUDOS")), 0);
  t.is(Amounts.cmp(Amounts.parseOrThrow("TESTKUDOS:0.00000001"),
                   amt(0, 1, "TESTKUDOS")), 0);
  t.is(Amounts.cmp(Amounts.parseOrThrow("TESTKUDOS:4503599627370496.99999999"),
                   amt(4503599627370496, 99999999, "TESTKUDOS")), 0);
  t.throws(() => Amounts.parseOrThrow("foo:"));
  t.throws(() => Amounts.parseOrThrow("1.0"));
  t.throws(() => Amounts.parseOrThrow("42"));
  t.throws(() => Amounts.parseOrThrow(":1.0"));
  t.throws(() => Amounts.parseOrThrow(":42"));
  t.throws(() => Amounts.parseOrThrow("EUR:.42"));
  t.throws(() => Amounts.parseOrThrow("EUR:42."));
  t.throws(() => Amounts.parseOrThrow("TESTKUDOS:4503599627370497.99999999"));
  t.is(Amounts.cmp(Amounts.parseOrThrow("TESTKUDOS:0.99999999"),
                   amt(0, 99999999, "TESTKUDOS")), 0);
  t.throws(() => Amounts.parseOrThrow("TESTKUDOS:0.999999991"));
  t.pass();
});


test("amount stringification", (t) => {
  t.is(Amounts.toString(amt(0, 0, "TESTKUDOS")), "TESTKUDOS:0");
  t.is(Amounts.toString(amt(4, 94000000, "TESTKUDOS")), "TESTKUDOS:4.94");
  t.is(Amounts.toString(amt(0, 10000000, "TESTKUDOS")), "TESTKUDOS:0.1");
  t.is(Amounts.toString(amt(0, 1, "TESTKUDOS")), "TESTKUDOS:0.00000001");
  t.is(Amounts.toString(amt(5, 0, "TESTKUDOS")), "TESTKUDOS:5");
  // denormalized
  t.is(Amounts.toString(amt(1, 100000000, "TESTKUDOS")), "TESTKUDOS:2");
  t.pass();
});


test("contract terms validation", (t) => {
  const c = {
    H_wire: "123",
    amount: "EUR:1.5",
    auditors: [],
    exchanges: [{master_pub: "foo", url: "foo"}],
    fulfillment_url: "foo",
    max_fee: "EUR:1.5",
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

  ContractTerms.checked(c);

  const c1 = JSON.parse(JSON.stringify(c));
  c1.exchanges = [];

  try {
    ContractTerms.checked(c1);
  } catch (e) {
    t.pass();
    return;
  }

  t.fail();
});
