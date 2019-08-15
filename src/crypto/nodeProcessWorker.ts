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

const path = require("path");
const fork = require("child_process").fork;

const nodeWorkerEntry = path.join(__dirname, "nodeWorkerEntry.js");

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

  constructor(scriptFilename: string) {
    this.child = fork(nodeWorkerEntry);
    this.onerror = undefined;
    this.onmessage = undefined;

    this.child.on("error", (e: any) => {
      if (this.onerror) {
        this.onerror(e);
      }
    });

    this.child.on("message", (msg: any) => {
      const message = JSON.parse(msg);

      if (!message.error && this.onmessage) {
        this.onmessage(message);
      }

      if (message.error && this.onerror) {
        const error = new Error(message.error);
        error.stack = message.stack;

        this.onerror(error);
      }
    });

    this.child.send({scriptFilename, cwd: process.cwd()});
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
    console.log("terminating node.js worker");
    this.child.kill("SIGINT");
  }
}
