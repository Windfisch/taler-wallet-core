/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

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
 * Integration tests against real Taler bank/exchange/merchant deployments.
 */

import { getDefaultNodeWallet, withdrawTestBalance } from "./helpers";
import { MerchantBackendConnection } from "./merchant";
import { Logger } from "../util/logging";
import { NodeHttpLib } from "./NodeHttpLib";

const logger = new Logger("integrationtest.ts");

export async function runIntegrationTest(args: {
  exchangeBaseUrl: string;
  bankBaseUrl: string;
  merchantBaseUrl: string;
  merchantApiKey: string;
  amountToWithdraw: string;
  amountToSpend: string;
}) {
  logger.info("running test with arguments", args);

  const myHttpLib = new NodeHttpLib();
  myHttpLib.setThrottling(false);

  const myWallet = await getDefaultNodeWallet({ httpLib: myHttpLib });

  logger.info("withdrawing test balance");
  await withdrawTestBalance(myWallet, args.amountToWithdraw, args.bankBaseUrl, args.exchangeBaseUrl);
  logger.info("done withdrawing test balance");

  const balance = await myWallet.getBalances();

  console.log(JSON.stringify(balance, null, 2));

  const myMerchant = new MerchantBackendConnection(
    args.merchantBaseUrl,
    args.merchantApiKey,
  );

  const orderResp = await myMerchant.createOrder(
    args.amountToSpend,
    "hello world",
    "https://example.com/",
  );

  console.log("created order with orderId", orderResp.orderId);

  const paymentStatus = await myMerchant.checkPayment(orderResp.orderId);

  console.log("payment status", paymentStatus);

  const talerPayUri = paymentStatus.taler_pay_uri;
  if (!talerPayUri) {
    throw Error("no taler://pay/ URI in payment response");
  }

  const preparePayResult = await myWallet.preparePay(talerPayUri);

  console.log("prepare pay result", preparePayResult);

  if (preparePayResult.status != "payment-possible") {
    throw Error("payment not possible");
  }

  const confirmPayResult = await myWallet.confirmPay(preparePayResult.proposalId, undefined);

  console.log("confirmPayResult", confirmPayResult);

  const paymentStatus2 = await myMerchant.checkPayment(orderResp.orderId);

  console.log("payment status after wallet payment:", paymentStatus2);

  if (!paymentStatus2.paid) {
    throw Error("payment did not succeed");
  }

  await myWallet.runUntilDone();
}
