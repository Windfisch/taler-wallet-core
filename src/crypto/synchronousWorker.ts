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

import { CryptoImplementation } from "./cryptoImplementation";

import { NodeEmscriptenLoader } from "./nodeEmscriptenLoader";

import fs = require("fs");
import { CryptoWorkerFactory } from "./cryptoApi";
import { CryptoWorker } from "./cryptoWorker";

/**
 * The synchronous crypto worker produced by this factory doesn't run in the
 * background, but actually blocks the caller until the operation is done.
 */
export class SynchronousCryptoWorkerFactory implements CryptoWorkerFactory {
  startWorker(): CryptoWorker {
    if (typeof require === "undefined") {
      throw Error("cannot make worker, require(...) not defined");
    }
    const workerCtor = require("./synchronousWorker").SynchronousCryptoWorker;
    return new workerCtor();
  }

  getConcurrency(): number {
    return 1;
  }
}


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

  private emscriptenLoader = new NodeEmscriptenLoader();

  constructor() {
    this.onerror = undefined;
    this.onmessage = undefined;
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

  private dispatchMessage(msg: any) {
    if (this.onmessage) {
      this.onmessage({ data: msg });
    }
  }

  private async handleRequest(operation: string, id: number, args: string[]) {
    let emsc = await this.emscriptenLoader.getEmscriptenEnvironment();

    const impl = new CryptoImplementation(emsc);

    if (!(operation in impl)) {
      console.error(`crypto operation '${operation}' not found`);
      return;
    }

    try {
      const result = (impl as any)[operation](...args);
      this.dispatchMessage({ result, id });
    } catch (e) {
      console.log("error during operation", e);
      return;
    }
  }

  /**
   * Send a message to the worker thread.
   */
  postMessage(msg: any) {
    const args = msg.args;
    if (!Array.isArray(args)) {
      console.error("args must be array");
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

    this.handleRequest(operation, id, args).catch(e => {
      console.error("Error while handling crypto request:", e);
    });
  }

  /**
   * Forcibly terminate the worker thread.
   */
  terminate() {
    // This is a no-op.
  }
}
