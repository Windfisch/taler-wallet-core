/*
 This file is part of GNU Taler
 (C) 2016 GNUnet e.V.

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
 * API to access the Taler crypto worker thread.
 * @author Florian Dold
 */

/**
 * Imports.
 */
import { Logger } from "@gnu-taler/taler-util";
import * as timer from "../../util/timer.js";
import { nullCrypto, TalerCryptoInterface } from "../cryptoImplementation.js";
import { CryptoWorker } from "./cryptoWorkerInterface.js";

const logger = new Logger("cryptoApi.ts");

/**
 * State of a crypto worker.
 */
interface WorkerState {
  /**
   * The actual worker thread.
   */
  w: CryptoWorker | null;

  /**
   * Work we're currently executing or null if not busy.
   */
  currentWorkItem: WorkItem | null;

  /**
   * Timer to terminate the worker if it's not busy enough.
   */
  idleTimeoutHandle: timer.TimerHandle | null;
}

interface WorkItem {
  operation: string;
  req: unknown;
  resolve: any;
  reject: any;

  /**
   * Serial id to identify a matching response.
   */
  rpcId: number;

  /**
   * Time when the work was submitted to a (non-busy) worker thread.
   */
  startTime: BigInt;
}

/**
 * Number of different priorities. Each priority p
 * must be 0 <= p < NUM_PRIO.
 */
const NUM_PRIO = 5;

export interface CryptoWorkerFactory {
  /**
   * Start a new worker.
   */
  startWorker(): CryptoWorker;

  /**
   * Query the number of workers that should be
   * run at the same time.
   */
  getConcurrency(): number;
}

export class CryptoApiStoppedError extends Error {
  constructor() {
    super("Crypto API stopped");
    Object.setPrototypeOf(this, CryptoApiStoppedError.prototype);
  }
}

/**
 * Dispatcher for cryptographic operations to underlying crypto workers.
 */
export class CryptoDispatcher {
  private nextRpcId = 1;
  private workers: WorkerState[];
  private workQueues: WorkItem[][];

  private workerFactory: CryptoWorkerFactory;

  /**
   * Number of busy workers.
   */
  private numBusy = 0;

  /**
   * Did we stop accepting new requests?
   */
  private stopped = false;

  /**
   * Terminate all worker threads.
   */
  terminateWorkers(): void {
    for (const worker of this.workers) {
      if (worker.idleTimeoutHandle) {
        worker.idleTimeoutHandle.clear();
        worker.idleTimeoutHandle = null;
      }
      if (worker.currentWorkItem) {
        worker.currentWorkItem.reject(new CryptoApiStoppedError());
        worker.currentWorkItem = null;
      }
      if (worker.w) {
        logger.trace("terminating worker");
        worker.w.terminate();
        worker.w = null;
      }
    }
  }

  stop(): void {
    this.stopped = true;
    this.terminateWorkers();
  }

  /**
   * Start a worker (if not started) and set as busy.
   */
  wake(ws: WorkerState, work: WorkItem): void {
    if (this.stopped) {
      return;
    }
    if (ws.currentWorkItem !== null) {
      throw Error("assertion failed");
    }
    ws.currentWorkItem = work;
    this.numBusy++;
    let worker: CryptoWorker;
    if (!ws.w) {
      worker = this.workerFactory.startWorker();
      worker.onmessage = (m: any) => this.handleWorkerMessage(ws, m);
      worker.onerror = (e: any) => this.handleWorkerError(ws, e);
      ws.w = worker;
    } else {
      worker = ws.w;
    }

    const msg: any = {
      req: work.req,
      id: work.rpcId,
      operation: work.operation,
    };
    this.resetWorkerTimeout(ws);
    work.startTime = timer.performanceNow();
    timer.after(0, () => worker.postMessage(msg));
  }

  resetWorkerTimeout(ws: WorkerState): void {
    if (ws.idleTimeoutHandle !== null) {
      ws.idleTimeoutHandle.clear();
      ws.idleTimeoutHandle = null;
    }
    const destroy = (): void => {
      logger.trace("destroying crypto worker after idle timeout");
      // terminate worker if it's idle
      if (ws.w && ws.currentWorkItem === null) {
        ws.w.terminate();
        ws.w = null;
      }
    };
    ws.idleTimeoutHandle = timer.after(15 * 1000, destroy);
    ws.idleTimeoutHandle.unref();
  }

  handleWorkerError(ws: WorkerState, e: any): void {
    if (ws.currentWorkItem) {
      logger.error(`error in worker during ${ws.currentWorkItem.operation}`, e);
    } else {
      logger.error("error in worker", e);
    }
    logger.error(e.message);
    try {
      if (ws.w) {
        ws.w.terminate();
        ws.w = null;
      }
    } catch (e) {
      logger.error(e as string);
    }
    if (ws.currentWorkItem !== null) {
      ws.currentWorkItem.reject(e);
      ws.currentWorkItem = null;
      this.numBusy--;
    }
    this.findWork(ws);
  }

  private findWork(ws: WorkerState): void {
    // try to find more work for this worker
    for (let i = 0; i < NUM_PRIO; i++) {
      const q = this.workQueues[NUM_PRIO - i - 1];
      if (q.length !== 0) {
        const work: WorkItem | undefined = q.shift();
        if (!work) {
          continue;
        }
        this.wake(ws, work);
        return;
      }
    }
  }

  handleWorkerMessage(ws: WorkerState, msg: any): void {
    const id = msg.data.id;
    if (typeof id !== "number") {
      console.error("rpc id must be number");
      return;
    }
    const currentWorkItem = ws.currentWorkItem;
    ws.currentWorkItem = null;
    this.numBusy--;
    this.findWork(ws);
    if (!currentWorkItem) {
      console.error("unsolicited response from worker");
      return;
    }
    if (id !== currentWorkItem.rpcId) {
      console.error(`RPC with id ${id} has no registry entry`);
      return;
    }

    currentWorkItem.resolve(msg.data.result);
  }

  cryptoApi: TalerCryptoInterface;

  constructor(workerFactory: CryptoWorkerFactory) {
    const fns: any = {};
    for (const name of Object.keys(nullCrypto)) {
      fns[name] = (x: any) => this.doRpc(name, 0, x);
    }

    this.cryptoApi = fns;

    this.workerFactory = workerFactory;
    this.workers = new Array<WorkerState>(workerFactory.getConcurrency());

    for (let i = 0; i < this.workers.length; i++) {
      this.workers[i] = {
        currentWorkItem: null,
        idleTimeoutHandle: null,
        w: null,
      };
    }

    this.workQueues = [];
    for (let i = 0; i < NUM_PRIO; i++) {
      this.workQueues.push([]);
    }
  }

  private doRpc<T>(
    operation: string,
    priority: number,
    req: unknown,
  ): Promise<T> {
    if (this.stopped) {
      throw new CryptoApiStoppedError();
    }
    const p: Promise<T> = new Promise<T>((resolve, reject) => {
      const rpcId = this.nextRpcId++;
      const workItem: WorkItem = {
        operation,
        req,
        resolve,
        reject,
        rpcId,
        startTime: BigInt(0),
      };

      if (this.numBusy === this.workers.length) {
        const q = this.workQueues[priority];
        if (!q) {
          throw Error("assertion failed");
        }
        this.workQueues[priority].push(workItem);
        return;
      }

      for (const ws of this.workers) {
        if (ws.currentWorkItem !== null) {
          continue;
        }
        this.wake(ws, workItem);
        return;
      }

      throw Error("assertion failed");
    });

    // Make sure that we wait for the result while a timer is active
    // to prevent the event loop from dying, as just waiting for a promise
    // does not keep the process alive in Node.
    // (The worker child process won't keep us alive either, because we un-ref
    // it to make sure it doesn't keep us alive if there is no work.)
    return new Promise<T>((resolve, reject) => {
      let timedOut = false;
      const timeout = timer.after(5000, () => {
        logger.warn("crypto RPC call timed out");
        timedOut = true;
        reject(new Error("crypto RPC call timed out"));
      });
      p.then((x) => {
        if (timedOut) {
          return;
        }
        timeout.clear();
        resolve(x);
      }).catch((x) => {
        logger.info(`crypto RPC call ${operation} threw`);
        if (timedOut) {
          return;
        }
        timeout.clear();
        reject(x);
      });
    });
  }
}
