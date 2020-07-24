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
import { Wallet } from "../wallet";
import { Configuration } from "../util/talerconfig";
import { Amounts, AmountJson } from "../util/amounts";

const logger = new Logger("integrationtest.ts");

export interface IntegrationTestArgs {
  exchangeBaseUrl: string;
  bankBaseUrl: string;
  merchantBaseUrl: string;
  merchantApiKey: string;
  amountToWithdraw: string;
  amountToSpend: string;
}

async function makePayment(
  wallet: Wallet,
  merchant: MerchantBackendConnection,
  amount: string,
  summary: string,
): Promise<{ orderId: string }> {
  const orderResp = await merchant.createOrder(
    amount,
    summary,
    "taler://fulfillment-success/thx",
  );

  console.log("created order with orderId", orderResp.orderId);

  let paymentStatus = await merchant.checkPayment(orderResp.orderId);

  console.log("payment status", paymentStatus);

  const talerPayUri = paymentStatus.taler_pay_uri;
  if (!talerPayUri) {
    throw Error("no taler://pay/ URI in payment response");
  }

  const preparePayResult = await wallet.preparePayForUri(talerPayUri);

  console.log("prepare pay result", preparePayResult);

  if (preparePayResult.status != "payment-possible") {
    throw Error("payment not possible");
  }

  const confirmPayResult = await wallet.confirmPay(
    preparePayResult.proposalId,
    undefined,
  );

  console.log("confirmPayResult", confirmPayResult);

  paymentStatus = await merchant.checkPayment(orderResp.orderId);

  if (paymentStatus.order_status !== "paid") {
    console.log("payment status:", paymentStatus);
    throw Error("payment did not succeed");
  }

  return {
    orderId: orderResp.orderId,
  };
}

export async function runIntegrationTest(
  args: IntegrationTestArgs,
): Promise<void> {
  logger.info("running test with arguments", args);

  const parsedSpendAmount = Amounts.parseOrThrow(args.amountToSpend);
  const currency = parsedSpendAmount.currency;

  const myHttpLib = new NodeHttpLib();
  myHttpLib.setThrottling(false);

  const myWallet = await getDefaultNodeWallet({ httpLib: myHttpLib });

  myWallet.runRetryLoop().catch((e) => {
    console.error("exception during retry loop:", e);
  });

  logger.info("withdrawing test balance");
  await withdrawTestBalance(
    myWallet,
    args.amountToWithdraw,
    args.bankBaseUrl,
    args.exchangeBaseUrl,
  );
  logger.info("done withdrawing test balance");

  const myMerchant = new MerchantBackendConnection(
    args.merchantBaseUrl,
    args.merchantApiKey,
  );

  await makePayment(myWallet, myMerchant, args.amountToSpend, "hello world");

  // Wait until the refresh is done
  await myWallet.runUntilDone();

  console.log("withdrawing test balance for refund");
  const withdrawAmountTwo: AmountJson = {
    currency,
    value: 18,
    fraction: 0,
  };
  const spendAmountTwo: AmountJson = {
    currency,
    value: 7,
    fraction: 0,
  };

  const refundAmount: AmountJson = {
    currency,
    value: 6,
    fraction: 0,
  };

  const spendAmountThree: AmountJson = {
    currency,
    value: 3,
    fraction: 0,
  };
  await withdrawTestBalance(
    myWallet,
    Amounts.stringify(withdrawAmountTwo),
    args.bankBaseUrl,
    args.exchangeBaseUrl,
  );

  // Wait until the withdraw is done
  await myWallet.runUntilDone();

  const { orderId: refundOrderId } = await makePayment(
    myWallet,
    myMerchant,
    Amounts.stringify(spendAmountTwo),
    "order that will be refunded",
  );

  const refundUri = await myMerchant.refund(
    refundOrderId,
    "test refund",
    Amounts.stringify(refundAmount),
  );

  console.log("refund URI", refundUri);

  await myWallet.applyRefund(refundUri);

  // Wait until the refund is done
  await myWallet.runUntilDone();

  await makePayment(
    myWallet,
    myMerchant,
    Amounts.stringify(spendAmountThree),
    "payment after refund",
  );

  await myWallet.runUntilDone();
}

export async function runIntegrationTestBasic(
  cfg: Configuration,
): Promise<void> {
  const walletDbPath = cfg.getString("integrationtest", "walletdb").required();

  const bankBaseUrl = cfg
    .getString("integrationtest", "bank_base_url")
    .required();

  const exchangeBaseUrl = cfg
    .getString("integrationtest", "exchange_base_url")
    .required();

  const merchantBaseUrl = cfg
    .getString("integrationtest", "merchant_base_url")
    .required();

  const merchantApiKey = cfg
    .getString("integrationtest", "merchant_api_key")
    .required();

  const parsedWithdrawAmount = cfg
    .getAmount("integrationtest-basic", "amount_withdraw")
    .required();

  const parsedSpendAmount = cfg
    .getAmount("integrationtest-basic", "amount_spend")
    .required();

  const currency = parsedSpendAmount.currency;

  const myHttpLib = new NodeHttpLib();
  myHttpLib.setThrottling(false);

  const myWallet = await getDefaultNodeWallet({
    httpLib: myHttpLib,
    persistentStoragePath: walletDbPath,
  });

  myWallet.runRetryLoop().catch((e) => {
    console.error("exception during retry loop:", e);
  });

  logger.info("withdrawing test balance");
  await withdrawTestBalance(
    myWallet,
    Amounts.stringify(parsedWithdrawAmount),
    bankBaseUrl,
    exchangeBaseUrl,
  );
  logger.info("done withdrawing test balance");

  const balance = await myWallet.getBalances();

  console.log(JSON.stringify(balance, null, 2));

  const myMerchant = new MerchantBackendConnection(
    merchantBaseUrl,
    merchantApiKey,
  );

  await makePayment(
    myWallet,
    myMerchant,
    Amounts.stringify(parsedSpendAmount),
    "hello world",
  );

  // Wait until the refresh is done
  await myWallet.runUntilDone();

  console.log("withdrawing test balance for refund");
  const withdrawAmountTwo: AmountJson = {
    currency,
    value: 18,
    fraction: 0,
  };
  const spendAmountTwo: AmountJson = {
    currency,
    value: 7,
    fraction: 0,
  };

  const refundAmount: AmountJson = {
    currency,
    value: 6,
    fraction: 0,
  };

  const spendAmountThree: AmountJson = {
    currency,
    value: 3,
    fraction: 0,
  };

  await withdrawTestBalance(
    myWallet,
    Amounts.stringify(withdrawAmountTwo),
    bankBaseUrl,
    exchangeBaseUrl,
  );

  // Wait until the withdraw is done
  await myWallet.runUntilDone();

  const { orderId: refundOrderId } = await makePayment(
    myWallet,
    myMerchant,
    Amounts.stringify(spendAmountTwo),
    "order that will be refunded",
  );

  const refundUri = await myMerchant.refund(
    refundOrderId,
    "test refund",
    Amounts.stringify(refundAmount),
  );

  console.log("refund URI", refundUri);

  await myWallet.applyRefund(refundUri);

  // Wait until the refund is done
  await myWallet.runUntilDone();

  await makePayment(
    myWallet,
    myMerchant,
    Amounts.stringify(spendAmountThree),
    "payment after refund",
  );

  await myWallet.runUntilDone();

  console.log(
    "history after integration test:",
    JSON.stringify(history, undefined, 2),
  );
}
