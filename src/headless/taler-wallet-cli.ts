import { MemoryBackend, BridgeIDBFactory, shimIndexedDB } from "idb-bridge";
import { Wallet } from "../wallet";
import { Notifier, Badge } from "../walletTypes";
import { openTalerDb, exportDb } from "../db";
import { HttpRequestLibrary } from "../http";
import * as amounts from "../amounts";
import Axios from "axios";

import URI = require("urijs");

import querystring = require("querystring");

class ConsoleNotifier implements Notifier {
  notify(): void {
    // nothing to do.
  }
}

class ConsoleBadge implements Badge {
  startBusy(): void {
    console.log("NOTIFICATION: busy");
  }
  stopBusy(): void {
    console.log("NOTIFICATION: busy end");
  }
  showNotification(): void {
    console.log("NOTIFICATION: show");
  }
  clearNotification(): void {
    console.log("NOTIFICATION: cleared");
  }
}

export class NodeHttpLib implements HttpRequestLibrary {
  async get(url: string): Promise<import("../http").HttpResponse> {
    console.log("making GET request to", url);
    const resp = await Axios({
      method: "get",
      url: url,
      responseType: "json",
    });
    console.log("got response", resp.data);
    console.log("resp type", typeof resp.data);
    return {
      responseJson: resp.data,
      status: resp.status,
    };
  }

  async postJson(
    url: string,
    body: any,
  ): Promise<import("../http").HttpResponse> {
    console.log("making POST request to", url);
    const resp = await Axios({
      method: "post",
      url: url,
      responseType: "json",
      data: body,
    });
    console.log("got response", resp.data);
    console.log("resp type", typeof resp.data);
    return {
      responseJson: resp.data,
      status: resp.status,
    };
  }

  async postForm(
    url: string,
    form: any,
  ): Promise<import("../http").HttpResponse> {
    console.log("making POST request to", url);
    const resp = await Axios({
      method: "post",
      url: url,
      data: querystring.stringify(form),
      responseType: "json",
    });
    console.log("got response", resp.data);
    console.log("resp type", typeof resp.data);
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

async function main() {
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

  //await myWallet.waitForReserveDrained(reserveResponse.reservePub);

  //myWallet.clearNotification();

  //myWallet.stop();

  const dbContents = await exportDb(myDb);

  console.log("db:", JSON.stringify(dbContents, null, 2));
}

main().catch(err => {
  console.error("Failed with exception:");
  console.error(err);
});
