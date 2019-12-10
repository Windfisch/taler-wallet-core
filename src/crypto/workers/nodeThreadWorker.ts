import { CryptoWorkerFactory } from "./cryptoApi";

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

import { CryptoWorker } from "./cryptoWorker";

import worker_threads = require("worker_threads");
import os = require("os");
import { CryptoImplementation } from "./cryptoImplementation";

const f = __filename;

const workerCode = `
  // Try loading the glue library for Android
  try {
    require("akono");
  } catch (e) {
    // Probably we're not on Android ...
  }
  const worker_threads = require('worker_threads');
  const parentPort = worker_threads.parentPort;
  let tw;
  try {
    tw = require("${f}");
  } catch (e) {
    console.log("could not load from ${f}");
  }
  if (!tw) {
    try {
      tw = require("taler-wallet-android");
    } catch (e) {
      console.log("could not load taler-wallet-android either");
      throw e;
    }
  }
  parentPort.on("message", tw.handleWorkerMessage);
  parentPort.on("error", tw.handleWorkerError);
`;

/**
 * This function is executed in the worker thread to handle
 * a message.
 */
export function handleWorkerMessage(msg: any) {
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

  const handleRequest = async () => {
    const impl = new CryptoImplementation();

    if (!(operation in impl)) {
      console.error(`crypto operation '${operation}' not found`);
      return;
    }

    try {
      const result = (impl as any)[operation](...args);
      const p = worker_threads.parentPort;
      worker_threads.parentPort?.postMessage;
      if (p) {
        p.postMessage({ data: { result, id } });
      } else {
        console.error("parent port not available (not running in thread?");
      }
    } catch (e) {
      console.error("error during operation", e);
      return;
    }
  };

  handleRequest().catch(e => {
    console.error("error in node worker", e);
  });
}

export function handleWorkerError(e: Error) {
  console.log("got error from worker", e);
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

  private nodeWorker: worker_threads.Worker;

  constructor() {
    this.nodeWorker = new worker_threads.Worker(workerCode, { eval: true });
    this.nodeWorker.on("error", (err: Error) => {
      console.error("error in node worker:", err);
      if (this.onerror) {
        this.onerror(err);
      }
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
  postMessage(msg: any) {
    this.nodeWorker.postMessage(msg);
  }

  /**
   * Forcibly terminate the worker thread.
   */
  terminate() {
    this.nodeWorker.terminate();
  }
}
