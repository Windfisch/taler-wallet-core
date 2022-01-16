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

import {
  PrimitiveWorker,
} from "./cryptoImplementation.js";

import { CryptoWorkerFactory } from "./cryptoApi.js";
import { CryptoWorker } from "./cryptoWorkerInterface.js";

import child_process from "child_process";
import type internal from "stream";
import { OpenedPromise, openPromise } from "../../index.js";
import { Logger } from "@gnu-taler/taler-util";
import { SynchronousCryptoWorker } from "./synchronousWorker.js";

const logger = new Logger("synchronousWorkerFactory.ts");

class MyPrimitiveWorker implements PrimitiveWorker {
  proc: child_process.ChildProcessByStdio<
    internal.Writable,
    internal.Readable,
    null
  >;
  requests: Array<{
    p: OpenedPromise<any>;
    req: any;
  }> = [];

  constructor() {
    const stdoutChunks: Buffer[] = [];
    this.proc = child_process.spawn("taler-crypto-worker", {
      //stdio: ["pipe", "pipe", "inherit"],
      stdio: ["pipe", "pipe", "inherit"],
      detached: true,
    });
    this.proc.on("close", (): void => {
      logger.error("child process exited");
    });
    (this.proc.stdout as any).unref();
    (this.proc.stdin as any).unref();
    this.proc.unref();

    this.proc.stdout.on("data", (x) => {
      // console.log("got chunk", x.toString("utf-8"));
      if (x instanceof Buffer) {
        const nlIndex = x.indexOf("\n");
        if (nlIndex >= 0) {
          const before = x.slice(0, nlIndex);
          const after = x.slice(nlIndex + 1);
          stdoutChunks.push(after);
          const str = Buffer.concat([...stdoutChunks, before]).toString(
            "utf-8",
          );
          const req = this.requests.shift();
          if (!req) {
            throw Error("request was undefined")
          }
          if (this.requests.length === 0) {
            this.proc.unref();
          }
          //logger.info(`got response: ${str}`);
          req.p.resolve(JSON.parse(str));
        } else {
          stdoutChunks.push(x);
        }
      } else {
        throw Error(`unexpected data chunk type (${typeof x})`);
      }
    });
  }

  async setupRefreshPlanchet(req: {
    transfer_secret: string;
    coin_index: number;
  }): Promise<{
    coin_pub: string;
    coin_priv: string;
    blinding_key: string;
  }> {
    return this.queueRequest({
      op: "setup_refresh_planchet",
      args: req,
    });
  }

  async queueRequest(req: any): Promise<any> {
    const p = openPromise<any>();
    if (this.requests.length === 0) {
      this.proc.ref();
    }
    this.requests.push({ req, p });
    this.proc.stdin.write(`${JSON.stringify(req)}\n`);
    return p.promise;
  }

  async eddsaVerify(req: {
    msg: string;
    sig: string;
    pub: string;
  }): Promise<{ valid: boolean }> {
    return this.queueRequest({
      op: "eddsa_verify",
      args: req,
    });
  }

  async eddsaSign(req: {
    msg: string;
    priv: string;
  }): Promise<{ sig: string }> {
    return this.queueRequest({
      op: "eddsa_sign",
      args: req,
    });
  }
}

/**
 * The synchronous crypto worker produced by this factory doesn't run in the
 * background, but actually blocks the caller until the operation is done.
 */
export class SynchronousCryptoWorkerFactory implements CryptoWorkerFactory {
  startWorker(): CryptoWorker {
    if (typeof require === "undefined") {
      throw Error("cannot make worker, require(...) not defined");
    }

    let primitiveWorker;
    if (process.env["TALER_WALLET_PRIMITIVE_WORKER"]) {
      primitiveWorker = new MyPrimitiveWorker();
    }

    return new SynchronousCryptoWorker(primitiveWorker);
  }

  getConcurrency(): number {
    return 1;
  }
}
