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
  setupDb,
  BankService,
  ExchangeService,
  MerchantService,
  WalletCli,
  coin_ct10,
  coin_u1,
} from "./harness";
import { createSimpleTestkudosEnvironment, withdrawViaBank } from "./helpers";

/**
 * Run test.
 * 
 * This test uses a very sub-optimal denomination structure.
 */
runTest(async (t: GlobalTestState) => {
  // Set up test environment

  const db = await setupDb(t);

  const bank = await BankService.create(t, {
    allowRegistrations: true,
    currency: "TESTKUDOS",
    database: db.connStr,
    httpPort: 8082,
    suggestedExchange: "http://localhost:8081/",
    suggestedExchangePayto: "payto://x-taler-bank/MyExchange",
  });

  await bank.start();

  await bank.pingUntilAvailable();

  const exchange = ExchangeService.create(t, {
    name: "testexchange-1",
    currency: "TESTKUDOS",
    httpPort: 8081,
    database: db.connStr,
    coinConfig: [coin_ct10, coin_u1],
  });

  await exchange.setupTestBankAccount(bank, "1", "MyExchange", "x");

  await exchange.start();
  await exchange.pingUntilAvailable();

  const merchant = await MerchantService.create(t, {
    name: "testmerchant-1",
    currency: "TESTKUDOS",
    httpPort: 8083,
    database: db.connStr,
  });

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

  // Withdraw digital cash into the wallet.

  await withdrawViaBank(t, { wallet, bank, exchange, amount: "TESTKUDOS:100" });

  // Set up order.

  const orderResp = await merchant.createOrder("default", {
    order: {
      summary: "Buy me!",
      amount: "TESTKUDOS:80",
      fulfillment_url: "taler://fulfillment-success/thx",
    },
  });

  let orderStatus = await merchant.queryPrivateOrderStatus(
    "default",
    orderResp.order_id,
  );

  t.assertTrue(orderStatus.order_status === "unpaid");

  // Make wallet pay for the order

  const r1 = await wallet.apiRequest("preparePay", {
    talerPayUri: orderStatus.taler_pay_uri,
  });
  t.assertTrue(r1.type === "response");

  const r2 = await wallet.apiRequest("confirmPay", {
    // FIXME: should be validated, don't cast!
    proposalId: (r1.result as any).proposalId,
  });
  t.assertTrue(r2.type === "response");

  // Check if payment was successful.

  orderStatus = await merchant.queryPrivateOrderStatus(
    "default",
    orderResp.order_id,
  );

  t.assertTrue(orderStatus.order_status === "paid");

  await t.shutdown();
});
