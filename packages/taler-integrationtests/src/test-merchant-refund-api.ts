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
  MerchantService,
  BankServiceInterface,
  MerchantServiceInterface,
  WalletCli,
  ExchangeServiceInterface,
} from "./harness";
import {
  createSimpleTestkudosEnvironment,
  withdrawViaBank,
  SimpleTestEnvironment,
} from "./helpers";
import { durationFromSpec, PreparePayResultType, URL } from "taler-wallet-core";
import axios from "axios";

async function testRefundApiWithFulfillmentUrl(
  t: GlobalTestState,
  env: {
    merchant: MerchantServiceInterface;
    bank: BankServiceInterface;
    wallet: WalletCli;
    exchange: ExchangeServiceInterface;
  },
): Promise<void> {
  const { wallet, bank, exchange, merchant } = env;

  // Set up order.
  const orderResp = await MerchantPrivateApi.createOrder(merchant, "default", {
    order: {
      summary: "Buy me!",
      amount: "TESTKUDOS:5",
      fulfillment_url: "https://example.com/fulfillment",
    },
    refund_delay: durationFromSpec({ minutes: 5 }),
  });

  let orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
  });

  t.assertTrue(orderStatus.order_status === "unpaid");

  const talerPayUri = orderStatus.taler_pay_uri;
  const orderId = orderResp.order_id;

  // Make wallet pay for the order

  let preparePayResult = await wallet.preparePay({
    talerPayUri,
  });

  t.assertTrue(
    preparePayResult.status === PreparePayResultType.PaymentPossible,
  );

  const r2 = await wallet.apiRequest("confirmPay", {
    proposalId: preparePayResult.proposalId,
  });
  t.assertTrue(r2.type === "response");

  // Check if payment was successful.

  orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
  });

  t.assertTrue(orderStatus.order_status === "paid");

  preparePayResult = await wallet.preparePay({
    talerPayUri,
  });

  t.assertTrue(
    preparePayResult.status === PreparePayResultType.AlreadyConfirmed,
  );

  await MerchantPrivateApi.giveRefund(merchant, {
    amount: "TESTKUDOS:5",
    instance: "default",
    justification: "foo",
    orderId: orderResp.order_id,
  });

  orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
  });

  t.assertTrue(orderStatus.order_status === "paid");

  t.assertAmountEquals(orderStatus.refund_amount, "TESTKUDOS:5");

  // Now test what the merchant gives as a response for various requests to the
  // public order status URL!

  let publicOrderStatusUrl = new URL(
    `orders/${orderId}`,
    merchant.makeInstanceBaseUrl(),
  );
  publicOrderStatusUrl.searchParams.set(
    "h_contract",
    preparePayResult.contractTermsHash,
  );

  let publicOrderStatusResp = await axios.get(publicOrderStatusUrl.href, {
    validateStatus: () => true,
  });
  console.log(publicOrderStatusResp.data);
  t.assertTrue(publicOrderStatusResp.status === 200);
  t.assertAmountEquals(publicOrderStatusResp.data.refund_amount, "TESTKUDOS:5");

  publicOrderStatusUrl = new URL(
    `orders/${orderId}`,
    merchant.makeInstanceBaseUrl(),
  );

  publicOrderStatusResp = await axios.get(publicOrderStatusUrl.href, {
    validateStatus: () => true,
  });
  console.log(publicOrderStatusResp.data);
  // We didn't give any authentication, so we should get a fulfillment URL back
  t.assertTrue(publicOrderStatusResp.status === 202);
  const fu = publicOrderStatusResp.data.fulfillment_url;
  t.assertTrue(typeof fu === "string" && fu.startsWith("https://example.com"));
}

async function testRefundApiWithFulfillmentMessage(
  t: GlobalTestState,
  env: {
    merchant: MerchantServiceInterface;
    bank: BankServiceInterface;
    wallet: WalletCli;
    exchange: ExchangeServiceInterface;
  },
): Promise<void> {
  const { wallet, bank, exchange, merchant } = env;

  // Set up order.
  const orderResp = await MerchantPrivateApi.createOrder(merchant, "default", {
    order: {
      summary: "Buy me!",
      amount: "TESTKUDOS:5",
      fulfillment_message: "Thank you for buying foobar",
    },
    refund_delay: durationFromSpec({ minutes: 5 }),
  });

  let orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
  });

  t.assertTrue(orderStatus.order_status === "unpaid");

  const talerPayUri = orderStatus.taler_pay_uri;
  const orderId = orderResp.order_id;

  // Make wallet pay for the order

  let preparePayResult = await wallet.preparePay({
    talerPayUri,
  });

  t.assertTrue(
    preparePayResult.status === PreparePayResultType.PaymentPossible,
  );

  const r2 = await wallet.apiRequest("confirmPay", {
    proposalId: preparePayResult.proposalId,
  });
  t.assertTrue(r2.type === "response");

  // Check if payment was successful.

  orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
  });

  t.assertTrue(orderStatus.order_status === "paid");

  preparePayResult = await wallet.preparePay({
    talerPayUri,
  });

  t.assertTrue(
    preparePayResult.status === PreparePayResultType.AlreadyConfirmed,
  );

  await MerchantPrivateApi.giveRefund(merchant, {
    amount: "TESTKUDOS:5",
    instance: "default",
    justification: "foo",
    orderId: orderResp.order_id,
  });

  orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
  });

  t.assertTrue(orderStatus.order_status === "paid");

  t.assertAmountEquals(orderStatus.refund_amount, "TESTKUDOS:5");

  // Now test what the merchant gives as a response for various requests to the
  // public order status URL!

  let publicOrderStatusUrl = new URL(
    `orders/${orderId}`,
    merchant.makeInstanceBaseUrl(),
  );
  publicOrderStatusUrl.searchParams.set(
    "h_contract",
    preparePayResult.contractTermsHash,
  );

  let publicOrderStatusResp = await axios.get(publicOrderStatusUrl.href, {
    validateStatus: () => true,
  });
  console.log(publicOrderStatusResp.data);
  t.assertTrue(publicOrderStatusResp.status === 200);
  t.assertAmountEquals(publicOrderStatusResp.data.refund_amount, "TESTKUDOS:5");

  publicOrderStatusUrl = new URL(
    `orders/${orderId}`,
    merchant.makeInstanceBaseUrl(),
  );

  publicOrderStatusResp = await axios.get(publicOrderStatusUrl.href, {
    validateStatus: () => true,
  });
  console.log(publicOrderStatusResp.data);
  // We didn't give any authentication, so we should get a fulfillment URL back
  t.assertTrue(publicOrderStatusResp.status === 403);
}

/**
 * Test case for the refund API of the merchant backend.
 */
runTest(async (t: GlobalTestState) => {
  // Set up test environment

  const {
    wallet,
    bank,
    exchange,
    merchant,
  } = await createSimpleTestkudosEnvironment(t);

  // Withdraw digital cash into the wallet.

  await withdrawViaBank(t, { wallet, bank, exchange, amount: "TESTKUDOS:20" });

  await testRefundApiWithFulfillmentUrl(t, {
    wallet,
    bank,
    exchange,
    merchant,
  });

  await testRefundApiWithFulfillmentMessage(t, {
    wallet,
    bank,
    exchange,
    merchant,
  });
});
