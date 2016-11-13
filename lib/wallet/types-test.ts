import {test, TestLib} from "testlib/talertest";
import {Amounts} from "./types";
import * as types from "./types";

let amt = (value: number, fraction: number, currency: string): types.AmountJson => ({value, fraction, currency});

test("amount addition (simple)", (t: TestLib) => {
  let a1 = amt(1,0,"EUR");
  let a2 = amt(1,0,"EUR");
  let a3 = amt(2,0,"EUR");
  t.assert(0 == types.Amounts.cmp(Amounts.add(a1, a2).amount, a3));
  t.pass();
});

test("amount addition (saturation)", (t: TestLib) => {
  let a1 = amt(1,0,"EUR");
  let res = Amounts.add(Amounts.getMaxAmount("EUR"), a1);
  t.assert(res.saturated);
  t.pass();
});

test("amount subtraction (simple)", (t: TestLib) => {
  let a1 = amt(2,5,"EUR");
  let a2 = amt(1,0,"EUR");
  let a3 = amt(1,5,"EUR");
  t.assert(0 == types.Amounts.cmp(Amounts.sub(a1, a2).amount, a3));
  t.pass();
});

test("amount subtraction (saturation)", (t: TestLib) => {
  let a1 = amt(0,0,"EUR");
  let a2 = amt(1,0,"EUR");
  let res = Amounts.sub(a1, a2);
  t.assert(res.saturated);
  res = Amounts.sub(a1, a1);
  t.assert(!res.saturated);
  t.pass();
});
