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
import {
  runTest,
  GlobalTestState,
  WalletCli,
  setupDb,
  BankService,
  ExchangeService,
  MerchantService,
  defaultCoinConfig,
} from "./harness";
import { createSimpleTestkudosEnvironment, withdrawViaBank } from "./helpers";
import {
  PreparePayResultType,
  ExchangesListRespose,
  URL,
} from "taler-wallet-core";
import {
  FaultInjectedExchangeService,
  FaultInjectionResponseContext,
} from "./faultInjection";

/**
 * Test if the wallet handles outdated exchange versions correct.y
 */
runTest(async (t: GlobalTestState) => {
  // Set up test environment

  const db = await setupDb(t);

  const bank = await BankService.create(t, {
    allowRegistrations: true,
    currency: "TESTKUDOS",
    database: db.connStr,
    httpPort: 8082,
  });

  const exchange = ExchangeService.create(t, {
    name: "testexchange-1",
    currency: "TESTKUDOS",
    httpPort: 8081,
    database: db.connStr,
  });

  const merchant = await MerchantService.create(t, {
    name: "testmerchant-1",
    currency: "TESTKUDOS",
    httpPort: 8083,
    database: db.connStr,
  });

  const exchangeBankAccount = await bank.createExchangeAccount(
    "MyExchange",
    "x",
  );
  exchange.addBankAccount("1", exchangeBankAccount);

  const faultyExchange = new FaultInjectedExchangeService(t, exchange, 8091);

  bank.setSuggestedExchange(
    faultyExchange,
    exchangeBankAccount.accountPaytoUri,
  );

  await bank.start();

  await bank.pingUntilAvailable();

  exchange.addOfferedCoins(defaultCoinConfig);

  await exchange.start();
  await exchange.pingUntilAvailable();

  merchant.addExchange(exchange);

  await merchant.start();
  await merchant.pingUntilAvailable();

  await merchant.addInstance({
    id: "minst1",
    name: "minst1",
    paytoUris: ["payto://x-taler-bank/minst1"],
  });

  await merchant.addInstance({
    id: "default",
    name: "Default Instance",
    paytoUris: [`payto://x-taler-bank/merchant-default`],
  });

  console.log("setup done!");

  /*
   * =========================================================================
   * Check that the exchange can be added to the wallet
   * (without any faults active).
   * =========================================================================
   */

  const wallet = new WalletCli(t);

  let exchangesList: ExchangesListRespose;

  exchangesList = await wallet.listExchanges();
  t.assertTrue(exchangesList.exchanges.length === 0);

  // Try before fault is injected
  await wallet.addExchange({
    exchangeBaseUrl: faultyExchange.baseUrl,
  });

  exchangesList = await wallet.listExchanges();
  t.assertTrue(exchangesList.exchanges.length === 1);

  await wallet.addExchange({
    exchangeBaseUrl: faultyExchange.baseUrl,
  });

  console.log("listing exchanges");

  exchangesList = await wallet.listExchanges();
  t.assertTrue(exchangesList.exchanges.length === 1);

  console.log("got list", exchangesList);

  /*
   * =========================================================================
   * Check what happens if the exchange returns something totally
   * bogus for /keys.
   * =========================================================================
   */

  wallet.deleteDatabase();

  exchangesList = await wallet.listExchanges();
  t.assertTrue(exchangesList.exchanges.length === 0);

  faultyExchange.faultProxy.addFault({
    modifyResponse(ctx: FaultInjectionResponseContext) {
      const url = new URL(ctx.request.requestUrl);
      if (url.pathname === "/keys") {
        const body = {
          version: "whaaat",
        };
        ctx.responseBody = Buffer.from(JSON.stringify(body), "utf-8");
      }
    },
  });

  await t.assertThrowsOperationErrorAsync(async () => {
    await wallet.addExchange({
      exchangeBaseUrl: faultyExchange.baseUrl,
    });
  });

  exchangesList = await wallet.listExchanges();
  t.assertTrue(exchangesList.exchanges.length === 0);

  /*
   * =========================================================================
   * Check what happens if the exchange returns an old, unsupported
   * version for /keys
   * =========================================================================
   */

  wallet.deleteDatabase();
  faultyExchange.faultProxy.clearAllFaults();

  faultyExchange.faultProxy.addFault({
    modifyResponse(ctx: FaultInjectionResponseContext) {
      const url = new URL(ctx.request.requestUrl);
      if (url.pathname === "/keys") {
        const keys = ctx.responseBody?.toString("utf-8");
        t.assertTrue(keys != null);
        const keysJson = JSON.parse(keys);
        keysJson["version"] = "2:0:0";
        ctx.responseBody = Buffer.from(JSON.stringify(keysJson), "utf-8");
      }
    },
  });

  await t.assertThrowsOperationErrorAsync(async () => {
    await wallet.addExchange({
      exchangeBaseUrl: faultyExchange.baseUrl,
    });
  });

  exchangesList = await wallet.listExchanges();
  t.assertTrue(exchangesList.exchanges.length === 0);

  /*
   * =========================================================================
   * Check that the exchange version is also checked when
   * the exchange is implicitly added via the suggested
   * exchange of a bank-integrated withdrawal.
   * =========================================================================
   */

  // Fault from above is still active!

  // Create withdrawal operation

  const user = await bank.createRandomBankUser();
  const wop = await bank.createWithdrawalOperation(user, "TESTKUDOS:10");

  // Hand it to the wallet

  const wd = await wallet.getWithdrawalDetailsForUri({
    talerWithdrawUri: wop.taler_withdraw_uri,
  });

  // Make sure the faulty exchange isn't used for the suggestion.
  t.assertTrue(wd.possibleExchanges.length === 0);
});
