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
  MerchantPrivateApi,
  WalletCli,
  defaultCoinConfig,
  ExchangeService,
  setupDb,
  BankService,
  MerchantService,
  BankApi,
  BankUser,
  BankAccessApi,
  CreditDebitIndicator,
} from "./harness";
import { createSimpleTestkudosEnvironment, withdrawViaBank } from "./helpers";
import { createEddsaKeyPair, encodeCrock } from "taler-wallet-core";

/**
 * Run test for basic, bank-integrated withdrawal.
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

  bank.setSuggestedExchange(exchange, exchangeBankAccount.accountPaytoUri);

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

  const wallet = new WalletCli(t);

  const bankUser = await BankApi.registerAccount(bank, "user1", "pw1");

  // Make sure that registering twice results in a 409 Conflict
  {
    const e = await t.assertThrowsAsync(async () => {
      await BankApi.registerAccount(bank, "user1", "pw1");
    });
    t.assertAxiosError(e);
    t.assertTrue(e.response?.status === 409);
  }

  let bal = await BankAccessApi.getAccountBalance(bank, bankUser);

  console.log(bal);

  // Check that we got the sign-up bonus.
  t.assertAmountEquals(bal.amount, "TESTKUDOS:100");
  t.assertTrue(bal.credit_debit_indicator === CreditDebitIndicator.Credit);

  const res = createEddsaKeyPair();

  await BankApi.adminAddIncoming(bank, {
    amount: "TESTKUDOS:115",
    debitAccountPayto: bankUser.accountPaytoUri,
    exchangeBankAccount: exchangeBankAccount,
    reservePub: encodeCrock(res.eddsaPub),
  });

  bal = await BankAccessApi.getAccountBalance(bank, bankUser);
  t.assertAmountEquals(bal.amount, "TESTKUDOS:15");
  t.assertTrue(bal.credit_debit_indicator === CreditDebitIndicator.Debit);
});
