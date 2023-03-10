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
  base64FromArrayBuffer,
  ConfirmPayResultType,
  Logger,
  stringToBytes,
  TestPayResult,
  WithdrawTestBalanceRequest,
} from "@gnu-taler/taler-util";
import {
  HttpRequestLibrary,
  readSuccessResponseJsonOrThrow,
  checkSuccessResponseOrThrow,
} from "../util/http.js";
import {
  AmountString,
  codecForAny,
  CheckPaymentResponse,
  codecForCheckPaymentResponse,
  IntegrationTestArgs,
  Amounts,
  TestPayArgs,
  URL,
  PreparePayResultType,
} from "@gnu-taler/taler-util";
import { InternalWalletState } from "../internal-wallet-state.js";
import { applyRefund, confirmPay, preparePayForUri } from "./pay-merchant.js";
import { getBalances } from "./balance.js";
import { checkLogicInvariant } from "../util/invariants.js";
import { acceptWithdrawalFromUri } from "./withdraw.js";

const logger = new Logger("operations/testing.ts");

interface BankUser {
  username: string;
  password: string;
}

interface BankWithdrawalResponse {
  taler_withdraw_uri: string;
  withdrawal_id: string;
}

interface MerchantBackendInfo {
  baseUrl: string;
  authToken?: string;
}

/**
 * Generate a random alphanumeric ID.  Does *not* use cryptographically
 * secure randomness.
 */
function makeId(length: number): string {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Helper function to generate the "Authorization" HTTP header.
 * FIXME: redundant, put in taler-util
 */
function makeBasicAuthHeader(username: string, password: string): string {
  const auth = `${username}:${password}`;
  const authEncoded: string = base64FromArrayBuffer(stringToBytes(auth));
  return `Basic ${authEncoded}`;
}

export async function withdrawTestBalance(
  ws: InternalWalletState,
  req: WithdrawTestBalanceRequest,
): Promise<void> {
  const amount = req.amount;
  const exchangeBaseUrl = req.exchangeBaseUrl;
  const bankAccessApiBaseUrl = req.bankAccessApiBaseUrl ?? req.bankBaseUrl;

  logger.trace(
    `Registered bank user, bank access base url ${bankAccessApiBaseUrl}`,
  );
  const bankUser = await registerRandomBankUser(ws.http, bankAccessApiBaseUrl);
  logger.trace(`Registered bank user ${JSON.stringify(bankUser)}`);

  const wresp = await createDemoBankWithdrawalUri(
    ws.http,
    bankAccessApiBaseUrl,
    bankUser,
    amount,
  );

  await acceptWithdrawalFromUri(ws, {
    talerWithdrawUri: wresp.taler_withdraw_uri,
    selectedExchange: exchangeBaseUrl,
    forcedDenomSel: req.forcedDenomSel,
  });

  await confirmBankWithdrawalUri(
    ws.http,
    bankAccessApiBaseUrl,
    bankUser,
    wresp.withdrawal_id,
  );
}

function getMerchantAuthHeader(m: MerchantBackendInfo): Record<string, string> {
  if (m.authToken) {
    return {
      Authorization: `Bearer ${m.authToken}`,
    };
  }
  return {};
}

/**
 * Use the testing API of a demobank to create a taler://withdraw URI
 * that the wallet can then use to make a withdrawal.
 */
export async function createDemoBankWithdrawalUri(
  http: HttpRequestLibrary,
  bankAccessApiBaseUrl: string,
  bankUser: BankUser,
  amount: AmountString,
): Promise<BankWithdrawalResponse> {
  const reqUrl = new URL(
    `accounts/${bankUser.username}/withdrawals`,
    bankAccessApiBaseUrl,
  ).href;
  const resp = await http.postJson(
    reqUrl,
    {
      amount,
    },
    {
      headers: {
        Authorization: makeBasicAuthHeader(
          bankUser.username,
          bankUser.password,
        ),
      },
    },
  );
  const respJson = await readSuccessResponseJsonOrThrow(resp, codecForAny());
  return respJson;
}

async function confirmBankWithdrawalUri(
  http: HttpRequestLibrary,
  bankAccessApiBaseUrl: string,
  bankUser: BankUser,
  withdrawalId: string,
): Promise<void> {
  const reqUrl = new URL(
    `accounts/${bankUser.username}/withdrawals/${withdrawalId}/confirm`,
    bankAccessApiBaseUrl,
  ).href;
  const resp = await http.postJson(
    reqUrl,
    {},
    {
      headers: {
        Authorization: makeBasicAuthHeader(
          bankUser.username,
          bankUser.password,
        ),
      },
    },
  );
  await readSuccessResponseJsonOrThrow(resp, codecForAny());
  return;
}

async function registerRandomBankUser(
  http: HttpRequestLibrary,
  bankAccessApiBaseUrl: string,
): Promise<BankUser> {
  const reqUrl = new URL("testing/register", bankAccessApiBaseUrl).href;
  const randId = makeId(8);
  const bankUser: BankUser = {
    // euFin doesn't allow resource names to have upper case letters.
    username: `testuser-${randId.toLowerCase()}`,
    password: `testpw-${randId}`,
  };

  const resp = await http.postJson(reqUrl, bankUser);
  await checkSuccessResponseOrThrow(resp);
  return bankUser;
}

async function refund(
  http: HttpRequestLibrary,
  merchantBackend: MerchantBackendInfo,
  orderId: string,
  reason: string,
  refundAmount: string,
): Promise<string> {
  const reqUrl = new URL(
    `private/orders/${orderId}/refund`,
    merchantBackend.baseUrl,
  );
  const refundReq = {
    order_id: orderId,
    reason,
    refund: refundAmount,
  };
  const resp = await http.postJson(reqUrl.href, refundReq, {
    headers: getMerchantAuthHeader(merchantBackend),
  });
  const r = await readSuccessResponseJsonOrThrow(resp, codecForAny());
  const refundUri = r.taler_refund_uri;
  if (!refundUri) {
    throw Error("no refund URI in response");
  }
  return refundUri;
}

async function createOrder(
  http: HttpRequestLibrary,
  merchantBackend: MerchantBackendInfo,
  amount: string,
  summary: string,
  fulfillmentUrl: string,
): Promise<{ orderId: string }> {
  const t = Math.floor(new Date().getTime() / 1000) + 15 * 60;
  const reqUrl = new URL("private/orders", merchantBackend.baseUrl).href;
  const orderReq = {
    order: {
      amount,
      summary,
      fulfillment_url: fulfillmentUrl,
      refund_deadline: { t_s: t },
      wire_transfer_deadline: { t_s: t },
    },
  };
  const resp = await http.postJson(reqUrl, orderReq, {
    headers: getMerchantAuthHeader(merchantBackend),
  });
  const r = await readSuccessResponseJsonOrThrow(resp, codecForAny());
  const orderId = r.order_id;
  if (!orderId) {
    throw Error("no order id in response");
  }
  return { orderId };
}

async function checkPayment(
  http: HttpRequestLibrary,
  merchantBackend: MerchantBackendInfo,
  orderId: string,
): Promise<CheckPaymentResponse> {
  const reqUrl = new URL(`private/orders/${orderId}`, merchantBackend.baseUrl);
  reqUrl.searchParams.set("order_id", orderId);
  const resp = await http.get(reqUrl.href, {
    headers: getMerchantAuthHeader(merchantBackend),
  });
  return readSuccessResponseJsonOrThrow(resp, codecForCheckPaymentResponse());
}

interface BankUser {
  username: string;
  password: string;
}

interface BankWithdrawalResponse {
  taler_withdraw_uri: string;
  withdrawal_id: string;
}

async function makePayment(
  ws: InternalWalletState,
  merchant: MerchantBackendInfo,
  amount: string,
  summary: string,
): Promise<{ orderId: string }> {
  const orderResp = await createOrder(
    ws.http,
    merchant,
    amount,
    summary,
    "taler://fulfillment-success/thx",
  );

  logger.trace("created order with orderId", orderResp.orderId);

  let paymentStatus = await checkPayment(ws.http, merchant, orderResp.orderId);

  logger.trace("payment status", paymentStatus);

  const talerPayUri = paymentStatus.taler_pay_uri;
  if (!talerPayUri) {
    throw Error("no taler://pay/ URI in payment response");
  }

  const preparePayResult = await preparePayForUri(ws, talerPayUri);

  logger.trace("prepare pay result", preparePayResult);

  if (preparePayResult.status != "payment-possible") {
    throw Error("payment not possible");
  }

  const confirmPayResult = await confirmPay(
    ws,
    preparePayResult.proposalId,
    undefined,
  );

  logger.trace("confirmPayResult", confirmPayResult);

  paymentStatus = await checkPayment(ws.http, merchant, orderResp.orderId);

  logger.trace("payment status after wallet payment:", paymentStatus);

  if (paymentStatus.order_status !== "paid") {
    throw Error("payment did not succeed");
  }

  return {
    orderId: orderResp.orderId,
  };
}

export async function runIntegrationTest(
  ws: InternalWalletState,
  args: IntegrationTestArgs,
): Promise<void> {
  logger.info("running test with arguments", args);

  const parsedSpendAmount = Amounts.parseOrThrow(args.amountToSpend);
  const currency = parsedSpendAmount.currency;

  logger.info("withdrawing test balance");
  await withdrawTestBalance(ws, {
    amount: args.amountToWithdraw,
    bankBaseUrl: args.bankBaseUrl,
    bankAccessApiBaseUrl: args.bankAccessApiBaseUrl ?? args.bankBaseUrl,
    exchangeBaseUrl: args.exchangeBaseUrl,
  });
  await ws.runUntilDone();
  logger.info("done withdrawing test balance");

  const balance = await getBalances(ws);

  logger.trace(JSON.stringify(balance, null, 2));

  const myMerchant: MerchantBackendInfo = {
    baseUrl: args.merchantBaseUrl,
    authToken: args.merchantAuthToken,
  };

  await makePayment(ws, myMerchant, args.amountToSpend, "hello world");

  // Wait until the refresh is done
  await ws.runUntilDone();

  logger.trace("withdrawing test balance for refund");
  const withdrawAmountTwo = Amounts.parseOrThrow(`${currency}:18`);
  const spendAmountTwo = Amounts.parseOrThrow(`${currency}:7`);
  const refundAmount = Amounts.parseOrThrow(`${currency}:6`);
  const spendAmountThree = Amounts.parseOrThrow(`${currency}:3`);

  await withdrawTestBalance(ws, {
    amount: Amounts.stringify(withdrawAmountTwo),
    bankBaseUrl: args.bankBaseUrl,
    bankAccessApiBaseUrl: args.bankAccessApiBaseUrl ?? args.bankBaseUrl,
    exchangeBaseUrl: args.exchangeBaseUrl,
  });

  // Wait until the withdraw is done
  await ws.runUntilDone();

  const { orderId: refundOrderId } = await makePayment(
    ws,
    myMerchant,
    Amounts.stringify(spendAmountTwo),
    "order that will be refunded",
  );

  const refundUri = await refund(
    ws.http,
    myMerchant,
    refundOrderId,
    "test refund",
    Amounts.stringify(refundAmount),
  );

  logger.trace("refund URI", refundUri);

  await applyRefund(ws, refundUri);

  logger.trace("integration test: applied refund");

  // Wait until the refund is done
  await ws.runUntilDone();

  logger.trace("integration test: making payment after refund");

  await makePayment(
    ws,
    myMerchant,
    Amounts.stringify(spendAmountThree),
    "payment after refund",
  );

  logger.trace("integration test: make payment done");

  await ws.runUntilDone();

  logger.trace("integration test: all done!");
}

export async function testPay(
  ws: InternalWalletState,
  args: TestPayArgs,
): Promise<TestPayResult> {
  logger.trace("creating order");
  const merchant = {
    authToken: args.merchantAuthToken,
    baseUrl: args.merchantBaseUrl,
  };
  const orderResp = await createOrder(
    ws.http,
    merchant,
    args.amount,
    args.summary,
    "taler://fulfillment-success/thank+you",
  );
  logger.trace("created new order with order ID", orderResp.orderId);
  const checkPayResp = await checkPayment(ws.http, merchant, orderResp.orderId);
  const talerPayUri = checkPayResp.taler_pay_uri;
  if (!talerPayUri) {
    console.error("fatal: no taler pay URI received from backend");
    process.exit(1);
  }
  logger.trace("taler pay URI:", talerPayUri);
  const result = await preparePayForUri(ws, talerPayUri);
  if (result.status !== PreparePayResultType.PaymentPossible) {
    throw Error(`unexpected prepare pay status: ${result.status}`);
  }
  const r = await confirmPay(
    ws,
    result.proposalId,
    undefined,
    args.forcedCoinSel,
  );
  if (r.type != ConfirmPayResultType.Done) {
    throw Error("payment not done");
  }
  const purchase = await ws.db
    .mktx((x) => [x.purchases])
    .runReadOnly(async (tx) => {
      return tx.purchases.get(result.proposalId);
    });
  checkLogicInvariant(!!purchase);
  return {
    payCoinSelection: purchase.payInfo?.payCoinSelection!,
  };
}
