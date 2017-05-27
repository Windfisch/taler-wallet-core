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
import * as types from "./types";
import * as wallet from "./wallet";


function a(x: string): types.AmountJson {
  const amt = types.Amounts.parse(x);
  if (!amt) {
    throw Error("invalid amount");
  }
  return amt;
}


function fakeCwd(current: string, value: string, feeDeposit: string): wallet.CoinWithDenom {
  return {
    coin: {
      blindingKey: "(mock)",
      coinPriv: "(mock)",
      coinPub: "(mock)",
      currentAmount: a(current),
      denomPub: "(mock)",
      denomSig: "(mock)",
      exchangeBaseUrl: "(mock)",
      reservePub: "(mock)",
      status: types.CoinStatus.Fresh,
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
      stampExpireDeposit: "(mock)",
      stampExpireLegal: "(mock)",
      stampExpireWithdraw: "(mock)",
      stampStart: "(mock)",
      status: types.DenominationStatus.VerifiedGood,
      value: a(value),
    },
  };
}


test("coin selection 1", (t) => {
  const cds: wallet.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.1"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.0"),
  ];

  const res = wallet.selectCoins(cds, a("EUR:2.0"), a("EUR:0.1"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.length === 2);
  t.pass();
});


test("coin selection 2", (t) => {
  const cds: wallet.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.0"),
    // Merchant covers the fee, this one shouldn't be used
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.0"),
  ];
  const res = wallet.selectCoins(cds, a("EUR:2.0"), a("EUR:0.5"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.length === 2);
  t.pass();
});


test("coin selection 3", (t) => {
  const cds: wallet.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    // this coin should be selected instead of previous one with fee
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.0"),
  ];
  const res = wallet.selectCoins(cds, a("EUR:2.0"), a("EUR:0.5"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.length === 2);
  t.pass();
});


test("coin selection 4", (t) => {
  const cds: wallet.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
  ];
  const res = wallet.selectCoins(cds, a("EUR:2.0"), a("EUR:0.2"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.length === 3);
  t.pass();
});


test("coin selection 5", (t) => {
  const cds: wallet.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
  ];
  const res = wallet.selectCoins(cds, a("EUR:4.0"), a("EUR:0.2"));
  t.true(!res);
  t.pass();
});


test("coin selection 6", (t) => {
  const cds: wallet.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
  ];
  const res = wallet.selectCoins(cds, a("EUR:2.0"), a("EUR:0.2"));
  t.true(!res);
  t.pass();
});
