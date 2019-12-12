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

import test from "ava";

import * as dbTypes from "./types/dbTypes";
import * as types from "./types/walletTypes";

import * as wallet from "./wallet";

import { AmountJson } from "./util/amounts";
import * as Amounts from "./util/amounts";
import { selectPayCoins } from "./operations/pay";

function a(x: string): AmountJson {
  const amt = Amounts.parse(x);
  if (!amt) {
    throw Error("invalid amount");
  }
  return amt;
}

function fakeCwd(
  current: string,
  value: string,
  feeDeposit: string,
): types.CoinWithDenom {
  return {
    coin: {
      blindingKey: "(mock)",
      coinPriv: "(mock)",
      coinPub: "(mock)",
      currentAmount: a(current),
      denomPub: "(mock)",
      denomPubHash: "(mock)",
      denomSig: "(mock)",
      exchangeBaseUrl: "(mock)",
      reservePub: "(mock)",
      coinIndex: -1,
      withdrawSessionId: "",
      status: dbTypes.CoinStatus.Fresh,
    },
    denom: {
      denomPub: "(mock)",
      denomPubHash: "(mock)",
      exchangeBaseUrl: "(mock)",
      feeDeposit: a(feeDeposit),
      feeRefresh: a("EUR:0.0"),
      feeRefund: a("EUR:0.0"),
      feeWithdraw: a("EUR:0.0"),
      isOffered: true,
      masterSig: "(mock)",
      stampExpireDeposit: { t_ms: 0 },
      stampExpireLegal: { t_ms: 0 },
      stampExpireWithdraw: { t_ms: 0 },
      stampStart: { t_ms: 0 },
      status: dbTypes.DenominationStatus.VerifiedGood,
      value: a(value),
    },
  };
}

test("coin selection 1", t => {
  const cds: types.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.1"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.0"),
  ];

  const res = selectPayCoins([], cds, a("EUR:2.0"), a("EUR:0.1"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.cds.length === 2);
  t.pass();
});

test("coin selection 2", t => {
  const cds: types.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.0"),
    // Merchant covers the fee, this one shouldn't be used
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.0"),
  ];
  const res = selectPayCoins([], cds, a("EUR:2.0"), a("EUR:0.5"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.cds.length === 2);
  t.pass();
});

test("coin selection 3", t => {
  const cds: types.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    // this coin should be selected instead of previous one with fee
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.0"),
  ];
  const res = selectPayCoins([], cds, a("EUR:2.0"), a("EUR:0.5"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.cds.length === 2);
  t.pass();
});

test("coin selection 4", t => {
  const cds: types.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
  ];
  const res = selectPayCoins([], cds, a("EUR:2.0"), a("EUR:0.2"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.cds.length === 3);
  t.pass();
});

test("coin selection 5", t => {
  const cds: types.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
  ];
  const res = selectPayCoins([], cds, a("EUR:4.0"), a("EUR:0.2"));
  t.true(!res);
  t.pass();
});

test("coin selection 6", t => {
  const cds: types.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
  ];
  const res = selectPayCoins([], cds, a("EUR:2.0"), a("EUR:0.2"));
  t.true(!res);
  t.pass();
});
