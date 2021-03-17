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
 * Imports.
 */
import { AmountJson, Amounts } from "@gnu-taler/taler-util";
import test from "ava";
import { AvailableCoinInfo, selectPayCoins } from "./coinSelection";

function a(x: string): AmountJson {
  const amt = Amounts.parse(x);
  if (!amt) {
    throw Error("invalid amount");
  }
  return amt;
}

function fakeAci(current: string, feeDeposit: string): AvailableCoinInfo {
  return {
    availableAmount: a(current),
    coinPub: "foobar",
    denomPub: "foobar",
    feeDeposit: a(feeDeposit),
    exchangeBaseUrl: "https://example.com/",
  };
}

test("coin selection 1", (t) => {
  const acis: AvailableCoinInfo[] = [
    fakeAci("EUR:1.0", "EUR:0.1"),
    fakeAci("EUR:1.0", "EUR:0.0"),
  ];

  const res = selectPayCoins({
    candidates: {
      candidateCoins: acis,
      wireFeesPerExchange: {},
    },
    contractTermsAmount: a("EUR:2.0"),
    depositFeeLimit: a("EUR:0.1"),
    wireFeeLimit: a("EUR:0"),
    wireFeeAmortization: 1,
  });

  if (!res) {
    t.fail();
    return;
  }
  t.true(res.coinPubs.length === 2);
  t.pass();
});

test("coin selection 2", (t) => {
  const acis: AvailableCoinInfo[] = [
    fakeAci("EUR:1.0", "EUR:0.5"),
    fakeAci("EUR:1.0", "EUR:0.0"),
    // Merchant covers the fee, this one shouldn't be used
    fakeAci("EUR:1.0", "EUR:0.0"),
  ];

  const res = selectPayCoins({
    candidates: {
      candidateCoins: acis,
      wireFeesPerExchange: {},
    },
    contractTermsAmount: a("EUR:2.0"),
    depositFeeLimit: a("EUR:0.5"),
    wireFeeLimit: a("EUR:0"),
    wireFeeAmortization: 1,
  });

  if (!res) {
    t.fail();
    return;
  }
  t.true(res.coinPubs.length === 2);
  t.pass();
});

test("coin selection 3", (t) => {
  const acis: AvailableCoinInfo[] = [
    fakeAci("EUR:1.0", "EUR:0.5"),
    fakeAci("EUR:1.0", "EUR:0.5"),
    // this coin should be selected instead of previous one with fee
    fakeAci("EUR:1.0", "EUR:0.0"),
  ];

  const res = selectPayCoins({
    candidates: {
      candidateCoins: acis,
      wireFeesPerExchange: {},
    },
    contractTermsAmount: a("EUR:2.0"),
    depositFeeLimit: a("EUR:0.5"),
    wireFeeLimit: a("EUR:0"),
    wireFeeAmortization: 1,
  });

  if (!res) {
    t.fail();
    return;
  }
  t.true(res.coinPubs.length === 2);
  t.pass();
});

test("coin selection 4", (t) => {
  const acis: AvailableCoinInfo[] = [
    fakeAci("EUR:1.0", "EUR:0.5"),
    fakeAci("EUR:1.0", "EUR:0.5"),
    fakeAci("EUR:1.0", "EUR:0.5"),
  ];

  const res = selectPayCoins({
    candidates: {
      candidateCoins: acis,
      wireFeesPerExchange: {},
    },
    contractTermsAmount: a("EUR:2.0"),
    depositFeeLimit: a("EUR:0.5"),
    wireFeeLimit: a("EUR:0"),
    wireFeeAmortization: 1,
  });

  if (!res) {
    t.fail();
    return;
  }
  t.true(res.coinPubs.length === 3);
  t.pass();
});

test("coin selection 5", (t) => {
  const acis: AvailableCoinInfo[] = [
    fakeAci("EUR:1.0", "EUR:0.5"),
    fakeAci("EUR:1.0", "EUR:0.5"),
    fakeAci("EUR:1.0", "EUR:0.5"),
  ];

  const res = selectPayCoins({
    candidates: {
      candidateCoins: acis,
      wireFeesPerExchange: {},
    },
    contractTermsAmount: a("EUR:4.0"),
    depositFeeLimit: a("EUR:0.2"),
    wireFeeLimit: a("EUR:0"),
    wireFeeAmortization: 1,
  });

  t.true(!res);
  t.pass();
});

test("coin selection 6", (t) => {
  const acis: AvailableCoinInfo[] = [
    fakeAci("EUR:1.0", "EUR:0.5"),
    fakeAci("EUR:1.0", "EUR:0.5"),
  ];
  const res = selectPayCoins({
    candidates: {
      candidateCoins: acis,
      wireFeesPerExchange: {},
    },
    contractTermsAmount: a("EUR:2.0"),
    depositFeeLimit: a("EUR:0.2"),
    wireFeeLimit: a("EUR:0"),
    wireFeeAmortization: 1,
  });
  t.true(!res);
  t.pass();
});
