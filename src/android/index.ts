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
import { openPromise, OpenedPromise } from "../promiseUtils";
import fs = require("fs");
import axios from "axios";
import { HttpRequestLibrary, HttpResponse } from "../http";
import querystring = require("querystring");

export class AndroidHttpLib implements HttpRequestLibrary {
  useNfcTunnel: boolean = false;

  private nodeHttpLib: HttpRequestLibrary = new NodeHttpLib();

  private requestId = 1;

  private requestMap: { [id: number]: OpenedPromise<HttpResponse> } = {};

  constructor(private sendMessage: (m: string) => void) {}

  get(url: string): Promise<HttpResponse> {
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
      return this.nodeHttpLib.get(url);
    }
  }

  postJson(url: string, body: any): Promise<import("../http").HttpResponse> {
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
      return this.nodeHttpLib.postJson(url, body);
    }
  }

  handleTunnelResponse(msg: any) {
    const myId = msg.id;
    const p = this.requestMap[myId];
    if (!p) {
      console.error(`no matching request for tunneled HTTP response, id=${myId}`);
    }
    if (msg.status == 200) {
      p.resolve({ responseJson: msg.responseJson, status: msg.status });
    } else {
      p.reject(new Error(`unexpected HTTP status code ${msg.status}`));
    }
    delete this.requestMap[myId];
  }
}

export function installAndroidWalletListener() {
  // @ts-ignore
  const sendMessage: (m: string) => void = global.__akono_sendMessage;
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
        maybeWallet = await getDefaultNodeWallet(walletArgs);
        wp.resolve(maybeWallet);
        result = true;
        break;
      }
      case "getBalances": {
        const wallet = await wp.promise;
        result = await wallet.getBalances();
        break;
      }
      case "withdrawTestkudos": {
        const wallet = await wp.promise;
        result = await withdrawTestBalance(wallet);
        break;
      }
      case "preparePay": {
        const wallet = await wp.promise;
        result = await wallet.preparePay(msg.args.url);
        break;
      }
      case "confirmPay": {
        const wallet = await wp.promise;
        result = await wallet.confirmPay(msg.args.proposalId, msg.args.sessionId);
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
      case "getWithdrawalInfo": {
        const wallet = await wp.promise;
        result = await wallet.getWithdrawalInfo(msg.args.talerWithdrawUri);
        break;
      }
      case "acceptWithdrawal": {
        const wallet = await wp.promise;
        result = await wallet.acceptWithdrawal(msg.args.talerWithdrawUri, msg.args.selectedExchange);
        break;
      }
      case "reset": {
        const wallet = await wp.promise;
        wallet.stop();
        wp = openPromise<Wallet>();
        if (walletArgs && walletArgs.persistentStoragePath) {
          try {
            fs.unlinkSync(walletArgs.persistentStoragePath);
          } catch (e) {
            console.error("Error while deleting the wallet db:", e);
          }
          // Prevent further storage!
          walletArgs.persistentStoragePath = undefined;
        }
        maybeWallet = undefined;
        break;
      }
      default:
        console.error(`operation "${operation}" not understood`);
        return;
    }

    const respMsg = { result, id, operation, type: "response" };
    console.log("sending message back", respMsg);
    sendMessage(JSON.stringify(respMsg));
  };
  // @ts-ignore
  globalThis.__akono_onMessage = onMessage;

  console.log("android wallet listener installed");
}
