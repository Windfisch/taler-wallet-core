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

import { Logger } from "@gnu-taler/taler-util";
import {
  nativeCryptoR,
  TalerCryptoInterfaceR,
} from "../cryptoImplementation.js";
import { CryptoRpcClient } from "./rpcClient.js";

const logger = new Logger("synchronousWorker.ts");

/**
 * Worker implementation that uses node subprocesses.
 */
export class SynchronousCryptoWorker {
  /**
   * Function to be called when we receive a message from the worker thread.
   */
  onmessage: undefined | ((m: any) => void);

  /**
   * Function to be called when we receive an error from the worker thread.
   */
  onerror: undefined | ((m: any) => void);

  cryptoImplR: TalerCryptoInterfaceR;

  rpcClient: CryptoRpcClient | undefined;

  constructor() {
    this.onerror = undefined;
    this.onmessage = undefined;

    this.cryptoImplR = { ...nativeCryptoR };

    if (process.env["TALER_WALLET_PRIMITIVE_WORKER"]) {
      logger.info("using RPC for some crypto operations");
      const rpc = (this.rpcClient = new CryptoRpcClient());
      this.cryptoImplR.eddsaSign = async (_, req) => {
        return await rpc.queueRequest({
          op: "eddsa_sign",
          args: {
            msg: req.msg,
            priv: req.priv,
          },
        });
      };
      this.cryptoImplR.setupRefreshPlanchet = async (_, req) => {
        const res = await rpc.queueRequest({
          op: "setup_refresh_planchet",
          args: {
            coin_index: req.coinNumber,
            transfer_secret: req.transferSecret,
          },
        });
        return {
          bks: res.blinding_key,
          coinPriv: res.coin_priv,
          coinPub: res.coin_pub,
        };
      };
      this.cryptoImplR.rsaBlind = async (_, req) => {
        const res = await rpc.queueRequest({
          op: "rsa_blind",
          args: {
            bks: req.bks,
            hm: req.hm,
            pub: req.pub,
          },
        });
        return {
          blinded: res.blinded,
        };
      };
      this.cryptoImplR.keyExchangeEcdheEddsa = async (_, req) => {
        const res = await rpc.queueRequest({
          op: "kx_ecdhe_eddsa",
          args: {
            ecdhe_priv: req.ecdhePriv,
            eddsa_pub: req.eddsaPub,
          },
        });
        return {
          h: res.h,
        };
      };
      this.cryptoImplR.eddsaGetPublic = async (_, req) => {
        const res = await rpc.queueRequest({
          op: "eddsa_get_public",
          args: {
            eddsa_priv: req.priv,
          },
        });
        return {
          pub: res.eddsa_pub,
        };
      };
      this.cryptoImplR.ecdheGetPublic = async (_, req) => {
        const res = await rpc.queueRequest({
          op: "ecdhe_get_public",
          args: {
            ecdhe_priv: req.priv,
          },
        });
        return {
          pub: res.ecdhe_pub,
        };
      };
    }
  }

  /**
   * Add an event listener for either an "error" or "message" event.
   */
  addEventListener(event: "message" | "error", fn: (x: any) => void): void {
    switch (event) {
      case "message":
        this.onmessage = fn;
        break;
      case "error":
        this.onerror = fn;
        break;
    }
  }

  private dispatchMessage(msg: any): void {
    if (this.onmessage) {
      this.onmessage({ data: msg });
    }
  }

  private async handleRequest(
    operation: string,
    id: number,
    req: unknown,
  ): Promise<void> {
    const impl = this.cryptoImplR;

    if (!(operation in impl)) {
      console.error(`crypto operation '${operation}' not found`);
      return;
    }

    let result: any;
    try {
      result = await (impl as any)[operation](impl, req);
    } catch (e: any) {
      logger.error(`error during operation '${operation}': ${e}`);
      return;
    }

    try {
      setTimeout(() => this.dispatchMessage({ result, id }), 0);
    } catch (e) {
      logger.error("got error during dispatch", e);
    }
  }

  /**
   * Send a message to the worker thread.
   */
  postMessage(msg: any): void {
    const req = msg.req;
    if (typeof req !== "object") {
      console.error("request must be an object");
      return;
    }
    const id = msg.id;
    if (typeof id !== "number") {
      console.error("RPC id must be number");
      return;
    }
    const operation = msg.operation;
    if (typeof operation !== "string") {
      console.error("RPC operation must be string");
      return;
    }

    this.handleRequest(operation, id, req).catch((e) => {
      console.error("Error while handling crypto request:", e);
    });
  }

  /**
   * Forcibly terminate the worker thread.
   */
  terminate(): void {
    // This is a no-op.
  }
}
