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
 * Imports
 */
import { Logger } from "@gnu-taler/taler-util";
import os from "os";
import url from "url";
import { nativeCryptoR } from "../cryptoImplementation.js";
import { CryptoWorkerFactory } from "./cryptoDispatcher.js";
import { CryptoWorker } from "./cryptoWorkerInterface.js";
import { processRequestWithImpl } from "./worker-common.js";

const logger = new Logger("nodeThreadWorker.ts");

const f = url.fileURLToPath(import.meta.url);

const workerCode = `
  // Try loading the glue library for embedded
  try {
    require("akono");
  } catch (e) {
    try {
      require("iono");
    } catch (e2) {
      // Probably we're not on embedded ...
    }
  }
  const worker_threads = require('worker_threads');
  const parentPort = worker_threads.parentPort;
  let tw;
  try {
    tw = require("${f}");
  } catch (e) {
    console.warn("could not load from ${f}");
  }
  if (!tw) {
    try {
      tw = require("@gnu-taler/taler-wallet-embedded");
    } catch (e) {
      console.warn("could not load taler-wallet-embedded either");
      throw e;
    }
  }
  if (typeof tw.handleWorkerMessage !== "function") {
    throw Error("module loaded for crypto worker lacks handleWorkerMessage");
  }
  if (typeof tw.handleWorkerError !== "function") {
    throw Error("module loaded for crypto worker lacks handleWorkerError");
  }
  parentPort.on("message", tw.handleWorkerMessage);
  parentPort.on("error", tw.handleWorkerError);
`;

/**
 * This function is executed in the worker thread to handle
 * a message.
 */
export function handleWorkerMessage(msg: any): void {
  const handleRequest = async (): Promise<void> => {
    const responseMsg = await processRequestWithImpl(msg, nativeCryptoR);
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const _r = "require";
      const worker_threads: typeof import("worker_threads") =
        module[_r]("worker_threads");
      // const worker_threads = require("worker_threads");
      const p = worker_threads.parentPort;
      if (p) {
        p.postMessage(responseMsg);
      } else {
        logger.error("parent port not available (not running in thread?");
      }
    } catch (e: any) {
      logger.error(`error in node worker: ${e.stack ?? e.toString()}`);
      return;
    }
  };

  handleRequest();
}

export function handleWorkerError(e: Error): void {
  logger.error(`got error from worker: ${e.stack ?? e.toString()}`);
}

export class NodeThreadCryptoWorkerFactory implements CryptoWorkerFactory {
  startWorker(): CryptoWorker {
    if (typeof require === "undefined") {
      throw Error("cannot make worker, require(...) not defined");
    }
    return new NodeThreadCryptoWorker();
  }

  getConcurrency(): number {
    return Math.max(1, os.cpus().length - 1);
  }
}

/**
 * Worker implementation that uses node subprocesses.
 */
class NodeThreadCryptoWorker implements CryptoWorker {
  /**
   * Function to be called when we receive a message from the worker thread.
   */
  onmessage: undefined | ((m: any) => void);

  /**
   * Function to be called when we receive an error from the worker thread.
   */
  onerror: undefined | ((m: any) => void);

  private nodeWorker: import("worker_threads").Worker;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const _r = "require";
    const worker_threads = module[_r]("worker_threads");

    logger.trace("starting node crypto worker");

    this.nodeWorker = new worker_threads.Worker(workerCode, { eval: true });
    this.nodeWorker.on("error", (err: Error) => {
      logger.error("error in node worker:", err);
      if (this.onerror) {
        this.onerror(err);
      }
    });
    this.nodeWorker.on("exit", (err) => {
      logger.trace(`worker exited with code ${err}`);
    });
    this.nodeWorker.on("message", (v: any) => {
      if (this.onmessage) {
        this.onmessage(v);
      }
    });
    this.nodeWorker.unref();
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

  /**
   * Send a message to the worker thread.
   */
  postMessage(msg: any): void {
    this.nodeWorker.postMessage(msg);
  }

  /**
   * Forcibly terminate the worker thread.
   */
  terminate(): void {
    this.nodeWorker.terminate();
  }
}
