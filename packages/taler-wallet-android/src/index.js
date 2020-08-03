"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.installAndroidWalletListener = exports.AndroidHttpLib = void 0;
const tslib_1 = require("tslib");
/**
 * Imports.
 */
const taler_wallet_core_1 = require("taler-wallet-core");
const promiseUtils_1 = require("../../taler-wallet-core/src/util/promiseUtils");
const fs_1 = tslib_1.__importDefault(require("fs"));
const http_1 = require("../../taler-wallet-core/src/util/http");
const NodeHttpLib_1 = require("../../taler-wallet-core/src/headless/NodeHttpLib");
const walletCoreApiHandler_1 = require("../../taler-wallet-core/src/walletCoreApiHandler");
const errors_1 = require("../../taler-wallet-core/src/operations/errors");
const TalerErrorCode_1 = require("../../taler-wallet-core/src/TalerErrorCode");
// @ts-ignore: special built-in module
//import akono = require("akono");
var nodeThreadWorker_1 = require("../../taler-wallet-core/src/crypto/workers/nodeThreadWorker");
Object.defineProperty(exports, "handleWorkerError", {
  enumerable: true,
  get: function () {
    return nodeThreadWorker_1.handleWorkerError;
  },
});
Object.defineProperty(exports, "handleWorkerMessage", {
  enumerable: true,
  get: function () {
    return nodeThreadWorker_1.handleWorkerMessage;
  },
});
class AndroidHttpLib {
  constructor(sendMessage) {
    this.sendMessage = sendMessage;
    this.useNfcTunnel = false;
    this.nodeHttpLib = new NodeHttpLib_1.NodeHttpLib();
    this.requestId = 1;
    this.requestMap = {};
  }
  get(url, opt) {
    if (this.useNfcTunnel) {
      const myId = this.requestId++;
      const p = promiseUtils_1.openPromise();
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
  postJson(url, body, opt) {
    if (this.useNfcTunnel) {
      const myId = this.requestId++;
      const p = promiseUtils_1.openPromise();
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
  handleTunnelResponse(msg) {
    const myId = msg.id;
    const p = this.requestMap[myId];
    if (!p) {
      console.error(
        `no matching request for tunneled HTTP response, id=${myId}`,
      );
    }
    const headers = new http_1.Headers();
    if (msg.status != 0) {
      const resp = {
        // FIXME: pass through this URL
        requestUrl: "",
        headers,
        status: msg.status,
        json: () =>
          tslib_1.__awaiter(this, void 0, void 0, function* () {
            return JSON.parse(msg.responseText);
          }),
        text: () =>
          tslib_1.__awaiter(this, void 0, void 0, function* () {
            return msg.responseText;
          }),
      };
      p.resolve(resp);
    } else {
      p.reject(new Error(`unexpected HTTP status code ${msg.status}`));
    }
    delete this.requestMap[myId];
  }
}
exports.AndroidHttpLib = AndroidHttpLib;
function sendAkonoMessage(ev) {
  // @ts-ignore
  const sendMessage = globalThis.__akono_sendMessage;
  if (typeof sendMessage !== "function") {
    const errMsg =
      "FATAL: cannot install android wallet listener: akono functions missing";
    console.error(errMsg);
    throw new Error(errMsg);
  }
  const m = JSON.stringify(ev);
  // @ts-ignore
  sendMessage(m);
}
class AndroidWalletMessageHandler {
  constructor() {
    this.wp = promiseUtils_1.openPromise();
    this.httpLib = new NodeHttpLib_1.NodeHttpLib();
  }
  /**
   * Handle a request from the Android wallet.
   */
  handleMessage(operation, id, args) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
      const wrapResponse = (result) => {
        return {
          type: "response",
          id,
          operation,
          result,
        };
      };
      switch (operation) {
        case "init": {
          this.walletArgs = {
            notifyHandler: (notification) =>
              tslib_1.__awaiter(this, void 0, void 0, function* () {
                sendAkonoMessage({
                  type: "notification",
                  payload: notification,
                });
              }),
            persistentStoragePath: args.persistentStoragePath,
            httpLib: this.httpLib,
          };
          const w = yield taler_wallet_core_1.getDefaultNodeWallet(
            this.walletArgs,
          );
          this.maybeWallet = w;
          w.runRetryLoop().catch((e) => {
            console.error("Error during wallet retry loop", e);
          });
          this.wp.resolve(w);
          return wrapResponse({
            supported_protocol_versions: {
              exchange:
                taler_wallet_core_1.versions.WALLET_EXCHANGE_PROTOCOL_VERSION,
              merchant:
                taler_wallet_core_1.versions.WALLET_MERCHANT_PROTOCOL_VERSION,
            },
          });
        }
        case "getHistory": {
          return wrapResponse({ history: [] });
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
          this.walletArgs = Object.assign({}, oldArgs);
          if (oldArgs && oldArgs.persistentStoragePath) {
            try {
              fs_1.default.unlinkSync(oldArgs.persistentStoragePath);
            } catch (e) {
              console.error("Error while deleting the wallet db:", e);
            }
            // Prevent further storage!
            this.walletArgs.persistentStoragePath = undefined;
          }
          const wallet = yield this.wp.promise;
          wallet.stop();
          this.wp = promiseUtils_1.openPromise();
          this.maybeWallet = undefined;
          const w = yield taler_wallet_core_1.getDefaultNodeWallet(
            this.walletArgs,
          );
          this.maybeWallet = w;
          w.runRetryLoop().catch((e) => {
            console.error("Error during wallet retry loop", e);
          });
          this.wp.resolve(w);
          return wrapResponse({});
        }
        default: {
          const wallet = yield this.wp.promise;
          return yield walletCoreApiHandler_1.handleCoreApiRequest(
            wallet,
            operation,
            id,
            args,
          );
        }
      }
    });
  }
}
function installAndroidWalletListener() {
  const handler = new AndroidWalletMessageHandler();
  const onMessage = (msgStr) =>
    tslib_1.__awaiter(this, void 0, void 0, function* () {
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
        const respMsg = yield handler.handleMessage(operation, id, msg.args);
        console.log(
          `android listener: sending success response for ${operation} (${id})`,
        );
        sendAkonoMessage(respMsg);
      } catch (e) {
        const respMsg = {
          type: "error",
          id,
          operation,
          error: errors_1.makeErrorDetails(
            TalerErrorCode_1.TalerErrorCode.WALLET_UNEXPECTED_EXCEPTION,
            "unexpected exception",
            {},
          ),
        };
        sendAkonoMessage(respMsg);
        return;
      }
    });
  // @ts-ignore
  globalThis.__akono_onMessage = onMessage;
  console.log("android wallet listener installed");
}
exports.installAndroidWalletListener = installAndroidWalletListener;
//# sourceMappingURL=index.js.map
