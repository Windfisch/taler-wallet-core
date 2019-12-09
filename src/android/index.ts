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
 * Imports.
 */
import { Wallet } from "../wallet";
import {
  getDefaultNodeWallet,
  withdrawTestBalance,
  DefaultNodeWalletArgs,
  NodeHttpLib,
} from "../headless/helpers";
import { openPromise, OpenedPromise } from "../util/promiseUtils";
import fs = require("fs");
import {
  HttpRequestLibrary,
  HttpResponse,
  HttpRequestOptions,
  Headers,
} from "../util/http";

// @ts-ignore: special built-in module
//import akono = require("akono");

export {
  handleWorkerError,
  handleWorkerMessage,
} from "../crypto/workers/nodeThreadWorker";

export class AndroidHttpLib implements HttpRequestLibrary {
  useNfcTunnel: boolean = false;

  private nodeHttpLib: HttpRequestLibrary = new NodeHttpLib();

  private requestId = 1;

  private requestMap: { [id: number]: OpenedPromise<HttpResponse> } = {};

  constructor(private sendMessage: (m: string) => void) {}

  get(url: string, opt?: HttpRequestOptions): Promise<HttpResponse> {
    if (this.useNfcTunnel) {
      const myId = this.requestId++;
      const p = openPromise<HttpResponse>();
      this.requestMap[myId] = p;
      const request = {
        method: "get",
        url,
      };
      this.sendMessage(
        JSON.stringify({
          type: "tunnelHttp",
          request,
          id: myId,
        }),
      );
      return p.promise;
    } else {
      return this.nodeHttpLib.get(url, opt);
    }
  }

  postJson(
    url: string,
    body: any,
    opt?: HttpRequestOptions,
  ): Promise<import("../util/http").HttpResponse> {
    if (this.useNfcTunnel) {
      const myId = this.requestId++;
      const p = openPromise<HttpResponse>();
      this.requestMap[myId] = p;
      const request = {
        method: "postJson",
        url,
        body,
      };
      this.sendMessage(
        JSON.stringify({ type: "tunnelHttp", request, id: myId }),
      );
      return p.promise;
    } else {
      return this.nodeHttpLib.postJson(url, body, opt);
    }
  }

  handleTunnelResponse(msg: any) {
    const myId = msg.id;
    const p = this.requestMap[myId];
    if (!p) {
      console.error(
        `no matching request for tunneled HTTP response, id=${myId}`,
      );
    }
    const headers = new Headers();
    if (msg.status != 0) {
      const resp: HttpResponse = {
        headers,
        status: msg.status,
        json: async () => JSON.parse(msg.responseText),
        text: async () => msg.responseText,
      };
      p.resolve(resp);
    } else {
      p.reject(new Error(`unexpected HTTP status code ${msg.status}`));
    }
    delete this.requestMap[myId];
  }
}

export function installAndroidWalletListener() {
  // @ts-ignore
  const sendMessage: (m: string) => void = globalThis.__akono_sendMessage;
  if (typeof sendMessage !== "function") {
    const errMsg =
      "FATAL: cannot install android wallet listener: akono functions missing";
    console.error(errMsg);
    throw new Error(errMsg);
  }
  let maybeWallet: Wallet | undefined;
  let wp = openPromise<Wallet>();
  let httpLib = new AndroidHttpLib(sendMessage);
  let walletArgs: DefaultNodeWalletArgs | undefined;
  const onMessage = async (msgStr: any) => {
    if (typeof msgStr !== "string") {
      console.error("expected string as message");
      return;
    }
    const msg = JSON.parse(msgStr);
    const operation = msg.operation;
    if (typeof operation !== "string") {
      console.error(
        "message to android wallet helper must contain operation of type string",
      );
      return;
    }
    const id = msg.id;
    console.log(`android listener: got request for ${operation} (${id})`);
    let result;
    switch (operation) {
      case "init": {
        walletArgs = {
          notifyHandler: async () => {
            sendMessage(JSON.stringify({ type: "notification" }));
          },
          persistentStoragePath: msg.args.persistentStoragePath,
          httpLib: httpLib,
        };
        const w = await getDefaultNodeWallet(walletArgs);
        maybeWallet = w;
        w.runRetryLoop().catch(e => {
          console.error("Error during wallet retry loop", e);
        });
        wp.resolve(w);
        result = true;
        break;
      }
      case "getBalances": {
        const wallet = await wp.promise;
        result = await wallet.getBalances();
        break;
      }
      case "getPendingOperations": {
        const wallet = await wp.promise;
        result = await wallet.getPendingOperations();
        break;
      }
      case "withdrawTestkudos": {
        const wallet = await wp.promise;
        try {
          await withdrawTestBalance(wallet);
        } catch (e) {
          console.log("error during withdrawTestBalance", e);
        }
        result = {};
        break;
      }
      case "getHistory": {
        const wallet = await wp.promise;
        result = await wallet.getHistory();
        break;
      }
      case "retryPendingNow": {
        const wallet = await wp.promise;
        await wallet.runPending(true);
        result = {};
        break;
      }
      case "preparePay": {
        const wallet = await wp.promise;
        result = await wallet.preparePay(msg.args.url);
        break;
      }
      case "confirmPay": {
        const wallet = await wp.promise;
        result = await wallet.confirmPay(
          msg.args.proposalId,
          msg.args.sessionId,
        );
        break;
      }
      case "startTunnel": {
        httpLib.useNfcTunnel = true;
        break;
      }
      case "stopTunnel": {
        httpLib.useNfcTunnel = false;
        break;
      }
      case "tunnelResponse": {
        httpLib.handleTunnelResponse(msg.args);
        break;
      }
      case "getWithdrawDetailsForUri": {
        const wallet = await wp.promise;
        result = await wallet.getWithdrawDetailsForUri(
          msg.args.talerWithdrawUri,
          msg.args.selectedExchange,
        );
        break;
      }
      case "acceptExchangeTermsOfService": {
        const wallet = await wp.promise;
        result = await wallet.acceptExchangeTermsOfService(
          msg.args.exchangeBaseUrl,
          msg.args.etag,
        );
        break;
      }
      case "acceptWithdrawal": {
        const wallet = await wp.promise;
        result = await wallet.acceptWithdrawal(
          msg.args.talerWithdrawUri,
          msg.args.selectedExchange,
        );
        break;
      }
      case "reset": {
        const oldArgs = walletArgs;
        walletArgs = { ...oldArgs };
        if (oldArgs && oldArgs.persistentStoragePath) {
          try {
            fs.unlinkSync(oldArgs.persistentStoragePath);
          } catch (e) {
            console.error("Error while deleting the wallet db:", e);
          }
          // Prevent further storage!
          walletArgs.persistentStoragePath = undefined;
        }
        const wallet = await wp.promise;
        wallet.stop();
        wp = openPromise<Wallet>();
        maybeWallet = undefined;
        const w = await getDefaultNodeWallet(walletArgs);
        maybeWallet = w;
        w.runRetryLoop().catch(e => {
          console.error("Error during wallet retry loop", e);
        });
        wp.resolve(w);
        result = {};
        break;
      }
      default:
        console.error(`operation "${operation}" not understood`);
        return;
    }

    console.log(`android listener: sending response for ${operation} (${id})`);

    const respMsg = { result, id, operation, type: "response" };
    sendMessage(JSON.stringify(respMsg));
  };
  // @ts-ignore
  globalThis.__akono_onMessage = onMessage;

  console.log("android wallet listener installed");
}
