/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

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
import { BankApi, WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { defaultCoinConfig } from "../harness/denomStructures.js";
import {
  getWireMethodForTest,
  GlobalTestState,
  MerchantPrivateApi,
  WalletCli,
} from "../harness/harness.js";
import {
  createSimpleTestkudosEnvironment,
  withdrawViaBank,
  makeTestPayment,
} from "../harness/helpers.js";

/**
 * Run test for basic, bank-integrated withdrawal and payment.
 */
export async function runAgeRestrictionsMerchantTest(t: GlobalTestState) {
  // Set up test environment

  const {
    wallet: walletOne,
    bank,
    exchange,
    merchant,
    exchangeBankAccount,
  } = await createSimpleTestkudosEnvironment(
    t,
    defaultCoinConfig.map((x) => x("TESTKUDOS")),
    {
      ageMaskSpec: "8:10:12:14:16:18:21",
    },
  );

  const walletTwo = new WalletCli(t, "walletTwo");
  const walletThree = new WalletCli(t, "walletThree");

  {
    const walletZero = new WalletCli(t, "walletZero");

    await withdrawViaBank(t, {
      wallet: walletZero,
      bank,
      exchange,
      amount: "TESTKUDOS:20",
      restrictAge: 13,
    });

    const order = {
      summary: "Buy me!",
      amount: "TESTKUDOS:5",
      fulfillment_url: "taler://fulfillment-success/thx",
      minimum_age: 9,
    };

    await makeTestPayment(t, { wallet: walletZero, merchant, order });
    await walletZero.runUntilDone();
  }

  {
    const wallet = walletOne;

    await withdrawViaBank(t, {
      wallet,
      bank,
      exchange,
      amount: "TESTKUDOS:20",
      restrictAge: 13,
    });

    const order = {
      summary: "Buy me!",
      amount: "TESTKUDOS:5",
      fulfillment_url: "taler://fulfillment-success/thx",
      minimum_age: 9,
    };

    await makeTestPayment(t, { wallet, merchant, order });
    await wallet.runUntilDone();
  }

  {
    const wallet = walletTwo;

    await withdrawViaBank(t, {
      wallet,
      bank,
      exchange,
      amount: "TESTKUDOS:20",
      restrictAge: 13,
    });

    const order = {
      summary: "Buy me!",
      amount: "TESTKUDOS:5",
      fulfillment_url: "taler://fulfillment-success/thx",
    };

    await makeTestPayment(t, { wallet, merchant, order });
    await wallet.runUntilDone();
  }

  {
    const wallet = walletThree;

    await withdrawViaBank(t, {
      wallet,
      bank,
      exchange,
      amount: "TESTKUDOS:20",
    });

    const order = {
      summary: "Buy me!",
      amount: "TESTKUDOS:5",
      fulfillment_url: "taler://fulfillment-success/thx",
      minimum_age: 9,
    };

    await makeTestPayment(t, { wallet, merchant, order });
    await wallet.runUntilDone();
  }

  // Pay with coin from tipping
  {
    const mbu = await BankApi.createRandomBankUser(bank);
    const tipReserveResp = await MerchantPrivateApi.createTippingReserve(
      merchant,
      "default",
      {
        exchange_url: exchange.baseUrl,
        initial_balance: "TESTKUDOS:10",
        wire_method: getWireMethodForTest(),
      },
    );

    t.assertDeepEqual(
      tipReserveResp.payto_uri,
      exchangeBankAccount.accountPaytoUri,
    );

    await BankApi.adminAddIncoming(bank, {
      amount: "TESTKUDOS:10",
      debitAccountPayto: mbu.accountPaytoUri,
      exchangeBankAccount,
      reservePub: tipReserveResp.reserve_pub,
    });

    await exchange.runWirewatchOnce();

    const tip = await MerchantPrivateApi.giveTip(merchant, "default", {
      amount: "TESTKUDOS:5",
      justification: "why not?",
      next_url: "https://example.com/after-tip",
    });

    const walletTipping = new WalletCli(t, "age-tipping");

    const ptr = await walletTipping.client.call(WalletApiOperation.PrepareTip, {
      talerTipUri: tip.taler_tip_uri,
    });

    await walletTipping.client.call(WalletApiOperation.AcceptTip, {
      walletTipId: ptr.walletTipId,
    });

    await walletTipping.runUntilDone();

    const order = {
      summary: "Buy me!",
      amount: "TESTKUDOS:4",
      fulfillment_url: "taler://fulfillment-success/thx",
      minimum_age: 9,
    };

    await makeTestPayment(t, { wallet: walletTipping, merchant, order });
    await walletTipping.runUntilDone();
  }
}

runAgeRestrictionsMerchantTest.suites = ["wallet"];
runAgeRestrictionsMerchantTest.timeoutMs = 120 * 1000;
