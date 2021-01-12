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
 * Fault injection test to check aborting partial payment
 * via refunds.
 */

/**
 * Imports.
 */
import {
  GlobalTestState,
  MerchantService,
  ExchangeService,
  setupDb,
  BankService,
  WalletCli,
  MerchantPrivateApi,
} from "./harness";
import {
  FaultInjectedExchangeService,
  FaultInjectionRequestContext,
  FaultInjectionResponseContext,
} from "./faultInjection";
import { PreparePayResultType, URL, TalerErrorCode } from "taler-wallet-core";
import { defaultCoinConfig } from "./denomStructures";
import { withdrawViaBank, makeTestPayment } from "./helpers";

/**
 * Run test for basic, bank-integrated withdrawal.
 */
export async function runPayAbortTest(t: GlobalTestState) {
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

  const exchangeBankAccount = await bank.createExchangeAccount(
    "MyExchange",
    "x",
  );

  bank.setSuggestedExchange(exchange, exchangeBankAccount.accountPaytoUri);

  await bank.start();

  await bank.pingUntilAvailable();

  await exchange.addBankAccount("1", exchangeBankAccount);
  exchange.addOfferedCoins(defaultCoinConfig);

  await exchange.start();
  await exchange.pingUntilAvailable();

  const faultyExchange = new FaultInjectedExchangeService(t, exchange, 8091);

  const merchant = await MerchantService.create(t, {
    name: "testmerchant-1",
    currency: "TESTKUDOS",
    httpPort: 8083,
    database: db.connStr,
  });

  merchant.addExchange(faultyExchange);

  await merchant.start();
  await merchant.pingUntilAvailable();

  await merchant.addInstance({
    id: "default",
    name: "Default Instance",
    paytoUris: [`payto://x-taler-bank/merchant-default`],
  });

  console.log("setup done!");

  const wallet = new WalletCli(t);

  // Create withdrawal operation

  await withdrawViaBank(t, {
    wallet,
    exchange: faultyExchange,
    amount: "TESTKUDOS:20",
    bank,
  });

  // faultyExchange.faultProxy.addFault({
  //   modifyRequest(ctx: FaultInjectionRequestContext) {
  //     console.log("proxy request to", ctx.requestUrl);
  //   }
  // });

  const orderResp = await MerchantPrivateApi.createOrder(merchant, "default", {
    order: {
      summary: "Buy me!",
      amount: "TESTKUDOS:15",
      fulfillment_url: "taler://fulfillment-success/thx",
    },
  });

  let orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
  });

  t.assertTrue(orderStatus.order_status === "unpaid");

  // Make wallet pay for the order

  const preparePayResult = await wallet.preparePay({
    talerPayUri: orderStatus.taler_pay_uri,
  });

  t.assertTrue(
    preparePayResult.status === PreparePayResultType.PaymentPossible,
  );

  // We let only the first deposit through!
  let firstDepositUrl: string | undefined;

  faultyExchange.faultProxy.addFault({
    modifyRequest(ctx: FaultInjectionRequestContext) {
      const url = new URL(ctx.requestUrl);
      if (url.pathname.endsWith("/deposit")) {
        if (!firstDepositUrl) {
          firstDepositUrl = url.href;
          return;
        }
        if (url.href != firstDepositUrl) {
          url.pathname = "/doesntexist";
          ctx.requestUrl = url.href;
        }
      }
    },
    modifyResponse(ctx: FaultInjectionResponseContext) {
      const url = new URL(ctx.request.requestUrl);
      if (url.pathname.endsWith("/deposit") && url.href != firstDepositUrl) {
        ctx.responseBody = Buffer.from("{}");
        ctx.statusCode = 500;
      }
    },
  });

  await t.assertThrowsOperationErrorAsync(async () => {
    await wallet.confirmPay({
      proposalId: preparePayResult.proposalId,
    });
  });

  let txr = await wallet.getTransactions();
  console.log(JSON.stringify(txr, undefined, 2));

  t.assertDeepEqual(txr.transactions[1].type, "payment");
  t.assertDeepEqual(txr.transactions[1].pending, true);
  t.assertDeepEqual(
    txr.transactions[1].error?.code,
    TalerErrorCode.WALLET_UNEXPECTED_REQUEST_ERROR,
  );

  await wallet.abortFailedPayWithRefund({
    proposalId: preparePayResult.proposalId,
  });

  await wallet.runUntilDone();

  txr = await wallet.getTransactions();
  console.log(JSON.stringify(txr, undefined, 2));

  const txTypes = txr.transactions.map((x) => x.type);

  t.assertDeepEqual(txTypes, ["withdrawal", "payment", "refund"]);
}
