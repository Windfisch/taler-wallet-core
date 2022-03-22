/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems S.A.

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
import { CoinConfig, defaultCoinConfig } from "../harness/denomStructures.js";
import { GlobalTestState } from "../harness/harness.js";
import {
  createSimpleTestkudosEnvironment,
  withdrawViaBank,
  makeTestPayment,
} from "../harness/helpers.js";

/**
 * Run test for basic, bank-integrated withdrawal and payment.
 */
export async function runClauseSchnorrTest(t: GlobalTestState) {
  // Set up test environment

  const coinConfig: CoinConfig[] = defaultCoinConfig.map((x) => {
    return {
      ...x("TESTKUDOS"),
      cipher: "CS",
    };
  });

  // We need to have at least one RSA denom configured
  coinConfig.push({
    cipher: "RSA",
    rsaKeySize: 1024,
    durationLegal: "3 years",
    durationSpend: "2 years",
    durationWithdraw: "7 days",
    feeDeposit: "TESTKUDOS:42",
    value: "TESTKUDOS:0.0001",
    feeWithdraw: "TESTKUDOS:42",
    feeRefresh: "TESTKUDOS:42",
    feeRefund: "TESTKUDOS:42",
    name: "rsa_dummy",
  });

  const { wallet, bank, exchange, merchant } =
    await createSimpleTestkudosEnvironment(t, coinConfig);

  // Withdraw digital cash into the wallet.

  await withdrawViaBank(t, { wallet, bank, exchange, amount: "TESTKUDOS:20" });

  const order = {
    summary: "Buy me!",
    amount: "TESTKUDOS:5",
    fulfillment_url: "taler://fulfillment-success/thx",
  };

  await makeTestPayment(t, { wallet, merchant, order });
  await wallet.runUntilDone();

  // Test JSON normalization of contract terms: Does the wallet
  // agree with the merchant?
  const order2 = {
    summary: "Testing “unicode” characters",
    amount: "TESTKUDOS:5",
    fulfillment_url: "taler://fulfillment-success/thx",
  };

  await makeTestPayment(t, { wallet, merchant, order: order2 });
  await wallet.runUntilDone();

  // Test JSON normalization of contract terms: Does the wallet
  // agree with the merchant?
  const order3 = {
    summary: "Testing\nNewlines\rAnd\tStuff\nHere\b",
    amount: "TESTKUDOS:5",
    fulfillment_url: "taler://fulfillment-success/thx",
  };

  await makeTestPayment(t, { wallet, merchant, order: order3 });

  await wallet.runUntilDone();
}

runClauseSchnorrTest.suites = ["wallet"];
runClauseSchnorrTest.excludeByDefault = true;
