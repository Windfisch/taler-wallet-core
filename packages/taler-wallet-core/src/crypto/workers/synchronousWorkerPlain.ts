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

/**
 * Imports.
 */
import { Logger } from "@gnu-taler/taler-util";
import {
  nativeCryptoR,
  TalerCryptoInterfaceR,
} from "../cryptoImplementation.js";
import { CryptoWorker } from "./cryptoWorkerInterface.js";
import { processRequestWithImpl } from "./worker-common.js";

const logger = new Logger("synchronousWorker.ts");

/**
 * Worker implementation that synchronously executes cryptographic
 * operations.
 */
export class SynchronousCryptoWorkerPlain implements CryptoWorker {
  /**
   * Function to be called when we receive a message from the worker thread.
   */
  onmessage: undefined | ((m: any) => void);

  /**
   * Function to be called when we receive an error from the worker thread.
   */
  onerror: undefined | ((m: any) => void);

  cryptoImplR: TalerCryptoInterfaceR;

  constructor() {
    this.onerror = undefined;
    this.onmessage = undefined;
    this.cryptoImplR = { ...nativeCryptoR };
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

  private dispatchMessage(msg: any): void {
    if (this.onmessage) {
      this.onmessage(msg);
    }
  }

  /**
   * Send a message to the worker thread.
   */
  postMessage(msg: any): void {
    const handleRequest = async () => {
      const responseMsg = await processRequestWithImpl(msg, this.cryptoImplR);
      try {
        setTimeout(() => this.dispatchMessage(responseMsg), 0);
      } catch (e) {
        logger.error("got error during dispatch", e);
      }
    };
    handleRequest().catch((e) => {
      logger.error("Error while handling crypto request:", e);
    });
  }

  /**
   * Forcibly terminate the worker thread.
   */
  terminate(): void {
    // This is a no-op.
  }
}
