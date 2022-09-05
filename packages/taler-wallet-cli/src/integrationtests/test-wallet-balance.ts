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
import { Duration, PreparePayResultType } from "@gnu-taler/taler-util";
import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { CoinConfig, defaultCoinConfig } from "../harness/denomStructures.js";
import {
  BankService,
  ExchangeService,
  FakebankService,
  getPayto,
  getRandomIban,
  GlobalTestState,
  MerchantPrivateApi,
  MerchantService,
  setupDb,
  WalletCli,
} from "../harness/harness.js";
import {
  createSimpleTestkudosEnvironment,
  withdrawViaBank,
  makeTestPayment,
} from "../harness/helpers.js";

/**
 * Test for wallet balance error messages / different types of insufficient balance.
 *
 * Related bugs:
 * https://bugs.taler.net/n/7299
 */
export async function runWalletBalanceTest(t: GlobalTestState) {
  // Set up test environment

  const db = await setupDb(t);

  const bank = await FakebankService.create(t, {
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
    "myexchange",
    "x",
  );
  exchange.addBankAccount("1", exchangeBankAccount);

  bank.setSuggestedExchange(exchange, exchangeBankAccount.accountPaytoUri);

  await bank.start();

  await bank.pingUntilAvailable();

  const coinConfig: CoinConfig[] = defaultCoinConfig.map((x) => x("TESTKUDOS"));
  exchange.addCoinConfigList(coinConfig);

  await exchange.start();
  await exchange.pingUntilAvailable();

  merchant.addExchange(exchange);

  await merchant.start();
  await merchant.pingUntilAvailable();

  // Fakebank uses x-taler-bank, but merchant is configured to only accept sepa!
  const label = "mymerchant";
  await merchant.addInstance({
    id: "default",
    name: "Default Instance",
    paytoUris: [
      `payto://iban/SANDBOXX/${getRandomIban(label)}?receiver-name=${label}`,
    ],
    defaultWireTransferDelay: Duration.toTalerProtocolDuration(
      Duration.fromSpec({ minutes: 1 }),
    ),
  });

  console.log("setup done!");

  const wallet = new WalletCli(t);

  // Withdraw digital cash into the wallet.

  await withdrawViaBank(t, { wallet, bank, exchange, amount: "TESTKUDOS:20" });

  const order = {
    summary: "Buy me!",
    amount: "TESTKUDOS:5",
    fulfillment_url: "taler://fulfillment-success/thx",
  };

  const orderResp = await MerchantPrivateApi.createOrder(merchant, "default", {
    order,
  });

  let orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
  });

  t.assertTrue(orderStatus.order_status === "unpaid");

  // Make wallet pay for the order

  const preparePayResult = await wallet.client.call(
    WalletApiOperation.PreparePayForUri,
    {
      talerPayUri: orderStatus.taler_pay_uri,
    },
  );

  t.assertDeepEqual(
    preparePayResult.status,
    PreparePayResultType.InsufficientBalance,
  );

  await wallet.runUntilDone();
}

runWalletBalanceTest.suites = ["wallet"];
