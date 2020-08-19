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
import { runTest, GlobalTestState, MerchantPrivateApi } from "./harness";
import { createSimpleTestkudosEnvironment, withdrawViaBank, createFaultInjectedMerchantTestkudosEnvironment } from "./helpers";
import {
  PreparePayResultType,
  codecForMerchantOrderStatusUnpaid,
  ConfirmPayResultType,
  URL,
} from "taler-wallet-core";
import axios from "axios";
import { FaultInjectionRequestContext } from "./faultInjection";

/**
 * Run test for basic, bank-integrated withdrawal.
 */
runTest(async (t: GlobalTestState) => {
  // Set up test environment

  const {
    wallet,
    bank,
    exchange,
    faultyMerchant,
  } = await createFaultInjectedMerchantTestkudosEnvironment(t);

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

  const merchant = faultyMerchant;

  let orderResp = await MerchantPrivateApi.createOrder(merchant, "default", {
    order: {
      summary: "Buy me!",
      amount: "TESTKUDOS:5",
      fulfillment_url: "https://example.com/article42",
    },
  });


  let orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
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
   * Now change up the session ID and do payment re-play!
   * =========================================================================
   */

  orderStatus = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
    sessionId: "mysession-two",
  });

  // Should be unpaid because of a new session ID
  t.assertTrue(orderStatus.order_status === "unpaid");

  publicOrderStatusUrl = orderStatus.order_status_url;

  let numPayRequested = 0;
  let numPaidRequested = 0;

  faultyMerchant.faultProxy.addFault({
    modifyRequest(ctx: FaultInjectionRequestContext) {
      const url = new URL(ctx.requestUrl);
      if (url.pathname.endsWith("/pay")) {
        numPayRequested++;
      } else if (url.pathname.endsWith("/paid")) {
        numPaidRequested++;
      }
    }
  });

  // Pay with new taler://pay URI, which should
  // have the new session ID!
  // Wallet should now automatically re-play payment.
  preparePayResp = await wallet.preparePay({
    talerPayUri: orderStatus.taler_pay_uri,
  });

  t.assertTrue(preparePayResp.status === PreparePayResultType.AlreadyConfirmed);
  t.assertTrue(preparePayResp.paid);

  // Make sure the wallet is actually doing the replay properly.
  t.assertTrue(numPaidRequested == 1);
  t.assertTrue(numPayRequested == 0);

});
