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
import {
  DefaultNodeWalletArgs,
  getDefaultNodeWallet,
  getErrorDetailFromException,
  handleWorkerError,
  handleWorkerMessage,
  Headers,
  HttpRequestLibrary,
  HttpRequestOptions,
  HttpResponse,
  NodeHttpLib,
  OpenedPromise,
  openPromise,
  Wallet,
  WALLET_EXCHANGE_PROTOCOL_VERSION,
  WALLET_MERCHANT_PROTOCOL_VERSION,
} from "@gnu-taler/taler-wallet-core";

import {
  CoreApiEnvelope,
  CoreApiResponse,
  CoreApiResponseSuccess,
  Logger,
  WalletNotification,
} from "@gnu-taler/taler-util";
import fs from "fs";

export { handleWorkerError, handleWorkerMessage };

const logger = new Logger("taler-wallet-embedded/index.ts");

export class NativeHttpLib implements HttpRequestLibrary {
  useNfcTunnel = false;

  private nodeHttpLib: HttpRequestLibrary = new NodeHttpLib();

  private requestId = 1;

  private requestMap: {
    [id: number]: OpenedPromise<HttpResponse>;
  } = {};

  constructor(private sendMessage: (m: string) => void) {}

  fetch(url: string, opt?: HttpRequestOptions): Promise<HttpResponse> {
    return this.nodeHttpLib.fetch(url, opt);
  }

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
  ): Promise<HttpResponse> {
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
      logger.error(
        `no matching request for tunneled HTTP response, id=${myId}`,
      );
    }
    const headers = new Headers();
    if (msg.status != 0) {
      const resp: HttpResponse = {
        // FIXME: pass through this URL
        requestUrl: "",
        headers,
        status: msg.status,
        requestMethod: "FIXME",
        json: async () => JSON.parse(msg.responseText),
        text: async () => msg.responseText,
        bytes: async () => {
          throw Error("bytes() not supported for tunnel response");
        },
      };
      p.resolve(resp);
    } else {
      p.reject(new Error(`unexpected HTTP status code ${msg.status}`));
    }
    delete this.requestMap[myId];
  }
}

function sendNativeMessage(ev: CoreApiEnvelope): void {
  // @ts-ignore
  const sendMessage = globalThis.__native_sendMessage;
  if (typeof sendMessage !== "function") {
    const errMsg =
      "FATAL: cannot install native wallet listener: native functions missing";
    logger.error(errMsg);
    throw new Error(errMsg);
  }
  const m = JSON.stringify(ev);
  // @ts-ignore
  sendMessage(m);
}

class NativeWalletMessageHandler {
  walletArgs: DefaultNodeWalletArgs | undefined;
  maybeWallet: Wallet | undefined;
  wp = openPromise<Wallet>();
  httpLib = new NodeHttpLib();

  /**
   * Handle a request from the native wallet.
   */
  async handleMessage(
    operation: string,
    id: string,
    args: any,
  ): Promise<CoreApiResponse> {
    const wrapResponse = (result: unknown): CoreApiResponseSuccess => {
      return {
        type: "response",
        id,
        operation,
        result,
      };
    };

    let initResponse: any = {};

    const reinit = async () => {
      logger.info("in reinit");
      const w = await getDefaultNodeWallet(this.walletArgs);
      this.maybeWallet = w;
      const resp = await w.handleCoreApiRequest(
        "initWallet",
        "native-init",
        {},
      );
      initResponse = resp.type == "response" ? resp.result : resp.error;
      w.runTaskLoop().catch((e) => {
        logger.error(
          `Error during wallet retry loop: ${e.stack ?? e.toString()}`,
        );
      });
      this.wp.resolve(w);
    };

    switch (operation) {
      case "init": {
        this.walletArgs = {
          notifyHandler: async (notification: WalletNotification) => {
            sendNativeMessage({ type: "notification", payload: notification });
          },
          persistentStoragePath: args.persistentStoragePath,
          httpLib: this.httpLib,
          cryptoWorkerType: args.cryptoWorkerType,
        };
        await reinit();
        return wrapResponse({
          ...initResponse,
        });
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
      case "reset": {
        const oldArgs = this.walletArgs;
        this.walletArgs = { ...oldArgs };
        if (oldArgs && oldArgs.persistentStoragePath) {
          try {
            fs.unlinkSync(oldArgs.persistentStoragePath);
          } catch (e) {
            logger.error("Error while deleting the wallet db:", e);
          }
          // Prevent further storage!
          this.walletArgs.persistentStoragePath = undefined;
        }
        const wallet = await this.wp.promise;
        wallet.stop();
        this.wp = openPromise<Wallet>();
        this.maybeWallet = undefined;
        await reinit();
        return wrapResponse({});
      }
      default: {
        const wallet = await this.wp.promise;
        return await wallet.handleCoreApiRequest(operation, id, args);
      }
    }
  }
}

export function installNativeWalletListener(): void {
  const handler = new NativeWalletMessageHandler();
  const onMessage = async (msgStr: any): Promise<void> => {
    if (typeof msgStr !== "string") {
      logger.error("expected string as message");
      return;
    }
    const msg = JSON.parse(msgStr);
    const operation = msg.operation;
    if (typeof operation !== "string") {
      logger.error(
        "message to native wallet helper must contain operation of type string",
      );
      return;
    }
    const id = msg.id;
    logger.info(`native listener: got request for ${operation} (${id})`);

    try {
      const respMsg = await handler.handleMessage(operation, id, msg.args);
      logger.info(
        `native listener: sending success response for ${operation} (${id})`,
      );
      sendNativeMessage(respMsg);
    } catch (e) {
      const respMsg: CoreApiResponse = {
        type: "error",
        id,
        operation,
        error: getErrorDetailFromException(e),
      };
      sendNativeMessage(respMsg);
      return;
    }
  };

  // @ts-ignore
  globalThis.__native_onMessage = onMessage;

  logger.info("native wallet listener installed");
}
