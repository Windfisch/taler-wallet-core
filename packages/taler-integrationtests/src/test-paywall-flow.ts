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
import { createSimpleTestkudosEnvironment, withdrawViaBank } from "./helpers";
import {
  PreparePayResultType,
  codecForMerchantOrderStatusUnpaid,
  ConfirmPayResultType,
} from "taler-wallet-core";
import axios from "axios";

/**
 * Run test for basic, bank-integrated withdrawal.
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

  /**
   * =========================================================================
   * Create an order and let the wallet pay under a session ID
   * 
   * We check along the way that the JSON response to /orders/{order_id}
   * returns the right thing.
   * =========================================================================
   */

  let orderResp = await merchant.createOrder("default", {
    order: {
      summary: "Buy me!",
      amount: "TESTKUDOS:5",
      fulfillment_url: "https://example.com/article42",
    },
  });

  const firstOrderId = orderResp.order_id;

  let orderStatus = await merchant.queryPrivateOrderStatus({
    orderId: orderResp.order_id,
    sessionId: "mysession-one",
  });

  t.assertTrue(orderStatus.order_status === "unpaid");

  t.assertTrue(orderStatus.already_paid_order_id === undefined);
  let publicOrderStatusUrl = orderStatus.order_status_url;

  let publicOrderStatusResp = await axios.get(publicOrderStatusUrl, {
    validateStatus: () => true,
  });

  if (publicOrderStatusResp.status != 402) {
    throw Error(
      `expected status 402 (before claiming), but got ${publicOrderStatusResp.status}`,
    );
  }

  let pubUnpaidStatus = codecForMerchantOrderStatusUnpaid().decode(
    publicOrderStatusResp.data,
  );

  console.log(pubUnpaidStatus);

  let preparePayResp = await wallet.preparePay({
    talerPayUri: pubUnpaidStatus.taler_pay_uri,
  });

  t.assertTrue(preparePayResp.status === PreparePayResultType.PaymentPossible);

  const proposalId = preparePayResp.proposalId;

  publicOrderStatusResp = await axios.get(publicOrderStatusUrl, {
    validateStatus: () => true,
  });

  if (publicOrderStatusResp.status != 402) {
    throw Error(
      `expected status 402 (after claiming), but got ${publicOrderStatusResp.status}`,
    );
  }

  pubUnpaidStatus = codecForMerchantOrderStatusUnpaid().decode(
    publicOrderStatusResp.data,
  );

  const confirmPayRes = await wallet.confirmPay({
    proposalId: proposalId,
  });

  t.assertTrue(confirmPayRes.type === ConfirmPayResultType.Done);

  publicOrderStatusResp = await axios.get(publicOrderStatusUrl, {
    validateStatus: () => true,
  });

  console.log(publicOrderStatusResp.data);

  if (publicOrderStatusResp.status != 202) {
    console.log(publicOrderStatusResp.data);
    throw Error(
      `expected status 202 (after paying), but got ${publicOrderStatusResp.status}`,
    );
  }

  /**
   * =========================================================================
   * Now change up the session ID!
   * =========================================================================
   */

  orderStatus = await merchant.queryPrivateOrderStatus({
    orderId: orderResp.order_id,
    sessionId: "mysession-two",
  });

  // Should be unpaid because of a new session ID
  t.assertTrue(orderStatus.order_status === "unpaid");

  publicOrderStatusUrl = orderStatus.order_status_url;

  // Pay with new taler://pay URI, which should
  // have the new session ID!
  // Wallet should now automatically re-play payment.
  preparePayResp = await wallet.preparePay({
    talerPayUri: orderStatus.taler_pay_uri,
  });

  t.assertTrue(preparePayResp.status === PreparePayResultType.AlreadyConfirmed);
  t.assertTrue(preparePayResp.paid);

  /**
   * =========================================================================
   * Now we test re-purchase detection.
   * =========================================================================
   */

  orderResp = await merchant.createOrder("default", {
    order: {
      summary: "Buy me!",
      amount: "TESTKUDOS:5",
      // Same fulfillment URL as previously!
      fulfillment_url: "https://example.com/article42",
    },
  });

  const secondOrderId = orderResp.order_id;

  orderStatus = await merchant.queryPrivateOrderStatus({
    orderId: secondOrderId,
    sessionId: "mysession-three",
  });

  t.assertTrue(orderStatus.order_status === "unpaid");

  t.assertTrue(orderStatus.already_paid_order_id === undefined);
  publicOrderStatusUrl = orderStatus.order_status_url;

  // Here the re-purchase detection should kick in,
  // and the wallet should re-pay for the old order
  // under the new session ID (mysession-three).
  preparePayResp = await wallet.preparePay({
    talerPayUri: orderStatus.taler_pay_uri,
  });

  t.assertTrue(preparePayResp.status === PreparePayResultType.AlreadyConfirmed);
  t.assertTrue(preparePayResp.paid);

  // The first order should now be paid under "mysession-three",
  // as the wallet did re-purchase detection
  orderStatus = await merchant.queryPrivateOrderStatus({
    orderId: firstOrderId,
    sessionId: "mysession-three",
  });

  t.assertTrue(orderStatus.order_status === "paid");

  // Check that with a completely new session ID, the status would NOT
  // be paid.
  orderStatus = await merchant.queryPrivateOrderStatus({
    orderId: firstOrderId,
    sessionId: "mysession-four",
  });

  t.assertTrue(orderStatus.order_status === "unpaid");

  // Now check if the public status of the new order is correct.

  console.log("requesting public status", publicOrderStatusUrl);

  // Ask the order status of the claimed-but-unpaid order
  publicOrderStatusResp = await axios.get(publicOrderStatusUrl, {
    validateStatus: () => true,
  });

  if (publicOrderStatusResp.status != 402) {
    throw Error(
      `expected status 402, but got ${publicOrderStatusResp.status}`,
    );
  }

  pubUnpaidStatus = codecForMerchantOrderStatusUnpaid().decode(
    publicOrderStatusResp.data,
  );

  console.log(publicOrderStatusResp.data);

  t.assertTrue(pubUnpaidStatus.already_paid_order_id === firstOrderId);
});
