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

import path = require("path");
import child_process = require("child_process");

const nodeWorkerEntry = path.join(__dirname, "nodeWorkerEntry.js");


export class NodeCryptoWorkerFactory implements CryptoWorkerFactory {
  startWorker(): CryptoWorker {
    if (typeof require === "undefined") {
      throw Error("cannot make worker, require(...) not defined");
    }
    const workerCtor = require("./nodeProcessWorker").Worker;
    const workerPath = __dirname + "/cryptoWorker.js";
    return new workerCtor(workerPath);
  }

  getConcurrency(): number {
    return 4;
  }
}

/**
 * Worker implementation that uses node subprocesses.
 */
export class Worker {
  private child: any;

  /**
   * Function to be called when we receive a message from the worker thread.
   */
  onmessage: undefined | ((m: any) => void);

  /**
   * Function to be called when we receive an error from the worker thread.
   */
  onerror: undefined | ((m: any) => void);

  private dispatchMessage(msg: any) {
    if (this.onmessage) {
      this.onmessage({ data: msg });
    } else {
      console.warn("no handler for worker event 'message' defined")
    }
  }

  private dispatchError(msg: any) {
    if (this.onerror) {
      this.onerror({ data: msg });
    } else {
      console.warn("no handler for worker event 'error' defined")
    }
  }

  constructor() {
    this.child = child_process.fork(nodeWorkerEntry);
    this.onerror = undefined;
    this.onmessage = undefined;

    this.child.on("error", (e: any) => {
      this.dispatchError(e);
    });

    this.child.on("message", (msg: any) => {
      this.dispatchMessage(msg);
    });
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
  postMessage (msg: any) {
    this.child.send(JSON.stringify({data: msg}));
  }

  /**
   * Forcibly terminate the worker thread.
   */
  terminate () {
    this.child.kill("SIGINT");
  }
}
