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
} from "./harness";
import { createSimpleTestkudosEnvironment, withdrawViaBank } from "./helpers";
import { PreparePayResultType, TalerErrorCode } from "taler-wallet-core";
import { URL } from "url"

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

  await withdrawViaBank(t, { wallet, bank, exchange, amount: "TESTKUDOS:20" });

  // Set up order.
  const orderResp = await MerchantPrivateApi.createOrder(merchant, "default", {
    order: {
      summary: "Buy me!",
      amount: "TESTKUDOS:5",
      fulfillment_url: "taler://fulfillment-success/thx",
    }
  });
  
  // Query private order status before claiming it.
  let orderStatusBefore = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
  });
  let statusUrlBefore = new URL(orderStatusBefore.order_status_url);

  // Make wallet claim the unpaid order.
  t.assertTrue(orderStatusBefore.order_status === "unpaid"); 
  const talerPayUri = orderStatusBefore.taler_pay_uri;
  const y = await wallet.preparePay({
    talerPayUri
  });

  // Query private order status after claiming it.
  let orderStatusAfter = await MerchantPrivateApi.queryPrivateOrderStatus(merchant, {
    orderId: orderResp.order_id,
  });
  let statusUrlAfter = new URL(orderStatusAfter.order_status_url)

  let tokenBefore = statusUrlBefore.searchParams.get("token")
  let tokenAfter = statusUrlAfter.searchParams.get("token")

  t.assertTrue(tokenBefore === tokenAfter)

  await t.shutdown();
});
