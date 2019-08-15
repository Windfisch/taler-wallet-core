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

import * as emscLoader from "./emscLoader";

import { CryptoImplementation } from "./cryptoImplementation";
import { EmscEnvironment } from "./emscInterface";

const worker: Worker = (self as any) as Worker;

let impl: CryptoImplementation | undefined;


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

  emscLoader.getLib().then(p => {
    const lib = p.lib;
    const emsc = new EmscEnvironment(lib);
    const impl = new CryptoImplementation(emsc);

    if (!(operation in impl)) {
      console.error(`unknown operation: '${operation}'`);
      return;
    }

    if (CryptoImplementation.enableTracing) {
      console.log("about to execute", operation);
    }

    const result = (impl as any)[operation](...args);

    if (CryptoImplementation.enableTracing) {
      console.log("finished executing", operation);
    }
    worker.postMessage({ result, id });
  });
};
