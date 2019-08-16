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


// tslint:disable:no-var-requires

import fs = require("fs");
import vm = require("vm");
import { NodeEmscriptenLoader } from "./nodeEmscriptenLoader";
import { CryptoImplementation } from "./cryptoImplementation";

const loader = new NodeEmscriptenLoader();

async function handleRequest(operation: string, id: number, args: string[]) {
  let emsc = await loader.getEmscriptenEnvironment();

  const impl = new CryptoImplementation(emsc);

  if (!(operation in impl)) {
    console.error(`crypto operation '${operation}' not found`);
    return;
  }

  try {
    const result = (impl as any)[operation](...args);
    if (process.send) {
      process.send({ result, id });
    } else {
      console.error("process.send not available");
    }
  } catch (e) {
    console.log("error during operation", e);
    return;
  }
}

process.on("message", (msgStr: any) => {
  console.log("got message in node worker entry", msgStr);

  console.log("typeof msg", typeof msgStr);

  const msg = JSON.parse(msgStr);

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

  handleRequest(operation, id, args).catch((e) => {
    console.error("error in node worker", e);
  });
});

process.on("uncaughtException", (err: any) => {
  console.log("uncaught exception in node worker entry", err);
});
