import {CryptoApi} from "./cryptoApi";
import {ReserveRecord, Denomination} from "src/types";
import {test, TestLib} from "testlib/talertest";

let masterPub1: string = "CQQZ9DY3MZ1ARMN5K1VKDETS04Y2QCKMMCFHZSWJWWVN82BTTH00";

let denomValid1: Denomination = {
  "master_sig": "CJFJCQ48Q45PSGJ5KY94N6M2TPARESM2E15BSPBD95YVVPEARAEQ6V6G4Z2XBMS0QM0F3Y9EYVP276FCS90EQ1578ZC8JHFBZ3NGP3G",
  "stamp_start": "/Date(1473148381)/",
  "stamp_expire_withdraw": "/Date(2482300381)/",
  "stamp_expire_deposit": "/Date(1851580381)/",
  "denom_pub": "51R7ARKCD5HJTTV5F4G0M818E9SP280A40G2GVH04CR30GHS84R3JHHP6GSM2D9Q6514CGT568R32C9J6CWM4DSH64TM4DSM851K0CA48CVKAC1P6H144C2160T46DHK8CVM4HJ274S38C1M6S338D9N6GWM8DT684T3JCT36S13EC9G88R3EGHQ8S0KJGSQ60SKGD216N33AGJ2651K2E9S60TMCD1N75244HHQ6X33EDJ570R3GGJ2651MACA38D130DA560VK4HHJ68WK2CA26GW3ECSH6D13EC9S88VK2GT66WVK8D9G750K0D9R8RRK4DHQ71332GHK8D23GE26710M2H9K6WVK8HJ38MVKEGA66N23AC9H88VKACT58MV3CCSJ6H1K4DT38GRK0C9M8N33CE1R60V4AHA38H1KECSH6S33JH9N8GRKGH1K68S36GH354520818CMG26C1H60R30C935452081918G2J2G0",
  "stamp_expire_legal": "/Date(1567756381)/",
  "value": {
    "currency": "PUDOS",
    "value": 0,
    "fraction": 100000
  },
  "fee_withdraw": {
    "currency": "PUDOS",
    "value": 0,
    "fraction": 10000
  },
  "fee_deposit": {
    "currency": "PUDOS",
    "value": 0,
    "fraction": 10000
  },
  "fee_refresh": {
    "currency": "PUDOS",
    "value": 0,
    "fraction": 10000
  },
  "fee_refund": {
    "currency": "PUDOS",
    "value": 0,
    "fraction": 10000
  }
};

let denomInvalid1 = JSON.parse(JSON.stringify(denomValid1));
denomInvalid1.value.value += 1;

test("string hashing", async (t: TestLib) => {
  let crypto = new CryptoApi();
  let s = await crypto.hashString("hello taler");
  let sh = "8RDMADB3YNF3QZBS3V467YZVJAMC2QAQX0TZGVZ6Q5PFRRAJFT70HHN0QF661QR9QWKYMMC7YEMPD679D2RADXCYK8Y669A2A5MKQFR";
  t.assert(s == sh);
  t.pass();
});

test("precoin creation", async (t: TestLib) => {
  let crypto = new CryptoApi();
  let {priv, pub} = await crypto.createEddsaKeypair();
  let r: ReserveRecord = {
    reserve_pub: pub,
    reserve_priv: priv,
    exchange_base_url: "https://example.com/exchange",
    created: 0,
    requested_amount: {currency: "PUDOS", value: 0, fraction: 0},
    precoin_amount: {currency: "PUDOS", value: 0, fraction: 0},
    current_amount: null,
    confirmed: false,
    last_query: null,
  };

  let precoin = await crypto.createPreCoin(denomValid1, r);
  t.pass();
});

test("denom validation", async (t: TestLib) => {
  let crypto = new CryptoApi();
  let v: boolean;
  v = await crypto.isValidDenom(denomValid1, masterPub1);
  t.assert(v);
  v = await crypto.isValidDenom(denomInvalid1, masterPub1);
  t.assert(!v);
  t.pass();
});
