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
import { defaultCoinConfig } from "../harness/denomStructures.js";
import { GlobalTestState, WalletCli } from "../harness/harness.js";
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

  const { wallet: walletOne, bank, exchange, merchant } =
    await createSimpleTestkudosEnvironment(
      t,
      defaultCoinConfig.map((x) => x("TESTKUDOS")),
      {
        ageMaskSpec: "8:10:12:14:16:18:21",
      },
    );

  const walletTwo = new WalletCli(t, "walletTwo");
  const walletThree = new WalletCli(t, "walletThree");

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

}

runAgeRestrictionsMerchantTest.suites = ["wallet"];
