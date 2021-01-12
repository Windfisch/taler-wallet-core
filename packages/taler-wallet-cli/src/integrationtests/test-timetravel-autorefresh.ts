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
  ConfirmPayResultType,
  Duration,
  durationFromSpec,
  PendingOperationsResponse,
  PreparePayResultType,
} from "taler-wallet-core";
import { makeNoFeeCoinConfig } from "./denomStructures";
import {
  BankService,
  ExchangeService,
  GlobalTestState,
  MerchantPrivateApi,
  MerchantService,
  setupDb,
  WalletCli,
} from "./harness";
import { startWithdrawViaBank, withdrawViaBank } from "./helpers";

async function applyTimeTravel(
  timetravelDuration: Duration,
  s: {
    exchange?: ExchangeService;
    merchant?: MerchantService;
    wallet?: WalletCli;
  },
): Promise<void> {
  if (s.exchange) {
    await s.exchange.stop();
    s.exchange.setTimetravel(timetravelDuration);
    await s.exchange.start();
    await s.exchange.pingUntilAvailable();
  }

  if (s.merchant) {
    await s.merchant.stop();
    s.merchant.setTimetravel(timetravelDuration);
    await s.merchant.start();
    await s.merchant.pingUntilAvailable();
  }

  if (s.wallet) {
    s.wallet.setTimetravel(timetravelDuration);
  }
}

/**
 * Basic time travel test.
 */
export async function runTimetravelAutorefreshTest(t: GlobalTestState) {
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

  exchange.addCoinConfigList(makeNoFeeCoinConfig("TESTKUDOS"));

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

  // Withdraw digital cash into the wallet.

  await withdrawViaBank(t, { wallet, bank, exchange, amount: "TESTKUDOS:15" });

  // Travel into the future, the deposit expiration is two years
  // into the future.
  await applyTimeTravel(durationFromSpec({ days: 400 }), {
    wallet,
    exchange,
    merchant,
  });

  await wallet.runUntilDone();

  let p: PendingOperationsResponse;
  p = await wallet.getPendingOperations();

  console.log("pending operations after first time travel");
  console.log(JSON.stringify(p, undefined, 2));

  await startWithdrawViaBank(t, {
    wallet,
    bank,
    exchange,
    amount: "TESTKUDOS:20",
  });

  await wallet.runUntilDone();

  // Travel into the future, the deposit expiration is two years
  // into the future.
  await applyTimeTravel(durationFromSpec({ years: 2, months: 6 }), {
    wallet,
    exchange,
    merchant,
  });

  await wallet.runUntilDone();

  const orderResp = await MerchantPrivateApi.createOrder(merchant, "default", {
    order: {
      fulfillment_url: "http://example.com",
      summary: "foo",
      amount: "TESTKUDOS:30",
    },
  });

  const orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(
    merchant,
    {
      orderId: orderResp.order_id,
      instance: "default",
    },
  );

  t.assertTrue(orderStatus.order_status === "unpaid");

  const r = await wallet.preparePay({
    talerPayUri: orderStatus.taler_pay_uri,
  });

  console.log(r);

  t.assertTrue(r.status === PreparePayResultType.PaymentPossible);

  const cpr = await wallet.confirmPay({
    proposalId: r.proposalId,
  });

  t.assertTrue(cpr.type === ConfirmPayResultType.Done);
}
