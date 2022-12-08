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
  AccessStats,
  DefaultNodeWalletArgs,
  getErrorDetailFromException,
  handleWorkerError,
  handleWorkerMessage,
  Headers,
  HttpRequestLibrary,
  HttpRequestOptions,
  HttpResponse,
  openPromise,
  openTalerDatabase,
  SetTimeoutTimerAPI,
  SynchronousCryptoWorkerFactoryPlain,
  Wallet,
  WalletApiOperation,
} from "@gnu-taler/taler-wallet-core";

import {
  CoreApiEnvelope,
  CoreApiResponse,
  CoreApiResponseSuccess,
  j2s,
  Logger,
  setGlobalLogLevelFromString,
  setPRNG,
  WalletNotification,
} from "@gnu-taler/taler-util";
import { BridgeIDBFactory } from "@gnu-taler/idb-bridge";
import { MemoryBackend } from "@gnu-taler/idb-bridge";
import { shimIndexedDB } from "@gnu-taler/idb-bridge";
import { IDBFactory } from "@gnu-taler/idb-bridge";

import * as _qjsOsImp from "os";

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

setGlobalLogLevelFromString("trace");

setPRNG(function (x: Uint8Array, n: number) {
  // @ts-ignore
  const va = globalThis._randomBytes(n);
  const v = new Uint8Array(va);
  for (let i = 0; i < n; i++) x[i] = v[i];
  for (let i = 0; i < v.length; i++) v[i] = 0;
});

export interface QjsHttpResp {
  status: number;
  data: ArrayBuffer;
}

export interface QjsHttpOptions {
  method: string;
  debug?: boolean;
  data?: ArrayBuffer;
  headers?: string[];
}

export interface QjsOsLib {
  // Not async!
  fetchHttp(url: string, options?: QjsHttpOptions): QjsHttpResp;
}

// This is not the nodejs "os" module, but the qjs "os" module.
const qjsOs: QjsOsLib = _qjsOsImp as any;

export { handleWorkerError, handleWorkerMessage };

const logger = new Logger("taler-wallet-embedded/index.ts");

export class NativeHttpLib implements HttpRequestLibrary {
  get(
    url: string,
    opt?: HttpRequestOptions | undefined,
  ): Promise<HttpResponse> {
    return this.fetch(url, {
      method: "GET",
      ...opt,
    });
  }
  postJson(
    url: string,
    body: any,
    opt?: HttpRequestOptions | undefined,
  ): Promise<HttpResponse> {
    return this.fetch(url, {
      method: "POST",
      body,
      ...opt,
    });
  }
  async fetch(
    url: string,
    opt?: HttpRequestOptions | undefined,
  ): Promise<HttpResponse> {
    const method = opt?.method ?? "GET";
    let data: ArrayBuffer | undefined = undefined;
    let headers: string[] = [];
    if (opt?.headers) {
      for (let headerName of Object.keys(opt.headers)) {
        headers.push(`${headerName}: ${opt.headers[headerName]}`);
      }
    }
    if (method.toUpperCase() === "POST") {
      if (opt?.body) {
        if (typeof opt.body === "string") {
          data = textEncoder.encode(opt.body).buffer;
        } else if (ArrayBuffer.isView(opt.body)) {
          data = opt.body.buffer;
        } else if (opt.body instanceof ArrayBuffer) {
          data = opt.body;
        } else if (typeof opt.body === "object") {
          data = textEncoder.encode(JSON.stringify(opt.body)).buffer;
        }
      } else {
        data = new ArrayBuffer(0);
      }
    }
    const res = qjsOs.fetchHttp(url, {
      method,
      data,
      headers,
    });
    return {
      requestMethod: method,
      headers: new Headers(),
      async bytes() {
        return res.data;
      },
      json() {
        const text = textDecoder.decode(res.data);
        return JSON.parse(text);
      },
      async text() {
        const text = textDecoder.decode(res.data);
        return text;
      },
      requestUrl: url,
      status: res.status,
    };
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

export async function getWallet(args: DefaultNodeWalletArgs = {}): Promise<{
  wallet: Wallet;
  getDbStats: () => AccessStats;
}> {
  BridgeIDBFactory.enableTracing = false;
  const myBackend = new MemoryBackend();
  myBackend.enableTracing = false;

  const storagePath = args.persistentStoragePath;
  if (storagePath) {
    // try {
    //   const dbContentStr: string = fs.readFileSync(storagePath, {
    //     encoding: "utf-8",
    //   });
    //   const dbContent = JSON.parse(dbContentStr);
    //   myBackend.importDump(dbContent);
    // } catch (e: any) {
    //   const code: string = e.code;
    //   if (code === "ENOENT") {
    //     logger.trace("wallet file doesn't exist yet");
    //   } else {
    //     logger.error("could not open wallet database file");
    //     throw e;
    //   }
    // }

    myBackend.afterCommitCallback = async () => {
      logger.error("DB commit not implemented");
      // logger.trace("committing database");
      // // Allow caller to stop persisting the wallet.
      // if (args.persistentStoragePath === undefined) {
      //   return;
      // }
      // const tmpPath = `${args.persistentStoragePath}-${makeId(5)}.tmp`;
      // const dbContent = myBackend.exportDump();
      // fs.writeFileSync(tmpPath, JSON.stringify(dbContent, undefined, 2), {
      //   encoding: "utf-8",
      // });
      // // Atomically move the temporary file onto the DB path.
      // fs.renameSync(tmpPath, args.persistentStoragePath);
      // logger.trace("committing database done");
    };
  }

  BridgeIDBFactory.enableTracing = false;

  const myBridgeIdbFactory = new BridgeIDBFactory(myBackend);
  const myIdbFactory: IDBFactory = myBridgeIdbFactory as any as IDBFactory;

  let myHttpLib;
  if (args.httpLib) {
    myHttpLib = args.httpLib;
  } else {
    myHttpLib = new NativeHttpLib();
  }

  const myVersionChange = (): Promise<void> => {
    logger.error("version change requested, should not happen");
    throw Error(
      "BUG: wallet DB version change event can't happen with memory IDB",
    );
  };

  shimIndexedDB(myBridgeIdbFactory);

  const myDb = await openTalerDatabase(myIdbFactory, myVersionChange);

  let workerFactory;
  workerFactory = new SynchronousCryptoWorkerFactoryPlain();

  const timer = new SetTimeoutTimerAPI();

  const w = await Wallet.create(myDb, myHttpLib, timer, workerFactory);

  if (args.notifyHandler) {
    w.addNotificationListener(args.notifyHandler);
  }
  return {
    wallet: w,
    getDbStats: () => myBackend.accessStats,
  };
}

class NativeWalletMessageHandler {
  walletArgs: DefaultNodeWalletArgs | undefined;
  maybeWallet: Wallet | undefined;
  wp = openPromise<Wallet>();
  httpLib = new NativeHttpLib();

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
      const wR = await getWallet(this.walletArgs);
      const w = wR.wallet;
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
            logger.error("FIXME: reset not implemented");
            // fs.unlinkSync(oldArgs.persistentStoragePath);
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
  setGlobalLogLevelFromString("trace");
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

// @ts-ignore
globalThis.installNativeWalletListener = installNativeWalletListener;

// @ts-ignore
globalThis.makeWallet = getWallet;

export async function testWithGv() {
  const w = await getWallet();
  await w.wallet.client.call(WalletApiOperation.InitWallet, {});
  await w.wallet.client.call(WalletApiOperation.RunIntegrationTest, {
    amountToSpend: "KUDOS:1",
    amountToWithdraw: "KUDOS:3",
    bankBaseUrl: "https://bank.demo.taler.net/demobanks/default/access-api/",
    exchangeBaseUrl: "https://exchange.demo.taler.net/",
    merchantBaseUrl: "https://backend.demo.taler.net/",
  });
  await w.wallet.runTaskLoop({
    stopWhenDone: true,
  });
}

export async function testWithLocal() {
  const w = await getWallet();
  await w.wallet.client.call(WalletApiOperation.InitWallet, {});
  await w.wallet.client.call(WalletApiOperation.RunIntegrationTest, {
    amountToSpend: "TESTKUDOS:1",
    amountToWithdraw: "TESTKUDOS:3",
    bankBaseUrl: "http://localhost:8082/",
    bankAccessApiBaseUrl: "http://localhost:8082/taler-bank-access/",
    exchangeBaseUrl: "http://localhost:8081/",
    merchantBaseUrl: "http://localhost:8083/",
  });
  await w.wallet.runTaskLoop({
    stopWhenDone: true,
  });
  w.wallet.stop();
}

// @ts-ignore
globalThis.testWithGv = testWithGv;
// @ts-ignore
globalThis.testWithLocal = testWithLocal;
