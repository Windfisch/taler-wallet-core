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

// tslint:disable:max-line-length

import test from "ava";

import {
  DenominationRecord,
  DenominationStatus,
  ReserveRecord,
} from "../dbTypes";

import { CryptoApi } from "./cryptoApi";

const masterPub1: string = "CQQZ9DY3MZ1ARMN5K1VKDETS04Y2QCKMMCFHZSWJWWVN82BTTH00";

const denomValid1: DenominationRecord = {
  denomPub: "51R7ARKCD5HJTTV5F4G0M818E9SP280A40G2GVH04CR30GHS84R3JHHP6GSM2D9Q6514CGT568R32C9J6CWM4DSH64TM4DSM851K0CA48CVKAC1P6H144C2160T46DHK8CVM4HJ274S38C1M6S338D9N6GWM8DT684T3JCT36S13EC9G88R3EGHQ8S0KJGSQ60SKGD216N33AGJ2651K2E9S60TMCD1N75244HHQ6X33EDJ570R3GGJ2651MACA38D130DA560VK4HHJ68WK2CA26GW3ECSH6D13EC9S88VK2GT66WVK8D9G750K0D9R8RRK4DHQ71332GHK8D23GE26710M2H9K6WVK8HJ38MVKEGA66N23AC9H88VKACT58MV3CCSJ6H1K4DT38GRK0C9M8N33CE1R60V4AHA38H1KECSH6S33JH9N8GRKGH1K68S36GH354520818CMG26C1H60R30C935452081918G2J2G0",
  denomPubHash: "dummy",
  exchangeBaseUrl: "https://exchange.example.com/",
  feeDeposit: {
    currency: "PUDOS",
    fraction: 10000,
    value: 0,
  },
  feeRefresh: {
    currency: "PUDOS",
    fraction: 10000,
    value: 0,
  },
  feeRefund: {
    currency: "PUDOS",
    fraction: 10000,
    value: 0,
  },
  feeWithdraw: {
    currency: "PUDOS",
    fraction: 10000,
    value: 0,
  },
  isOffered: true,
  masterSig: "CJFJCQ48Q45PSGJ5KY94N6M2TPARESM2E15BSPBD95YVVPEARAEQ6V6G4Z2XBMS0QM0F3Y9EYVP276FCS90EQ1578ZC8JHFBZ3NGP3G",
  stampExpireDeposit: "/Date(1851580381)/",
  stampExpireLegal: "/Date(1567756381)/",
  stampExpireWithdraw: "/Date(2482300381)/",
  stampStart: "/Date(1473148381)/",
  status: DenominationStatus.Unverified,
  value: {
    currency: "PUDOS",
    fraction: 100000,
    value: 0,
  },
};

const denomInvalid1 = JSON.parse(JSON.stringify(denomValid1));
denomInvalid1.value.value += 1;

test("string hashing", async (t) => {
  const crypto = new CryptoApi();
  const s = await crypto.hashString("hello taler");
  const sh = "8RDMADB3YNF3QZBS3V467YZVJAMC2QAQX0TZGVZ6Q5PFRRAJFT70HHN0QF661QR9QWKYMMC7YEMPD679D2RADXCYK8Y669A2A5MKQFR";
  t.true(s === sh);
  t.pass();
});

test("precoin creation", async (t) => {
  const crypto = new CryptoApi();
  const {priv, pub} = await crypto.createEddsaKeypair();
  const r: ReserveRecord = {
    created: 0,
    current_amount: null,
    exchange_base_url: "https://example.com/exchange",
    hasPayback: false,
    precoin_amount: {currency: "PUDOS", value: 0, fraction: 0},
    requested_amount: {currency: "PUDOS", value: 0, fraction: 0},
    reserve_priv: priv,
    reserve_pub: pub,
    timestamp_confirmed: 0,
    timestamp_depleted: 0,
  };

  const precoin = await crypto.createPreCoin(denomValid1, r);
  t.truthy(precoin);
  t.pass();
});

test("denom validation", async (t) => {
  const crypto = new CryptoApi();
  let v: boolean;
  v = await crypto.isValidDenom(denomValid1, masterPub1);
  t.true(v);
  v = await crypto.isValidDenom(denomInvalid1, masterPub1);
  t.true(!v);
  t.pass();
});
