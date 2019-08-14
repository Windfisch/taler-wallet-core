/*
 This file is part of TALER
 (C) 2019 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { MemoryBackend, BridgeIDBFactory, shimIndexedDB } from "idb-bridge";
import { Wallet } from "../wallet";
import { Notifier, Badge } from "../walletTypes";
import { openTalerDb, exportDb } from "../db";
import { HttpRequestLibrary } from "../http";
import * as amounts from "../amounts";
import Axios from "axios";

import URI = require("urijs");

import querystring = require("querystring");
import { CheckPaymentResponse } from "../talerTypes";

const enableTracing = false;

class ConsoleNotifier implements Notifier {
  notify(): void {
    // nothing to do.
  }
}

class ConsoleBadge implements Badge {
  startBusy(): void {
    enableTracing && console.log("NOTIFICATION: busy");
  }
  stopBusy(): void {
    enableTracing && console.log("NOTIFICATION: busy end");
  }
  showNotification(): void {
    enableTracing && console.log("NOTIFICATION: show");
  }
  clearNotification(): void {
    enableTracing && console.log("NOTIFICATION: cleared");
  }
}

export class NodeHttpLib implements HttpRequestLibrary {
  async get(url: string): Promise<import("../http").HttpResponse> {
    enableTracing && console.log("making GET request to", url);
    const resp = await Axios({
      method: "get",
      url: url,
      responseType: "json",
    });
    enableTracing && console.log("got response", resp.data);
    enableTracing && console.log("resp type", typeof resp.data);
    return {
      responseJson: resp.data,
      status: resp.status,
    };
  }

  async postJson(
    url: string,
    body: any,
  ): Promise<import("../http").HttpResponse> {
    enableTracing && console.log("making POST request to", url);
    const resp = await Axios({
      method: "post",
      url: url,
      responseType: "json",
      data: body,
    });
    enableTracing && console.log("got response", resp.data);
    enableTracing && console.log("resp type", typeof resp.data);
    return {
      responseJson: resp.data,
      status: resp.status,
    };
  }

  async postForm(
    url: string,
    form: any,
  ): Promise<import("../http").HttpResponse> {
    enableTracing && console.log("making POST request to", url);
    const resp = await Axios({
      method: "post",
      url: url,
      data: querystring.stringify(form),
      responseType: "json",
    });
    enableTracing && console.log("got response", resp.data);
    enableTracing && console.log("resp type", typeof resp.data);
    return {
      responseJson: resp.data,
      status: resp.status,
    };
  }
}

interface BankUser {
  username: string;
  password: string;
}

function makeId(length: number): string {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

async function registerBankUser(
  bankBaseUrl: string,
  httpLib: HttpRequestLibrary,
): Promise<BankUser> {
  const reqUrl = new URI("register").absoluteTo(bankBaseUrl).href();
  const randId = makeId(8);
  const bankUser: BankUser = {
    username: `testuser-${randId}`,
    password: `testpw-${randId}`,
  };
  const result = await httpLib.postForm(reqUrl, bankUser);
  if (result.status != 200) {
    throw Error("could not register bank user");
  }
  return bankUser;
}

async function createBankReserve(
  bankBaseUrl: string,
  bankUser: BankUser,
  amount: string,
  reservePub: string,
  exchangePaytoUri: string,
  httpLib: HttpRequestLibrary,
) {
  const reqUrl = new URI("taler/withdraw").absoluteTo(bankBaseUrl).href();

  const body = {
    auth: { type: "basic" },
    username: bankUser,
    amount,
    reserve_pub: reservePub,
    exchange_wire_detail: exchangePaytoUri,
  };

  const resp = await Axios({
    method: "post",
    url: reqUrl,
    data: body,
    responseType: "json",
    headers: {
      "X-Taler-Bank-Username": bankUser.username,
      "X-Taler-Bank-Password": bankUser.password,
    },
  });

  if (resp.status != 200) {
    throw Error("failed to create bank reserve");
  }
}

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
  const myNotifier = new ConsoleNotifier();

  const myBadge = new ConsoleBadge();

  const myBackend = new MemoryBackend();

  myBackend.enableTracing = false;

  BridgeIDBFactory.enableTracing = false;

  const myBridgeIdbFactory = new BridgeIDBFactory(myBackend);
  const myIdbFactory: IDBFactory = (myBridgeIdbFactory as any) as IDBFactory;

  const myHttpLib = new NodeHttpLib();

  const myVersionChange = () => {
    console.error("version change requested, should not happen");
    throw Error();
  };

  const myUnsupportedUpgrade = () => {
    console.error("unsupported database migration");
    throw Error();
  };

  shimIndexedDB(myBridgeIdbFactory);

  const exchangeBaseUrl = "https://exchange.test.taler.net/";
  const bankBaseUrl = "https://bank.test.taler.net/";

  const myDb = await openTalerDb(
    myIdbFactory,
    myVersionChange,
    myUnsupportedUpgrade,
  );

  const myWallet = new Wallet(myDb, myHttpLib, myBadge, myNotifier);

  const reserveResponse = await myWallet.createReserve({
    amount: amounts.parseOrThrow("TESTKUDOS:10.0"),
    exchange: exchangeBaseUrl,
  });

  const bankUser = await registerBankUser(bankBaseUrl, myHttpLib);

  console.log("bank user", bankUser);

  const exchangePaytoUri = await myWallet.getExchangePaytoUri(
    "https://exchange.test.taler.net/",
    ["x-taler-bank"],
  );

  await createBankReserve(
    bankBaseUrl,
    bankUser,
    "TESTKUDOS:10.0",
    reserveResponse.reservePub,
    exchangePaytoUri,
    myHttpLib,
  );

  await myWallet.confirmReserve({ reservePub: reserveResponse.reservePub });

  await myWallet.processReserve(reserveResponse.reservePub);

  console.log("process reserve returned");

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
