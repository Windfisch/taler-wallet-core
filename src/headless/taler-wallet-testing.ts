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

import { Wallet } from "../wallet";
import * as amounts from "../amounts";
import Axios from "axios";
import URI = require("urijs");

import { CheckPaymentResponse } from "../talerTypes";
import { getDefaultNodeWallet, withdrawTestBalance } from "./helpers";
import { Bank } from "./bank";

const enableTracing = false;

class MerchantBackendConnection {
  constructor(
    public merchantBaseUrl: string,
    public merchantInstance: string,
    public apiKey: string,
  ) {}

  async createOrder(
    amount: string,
    summary: string,
    fulfillmentUrl: string,
  ): Promise<{ orderId: string }> {
    const reqUrl = new URI("order").absoluteTo(this.merchantBaseUrl).href();
    const orderReq = {
      order: {
        amount,
        summary,
        fulfillment_url: fulfillmentUrl,
        instance: this.merchantInstance,
      },
    };
    const resp = await Axios({
      method: "post",
      url: reqUrl,
      data: orderReq,
      responseType: "json",
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
      },
    });
    if (resp.status != 200) {
      throw Error("failed to create bank reserve");
    }
    const orderId = resp.data.order_id;
    if (!orderId) {
      throw Error("no order id in response");
    }
    return { orderId };
  }

  async checkPayment(orderId: string): Promise<CheckPaymentResponse> {
    const reqUrl = new URI("check-payment")
      .absoluteTo(this.merchantBaseUrl)
      .href();
    const resp = await Axios({
      method: "get",
      url: reqUrl,
      params: { order_id: orderId, instance: this.merchantInstance },
      responseType: "json",
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
      },
    });
    if (resp.status != 200) {
      throw Error("failed to check payment");
    }
    return CheckPaymentResponse.checked(resp.data);
  }
}

export async function main() {
  const exchangeBaseUrl = "https://exchange.test.taler.net/";
  const bankBaseUrl = "https://bank.test.taler.net/";

  const myWallet = await getDefaultNodeWallet();

  await withdrawTestBalance(myWallet);

  const balance = await myWallet.getBalances();

  console.log(JSON.stringify(balance, null, 2));

  const myMerchant = new MerchantBackendConnection(
    "https://backend.test.taler.net/",
    "default",
    "sandbox",
  );

  const orderResp = await myMerchant.createOrder(
    "TESTKUDOS:5",
    "hello world",
    "https://example.com/",
  );

  console.log("created order with orderId", orderResp.orderId);

  const paymentStatus = await myMerchant.checkPayment(orderResp.orderId);

  console.log("payment status", paymentStatus);

  const contractUrl = paymentStatus.contract_url;
  if (!contractUrl) {
    throw Error("no contract URL in payment response");
  }

  const proposalId = await myWallet.downloadProposal(contractUrl);

  console.log("proposal id", proposalId);

  const checkPayResult = await myWallet.checkPay(proposalId);

  console.log("check pay result", checkPayResult);

  const confirmPayResult = await myWallet.confirmPay(proposalId, undefined);

  console.log("confirmPayResult", confirmPayResult);

  const paymentStatus2 = await myMerchant.checkPayment(orderResp.orderId);

  console.log("payment status after wallet payment:", paymentStatus2);

  if (!paymentStatus2.paid) {
    throw Error("payment did not succeed");
  }

  myWallet.stop();
}

if (require.main === module) {
  main().catch(err => {
    console.error("Failed with exception:");
    console.error(err);
  });
}
