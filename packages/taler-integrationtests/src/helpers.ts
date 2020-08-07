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
 * Helpers to create typical test environments.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports
 */
import {
  GlobalTestState,
  DbInfo,
  ExchangeService,
  WalletCli,
  MerchantService,
  setupDb,
  BankService,
  defaultCoinConfig,
} from "./harness";
import { AmountString } from "taler-wallet-core/lib/types/talerTypes";

export interface SimpleTestEnvironment {
  commonDb: DbInfo;
  bank: BankService;
  exchange: ExchangeService;
  merchant: MerchantService;
  wallet: WalletCli;
}

/**
 * Run a test case with a simple TESTKUDOS Taler environment, consisting
 * of one exchange, one bank and one merchant.
 */
export async function createSimpleTestkudosEnvironment(
  t: GlobalTestState,
): Promise<SimpleTestEnvironment> {
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

  bank.setSuggestedExchange(exchange, "payto://x-taler-bank/MyExchange");

  await bank.start();

  await bank.pingUntilAvailable();

  await exchange.setupTestBankAccount(bank, "1", "MyExchange", "x");
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

  return {
    commonDb: db,
    exchange,
    merchant,
    wallet,
    bank,
  };
}

/**
 * Withdraw balance.
 */
export async function withdrawViaBank(t: GlobalTestState, p: {
  wallet: WalletCli;
  bank: BankService;
  exchange: ExchangeService;
  amount: AmountString;
}): Promise<void> {

  const { wallet, bank, exchange, amount } = p;

  const user = await bank.createRandomBankUser();
  const wop = await bank.createWithdrawalOperation(user, amount);

  // Hand it to the wallet

  const r1 = await wallet.apiRequest("getWithdrawalDetailsForUri", {
    talerWithdrawUri: wop.taler_withdraw_uri,
  });
  t.assertTrue(r1.type === "response");

  await wallet.runPending();

  // Confirm it

  await bank.confirmWithdrawalOperation(user, wop);

  // Withdraw

  const r2 = await wallet.apiRequest("acceptBankIntegratedWithdrawal", {
    exchangeBaseUrl: exchange.baseUrl,
    talerWithdrawUri: wop.taler_withdraw_uri,
  });
  t.assertTrue(r2.type === "response");
  await wallet.runUntilDone();

  // Check balance

  const balApiResp = await wallet.apiRequest("getBalances", {});
  t.assertTrue(balApiResp.type === "response");
}
