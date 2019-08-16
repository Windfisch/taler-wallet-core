/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Web worker for crypto operations.
 */

/**
 * Imports.
 */

import { CryptoImplementation } from "./cryptoImplementation";
import { EmscEnvironment } from "./emscInterface";

const worker: Worker = (self as any) as Worker;

class BrowserEmscriptenLoader {
  private cachedEmscEnvironment: EmscEnvironment | undefined = undefined;
  private cachedEmscEnvironmentPromise:
    | Promise<EmscEnvironment>
    | undefined = undefined;

  async getEmscriptenEnvironment(): Promise<EmscEnvironment> {

    if (this.cachedEmscEnvironment) {
      return this.cachedEmscEnvironment;
    }

    if (this.cachedEmscEnvironmentPromise) {
      return this.cachedEmscEnvironmentPromise;
    }

    console.log("loading emscripten lib with 'importScripts'");
    // @ts-ignore
    self.TalerEmscriptenLib = {};
    // @ts-ignore
    importScripts('/emscripten/taler-emscripten-lib.js')
    // @ts-ignore
    if (!self.TalerEmscriptenLib) {
      throw Error("can't import taler emscripten lib");
    }
    const locateFile = (path: string, scriptDir: string) => {
      console.log("locating file", "path", path, "scriptDir", scriptDir);
      // This is quite hacky and assumes that our scriptDir is dist/
      return scriptDir + "../emscripten/" + path;
    };
    console.log("instantiating TalerEmscriptenLib");
    // @ts-ignore
    const lib = self.TalerEmscriptenLib({ locateFile });
    return new Promise((resolve, reject) => {
      lib.then((mod: any) => {
        this.cachedEmscEnvironmentPromise = undefined;
        const emsc = new EmscEnvironment(mod);
        this.cachedEmscEnvironment = new EmscEnvironment(mod);
        console.log("emscripten module fully loaded");
        resolve(emsc);
      });
    });
  }
}

let loader = new BrowserEmscriptenLoader();

async function handleRequest(operation: string, id: number, args: string[]) {
  let emsc = await loader.getEmscriptenEnvironment();

  const impl = new CryptoImplementation(emsc);

  if (!(operation in impl)) {
    console.error(`crypto operation '${operation}' not found`);
    return;
  }

  try {
    const result = (impl as any)[operation](...args);
    worker.postMessage({ result, id });
  } catch (e) {
    console.log("error during operation", e);
    return;
  }
}

worker.onmessage = (msg: MessageEvent) => {
  const args = msg.data.args;
  if (!Array.isArray(args)) {
    console.error("args must be array");
    return;
  }
  const id = msg.data.id;
  if (typeof id !== "number") {
    console.error("RPC id must be number");
    return;
  }
  const operation = msg.data.operation;
  if (typeof operation !== "string") {
    console.error("RPC operation must be string");
    return;
  }

  if (CryptoImplementation.enableTracing) {
    console.log("onmessage with", operation);
  }

  handleRequest(operation, id, args).catch((e) => {
    console.error("error in browsere worker", e);
  });
};