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
} from "../headless/helpers";
import { openPromise, OpenedPromise } from "../util/promiseUtils";
import fs from "fs";
import {
  HttpRequestLibrary,
  HttpResponse,
  HttpRequestOptions,
  Headers,
} from "../util/http";
import { NodeHttpLib } from "../headless/NodeHttpLib";
import { WalletNotification } from "../types/notifications";
import {
  WALLET_EXCHANGE_PROTOCOL_VERSION,
  WALLET_MERCHANT_PROTOCOL_VERSION,
} from "../operations/versions";

// @ts-ignore: special built-in module
//import akono = require("akono");

export {
  handleWorkerError,
  handleWorkerMessage,
} from "../crypto/workers/nodeThreadWorker";

export class AndroidHttpLib implements HttpRequestLibrary {
  useNfcTunnel = false;

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

  handleTunnelResponse(msg: any): void {
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

function sendAkonoMessage(m: string): void {
  // @ts-ignore
  globalThis.__akono_sendMessage(m);
}

class AndroidWalletMessageHandler {
  walletArgs: DefaultNodeWalletArgs | undefined;
  maybeWallet: Wallet | undefined;
  wp = openPromise<Wallet>();
  httpLib = new NodeHttpLib();

  /**
   * Handle a request from the Android wallet.
   */
  async handleMessage(operation: string, id: string, args: any): Promise<any> {
    switch (operation) {
      case "init": {
        this.walletArgs = {
          notifyHandler: async (notification: WalletNotification) => {
            sendAkonoMessage(
              JSON.stringify({ type: "notification", payload: notification }),
            );
          },
          persistentStoragePath: args.persistentStoragePath,
          httpLib: this.httpLib,
        };
        const w = await getDefaultNodeWallet(this.walletArgs);
        this.maybeWallet = w;
        w.runRetryLoop().catch((e) => {
          console.error("Error during wallet retry loop", e);
        });
        this.wp.resolve(w);
        return {
          supported_protocol_versions: {
            exchange: WALLET_EXCHANGE_PROTOCOL_VERSION,
            merchant: WALLET_MERCHANT_PROTOCOL_VERSION,
          },
        };
      }
      case "getTransactions": {
        const wallet = await this.wp.promise;
        return await wallet.getTransactions(args);
      }
      case "abortProposal": {
        const wallet = await this.wp.promise;
        if (typeof args.proposalId !== "string") {
          throw Error("propsalId must be a string");
        }
        return await wallet.refuseProposal(args.proposalId);
      }
      case "getBalances": {
        const wallet = await this.wp.promise;
        return await wallet.getBalances();
      }
      case "getPendingOperations": {
        const wallet = await this.wp.promise;
        return await wallet.getPendingOperations();
      }
      case "listExchanges": {
        const wallet = await this.wp.promise;
        return await wallet.getExchanges();
      }
      case "addExchange": {
        const wallet = await this.wp.promise;
        await wallet.updateExchangeFromUrl(args.exchangeBaseUrl);
        return {};
      }
      case "getWithdrawalDetailsForAmount": {
        const wallet = await this.wp.promise;
        return await wallet.getWithdrawalDetailsForAmount(args.exchangeBaseUrl, args.amount);
      }
      case "withdrawTestkudos": {
        const wallet = await this.wp.promise;
        try {
          await withdrawTestBalance(wallet);
        } catch (e) {
          console.log("error during withdrawTestBalance", e);
        }
        return {};
      }
      case "getHistory": {
        const wallet = await this.wp.promise;
        return await wallet.getHistory();
      }
      case "getExchangeTos": {
        const wallet = await this.wp.promise;
        const exchangeBaseUrl = args.exchangeBaseUrl;
        return wallet.getExchangeTos(exchangeBaseUrl);
      }
      case "setExchangeTosAccepted": {
        const wallet = await this.wp.promise;
        await wallet.acceptExchangeTermsOfService(args.exchangeBaseUrl, args.acceptedEtag);
        return {};
      }
      case "retryPendingNow": {
        const wallet = await this.wp.promise;
        await wallet.runPending(true);
        return {};
      }
      case "preparePay": {
        const wallet = await this.wp.promise;
        return await wallet.preparePayForUri(args.url);
        break;
      }
      case "confirmPay": {
        const wallet = await this.wp.promise;
        return await wallet.confirmPay(args.proposalId, args.sessionId);
      }
      case "createManualReserve": {
        const wallet = await this.wp.promise;
        const res = await wallet.createReserve(args);
        await wallet.confirmReserve({ reservePub: res.reservePub });
        return res;
      }
      case "startTunnel": {
        // this.httpLib.useNfcTunnel = true;
        throw Error("not implemented");
      }
      case "stopTunnel": {
        // this.httpLib.useNfcTunnel = false;
        throw Error("not implemented");
      }
      case "tunnelResponse": {
        // httpLib.handleTunnelResponse(msg.args);
        throw Error("not implemented");
      }
      case "getWithdrawDetailsForUri": {
        const wallet = await this.wp.promise;
        return await wallet.getWithdrawDetailsForUri(
          args.talerWithdrawUri,
          args.selectedExchange,
        );
      }
      case "applyRefund": {
        const wallet = await this.wp.promise;
        return await wallet.applyRefund(args.talerRefundUri);
      }
      case "acceptExchangeTermsOfService": {
        const wallet = await this.wp.promise;
        return await wallet.acceptExchangeTermsOfService(
          args.exchangeBaseUrl,
          args.etag,
        );
      }
      case "acceptWithdrawal": {
        const wallet = await this.wp.promise;
        return await wallet.acceptWithdrawal(
          args.talerWithdrawUri,
          args.selectedExchange,
        );
      }
      case "reset": {
        const oldArgs = this.walletArgs;
        this.walletArgs = { ...oldArgs };
        if (oldArgs && oldArgs.persistentStoragePath) {
          try {
            fs.unlinkSync(oldArgs.persistentStoragePath);
          } catch (e) {
            console.error("Error while deleting the wallet db:", e);
          }
          // Prevent further storage!
          this.walletArgs.persistentStoragePath = undefined;
        }
        const wallet = await this.wp.promise;
        wallet.stop();
        this.wp = openPromise<Wallet>();
        this.maybeWallet = undefined;
        const w = await getDefaultNodeWallet(this.walletArgs);
        this.maybeWallet = w;
        w.runRetryLoop().catch((e) => {
          console.error("Error during wallet retry loop", e);
        });
        this.wp.resolve(w);
        return {};
      }
      default:
        throw Error(`operation "${operation}" not understood`);
    }
  }
}

export function installAndroidWalletListener(): void {
  // @ts-ignore
  const sendMessage: (m: string) => void = globalThis.__akono_sendMessage;
  if (typeof sendMessage !== "function") {
    const errMsg =
      "FATAL: cannot install android wallet listener: akono functions missing";
    console.error(errMsg);
    throw new Error(errMsg);
  }
  const handler = new AndroidWalletMessageHandler();
  const onMessage = async (msgStr: any): Promise<void> => {
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

    try {
      const result = await handler.handleMessage(operation, id, msg.args);
      console.log(
        `android listener: sending success response for ${operation} (${id})`,
      );
      const respMsg = {
        type: "response",
        id,
        operation,
        isError: false,
        result,
      };
      sendMessage(JSON.stringify(respMsg));
    } catch (e) {
      const respMsg = {
        type: "response",
        id,
        operation,
        isError: true,
        result: { message: e.toString() },
      };
      sendMessage(JSON.stringify(respMsg));
      return;
    }
  };

  // @ts-ignore
  globalThis.__akono_onMessage = onMessage;

  console.log("android wallet listener installed");
}
