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
 * Integration test for the wallet testing functionality used by the exchange
 * test cases.
 */

/**
 * Imports.
 */
import { runTest, GlobalTestState } from "./harness";
import { createSimpleTestkudosEnvironment, withdrawViaBank } from "./helpers";

/**
 * Run test for basic, bank-integrated withdrawal.
 */
runTest(async (t: GlobalTestState) => {
  const {
    wallet,
    bank,
    exchange,
    merchant,
  } = await createSimpleTestkudosEnvironment(t);

  await wallet.runIntegrationtest({
    amountToSpend: "TESTKUDOS:5",
    amountToWithdraw: "TESTKUDOS:10",
    bankBaseUrl: bank.baseUrl,
    exchangeBaseUrl: exchange.baseUrl,
    merchantApiKey: "sandbox",
    merchantBaseUrl: merchant.makeInstanceBaseUrl(),
  });

  let txns = await wallet.getTransactions();
  console.log(JSON.stringify(txns, undefined, 2));
  let txTypes = txns.transactions.map((x) => x.type);

  t.assertDeepEqual(txTypes, [
    "withdrawal",
    "payment",
    "withdrawal",
    "payment",
    "refund",
    "payment",
  ]);

  wallet.deleteDatabase();

  await wallet.withdrawTestBalance({
    amount: "TESTKUDOS:10",
    bankBaseUrl: bank.baseUrl,
    exchangeBaseUrl: exchange.baseUrl,
  });

  await wallet.runUntilDone();

  await wallet.testPay({
    amount: "TESTKUDOS:5",
    merchantApiKey: "sandbox",
    merchantBaseUrl: merchant.makeInstanceBaseUrl(),
    summary: "foo",
  });

  await wallet.runUntilDone();

  txns = await wallet.getTransactions();
  console.log(JSON.stringify(txns, undefined, 2));
  txTypes = txns.transactions.map((x) => x.type);

  t.assertDeepEqual(txTypes, [
    "withdrawal",
    "payment",
  ]);

  await t.shutdown();
});
