/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

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
import { Logger } from "@gnu-taler/taler-util";
import child_process from "child_process";
import type internal from "stream";
import { OpenedPromise, openPromise } from "../../util/promiseUtils.js";

const logger = new Logger("synchronousWorkerFactory.ts");

/**
 * Client for the crypto helper process (taler-crypto-worker from exchange.git).
 */
export class CryptoRpcClient {
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
            throw Error("request was undefined");
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

  async queueRequest(req: any): Promise<any> {
    const p = openPromise<any>();
    if (this.requests.length === 0) {
      this.proc.ref();
    }
    this.requests.push({ req, p });
    this.proc.stdin.write(`${JSON.stringify(req)}\n`);
    return p.promise;
  }
}
