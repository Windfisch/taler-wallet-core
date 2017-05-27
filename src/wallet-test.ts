import {test} from "ava";
import * as types from "./types";
import * as wallet from "./wallet";

function a(x: string): types.AmountJson {
  let amt = types.Amounts.parse(x);
  if (!amt) {
    throw Error("invalid amount");
  }
  return amt;
}

function fakeCwd(current: string, value: string, feeDeposit: string): wallet.CoinWithDenom {
  return {
    coin: {
      currentAmount: a(current),
      coinPub: "(mock)",
      coinPriv: "(mock)",
      denomPub: "(mock)",
      denomSig: "(mock)",
      exchangeBaseUrl: "(mock)",
      blindingKey: "(mock)",
      reservePub: "(mock)",
      status: types.CoinStatus.Fresh,
    },
    denom: {
      value: a(value),
      feeDeposit: a(feeDeposit),
      denomPub: "(mock)",
      denomPubHash: "(mock)",
      feeWithdraw: a("EUR:0.0"),
      feeRefresh: a("EUR:0.0"),
      feeRefund: a("EUR:0.0"),
      stampStart: "(mock)",
      stampExpireWithdraw: "(mock)",
      stampExpireLegal: "(mock)",
      stampExpireDeposit: "(mock)",
      masterSig: "(mock)",
      status: types.DenominationStatus.VerifiedGood,
      isOffered: true,
      exchangeBaseUrl: "(mock)",
    },
  }
}



test("coin selection 1", t => {
  let cds: wallet.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.1"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.0"),
  ];

  let res = wallet.selectCoins(cds, a("EUR:2.0"), a("EUR:0.1"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.length == 2);
  t.pass();
});


test("coin selection 2", t => {
  let cds: wallet.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.0"),
    // Merchant covers the fee, this one shouldn't be used
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.0"),
  ];
  let res = wallet.selectCoins(cds, a("EUR:2.0"), a("EUR:0.5"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.length == 2);
  t.pass();
});


test("coin selection 3", t => {
  let cds: wallet.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    // this coin should be selected instead of previous one with fee
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.0"),
  ];
  let res = wallet.selectCoins(cds, a("EUR:2.0"), a("EUR:0.5"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.length == 2);
  t.pass();
});



test("coin selection 4", t => {
  let cds: wallet.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
  ];
  let res = wallet.selectCoins(cds, a("EUR:2.0"), a("EUR:0.2"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.length == 3);
  t.pass();
});


test("coin selection 5", t => {
  let cds: wallet.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
  ];
  let res = wallet.selectCoins(cds, a("EUR:4.0"), a("EUR:0.2"));
  t.true(!res);
  t.pass();
});


test("coin selection 6", t => {
  let cds: wallet.CoinWithDenom[] = [
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
    fakeCwd("EUR:1.0", "EUR:1.0", "EUR:0.5"),
  ];
  let res = wallet.selectCoins(cds, a("EUR:2.0"), a("EUR:0.2"));
  t.true(!res);
  t.pass();
});
