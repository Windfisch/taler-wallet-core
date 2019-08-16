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

import { EmscEnvironment } from "./emscInterface";
import { CryptoImplementation } from "./cryptoImplementation";

import fs = require("fs");

/**
 * Worker implementation that uses node subprocesses.
 */
export class SynchronousCryptoWorker {
  private cachedEmscEnvironment: EmscEnvironment | undefined = undefined;
  private cachedEmscEnvironmentPromise:
    | Promise<EmscEnvironment>
    | undefined = undefined;

  /**
   * Function to be called when we receive a message from the worker thread.
   */
  onmessage: undefined | ((m: any) => void);

  /**
   * Function to be called when we receive an error from the worker thread.
   */
  onerror: undefined | ((m: any) => void);

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

  private async getWasmBinary(): Promise<Uint8Array> {
    // @ts-ignore
    const akonoGetData = global.__akono_getData;
    if (akonoGetData) {
      // We're running embedded node on Android
      console.log("reading wasm binary from akono");
      const data = akonoGetData("taler-emscripten-lib.wasm");
      // The data we get is base64-encoded binary data
      let buf = new Buffer(data, 'base64');
      return new Uint8Array(buf);

    } else {
      // We're in a normal node environment
      const binaryPath = __dirname + "/../../../emscripten/taler-emscripten-lib.wasm";
      console.log("reading from", binaryPath);
      const wasmBinary = new Uint8Array(fs.readFileSync(binaryPath));
      return wasmBinary;
    }
  }

  private async getEmscriptenEnvironment(): Promise<EmscEnvironment> {
    if (this.cachedEmscEnvironment) {
      return this.cachedEmscEnvironment;
    }

    if (this.cachedEmscEnvironmentPromise) {
      return this.cachedEmscEnvironmentPromise;
    }

    let lib: any;

    const wasmBinary = await this.getWasmBinary();

    return new Promise((resolve, reject) => {
      // Arguments passed to the emscripten prelude
      const libArgs = {
        wasmBinary,
        onRuntimeInitialized: () => {
          if (!lib) {
            console.error("fatal emscripten initialization error");
            return;
          }
          this.cachedEmscEnvironmentPromise = undefined;
          this.cachedEmscEnvironment = new EmscEnvironment(lib);
          resolve(this.cachedEmscEnvironment);
        },
      };

      // Make sure that TypeScript doesn't try
      // to check the taler-emscripten-lib.
      const indirectRequire = require;

      const g = global;

      // unavoidable hack, so that emscripten detects
      // the environment as node even though importScripts
      // is present.

      // @ts-ignore
      const savedImportScripts = g.importScripts;
      // @ts-ignore
      delete g.importScripts;
      // @ts-ignore
      const savedCrypto = g.crypto;
      // @ts-ignore
      delete g.crypto;

      // Assume that the code is run from the build/ directory.
      const libFn = indirectRequire(
        "../../../emscripten/taler-emscripten-lib.js",
      );
      lib = libFn(libArgs);

      // @ts-ignore
      g.importScripts = savedImportScripts;
      // @ts-ignore
      g.crypto = savedCrypto;

      if (!lib) {
        throw Error("could not load taler-emscripten-lib.js");
      }

      if (!lib.ccall) {
        throw Error(
          "sanity check failed: taler-emscripten lib does not have 'ccall'",
        );
      }
    });
  }

  private dispatchMessage(msg: any) {
    if (this.onmessage) {
      this.onmessage({ data: msg });
    }
  }

  private async handleRequest(operation: string, id: number, args: string[]) {
    let emsc = await this.getEmscriptenEnvironment();

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
    console.log("terminating synchronous worker (no-op)");
  }
}
