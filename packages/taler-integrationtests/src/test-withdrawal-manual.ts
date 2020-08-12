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
import { runTest, GlobalTestState } from "./harness";
import { createSimpleTestkudosEnvironment } from "./helpers";
import { CoreApiResponse } from "taler-wallet-core/lib/walletCoreApiHandler";
import { codecForBalancesResponse } from "taler-wallet-core";

/**
 * Run test for basic, bank-integrated withdrawal.
 */
runTest(async (t: GlobalTestState) => {
  // Set up test environment

  const {
    wallet,
    bank,
    exchange,
    exchangeBankAccount,
  } = await createSimpleTestkudosEnvironment(t);

  // Create a withdrawal operation

  const user = await bank.createRandomBankUser();

  let wresp: CoreApiResponse;

  wresp = await wallet.apiRequest("addExchange", {
    exchangeBaseUrl: exchange.baseUrl,
  });

  t.assertTrue(wresp.type === "response");

  wresp = await wallet.apiRequest("acceptManualWithdrawal", {
    exchangeBaseUrl: exchange.baseUrl,
    amount: "TESTKUDOS:10",
  });

  t.assertTrue(wresp.type === "response");

  const reservePub: string = (wresp.result as any).reservePub;

  await bank.adminAddIncoming({
    exchangeBankAccount,
    amount: "TESTKUDOS:10",
    debitAccountPayto: user.accountPaytoUri,
    reservePub: reservePub,
  });

  await exchange.runWirewatchOnce();

  await wallet.runUntilDone();

  // Check balance

  const balApiResp = await wallet.apiRequest("getBalances", {});
  t.assertTrue(balApiResp.type === "response");
  const balResp = codecForBalancesResponse().decode(balApiResp.result);
  t.assertAmountEquals("TESTKUDOS:9.72", balResp.balances[0].available);

  await t.shutdown();
});
