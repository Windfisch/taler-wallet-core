import {test} from "ava";
import {mkAmount} from "./types";
import * as wallet from "./wallet";


test("coin selection 1", t => {
  let cds: any = [];
  cds.push({
    coin: {
      currentAmount: mkAmount(1, 0, "EUR"),
    },
    denom: {
      value: mkAmount(1, 0, "EUR"),
      fee_deposit: mkAmount(0, 5, "EUR"),
    },
  });
  cds.push({
    coin: {
      currentAmount: mkAmount(1, 0, "EUR"),
    },
    denom: {
      value: mkAmount(1, 0, "EUR"),
      fee_deposit: mkAmount(0, 0, "EUR"),
    },
  });

  let res = wallet.selectCoins(cds, mkAmount(2,0,"EUR"), mkAmount(0,5,"EUR"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.length == 2);
  t.pass();
});


test("coin selection 2", t => {
  let cds: any = [];
  cds.push({
    coin: {
      currentAmount: mkAmount(1, 0, "EUR"),
    },
    denom: {
      value: mkAmount(1, 0, "EUR"),
      fee_deposit: mkAmount(0, 5, "EUR"),
    },
  });
  cds.push({
    coin: {
      currentAmount: mkAmount(1, 0, "EUR"),
    },
    denom: {
      value: mkAmount(1, 0, "EUR"),
      fee_deposit: mkAmount(0, 0, "EUR"),
    },
  });
  // Merchant covers the fee, this one shouldn't be used
  cds.push({
    coin: {
      currentAmount: mkAmount(1, 0, "EUR"),
    },
    denom: {
      value: mkAmount(1, 0, "EUR"),
      fee_deposit: mkAmount(0, 0, "EUR"),
    },
  });

  let res = wallet.selectCoins(cds, mkAmount(2,0,"EUR"), mkAmount(0,5,"EUR"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.length == 2);
  t.pass();
});


test("coin selection 2", t => {
  let cds: any = [];
  cds.push({
    coin: {
      currentAmount: mkAmount(1, 0, "EUR"),
    },
    denom: {
      value: mkAmount(1, 0, "EUR"),
      fee_deposit: mkAmount(0, 5, "EUR"),
    },
  });
  cds.push({
    coin: {
      currentAmount: mkAmount(1, 0, "EUR"),
    },
    denom: {
      value: mkAmount(1, 0, "EUR"),
      fee_deposit: mkAmount(0, 0, "EUR"),
    },
  });
  cds.push({
    coin: {
      currentAmount: mkAmount(1, 0, "EUR"),
    },
    denom: {
      value: mkAmount(1, 0, "EUR"),
      fee_deposit: mkAmount(0, 0, "EUR"),
    },
  });

  let res = wallet.selectCoins(cds, mkAmount(2,0,"EUR"), mkAmount(0,2,"EUR"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.length == 2);
  t.pass();
});



test("coin selection 3", t => {
  let cds: any = [];
  cds.push({
    coin: {
      currentAmount: mkAmount(1, 0, "EUR"),
    },
    denom: {
      value: mkAmount(1, 0, "EUR"),
      fee_deposit: mkAmount(0, 5, "EUR"),
    },
  });
  cds.push({
    coin: {
      currentAmount: mkAmount(1, 0, "EUR"),
    },
    denom: {
      value: mkAmount(1, 0, "EUR"),
      fee_deposit: mkAmount(0, 0, "EUR"),
    },
  });
  cds.push({
    coin: {
      currentAmount: mkAmount(1, 0, "EUR"),
    },
    denom: {
      value: mkAmount(1, 0, "EUR"),
      fee_deposit: mkAmount(0, 5, "EUR"),
    },
  });

  let res = wallet.selectCoins(cds, mkAmount(2,0,"EUR"), mkAmount(0,2,"EUR"));
  if (!res) {
    t.fail();
    return;
  }
  t.true(res.length == 3);
  t.pass();
});


test("coin selection 3", t => {
  let cds: any = [];
  cds.push({
    coin: {
      currentAmount: mkAmount(1, 0, "EUR"),
    },
    denom: {
      value: mkAmount(1, 0, "EUR"),
      fee_deposit: mkAmount(0, 5, "EUR"),
    },
  });
  cds.push({
    coin: {
      currentAmount: mkAmount(1, 0, "EUR"),
    },
    denom: {
      value: mkAmount(1, 0, "EUR"),
      fee_deposit: mkAmount(0, 0, "EUR"),
    },
  });
  cds.push({
    coin: {
      currentAmount: mkAmount(1, 0, "EUR"),
    },
    denom: {
      value: mkAmount(1, 0, "EUR"),
      fee_deposit: mkAmount(0, 5, "EUR"),
    },
  });

  let res = wallet.selectCoins(cds, mkAmount(4,0,"EUR"), mkAmount(0,2,"EUR"));
  t.true(!res);
  t.pass();

});
