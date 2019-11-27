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

const enableTracing = false;

export async function runIntegrationTest(args: {
  exchangeBaseUrl: string;
  bankBaseUrl: string;
  merchantBaseUrl: string;
  merchantApiKey: string;
  amountToWithdraw: string;
  amountToSpend: string;
}) {
  console.log("running test with", args);
  const myWallet = await getDefaultNodeWallet();

  await withdrawTestBalance(myWallet, args.amountToWithdraw, args.bankBaseUrl, args.exchangeBaseUrl);

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

  await myWallet.runPending();
  //const refreshRes = await myWallet.refreshDirtyCoins();
  //console.log(`waited to refresh ${refreshRes.numRefreshed} coins`);

  myWallet.stop();
}
