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
 * API to access the Taler crypto worker thread.
 * @author Florian Dold
 */


import {PreCoin} from "./types";
import {Reserve} from "./types";
import {Denomination} from "./types";
import {Offer} from "./wallet";
import {CoinWithDenom} from "./wallet";
import {PayCoinInfo} from "./types";

interface RegistryEntry {
  resolve: any;
  reject: any;
  workerIndex: number;
}

interface WorkerState {
  /**
   * The actual worker thread.
   */
  w: Worker;
  /**
   * Are we currently running a task on this worker?
   */
  busy: boolean;
}

interface WorkItem {
  operation: string;
  args: any[];
  resolve: any;
  reject: any;
}


/**
 * Number of different priorities. Each priority p
 * must be 0 <= p < NUM_PRIO.
 */
const NUM_PRIO = 5;

export class CryptoApi {
  private nextRpcId: number = 1;
  private rpcRegistry: {[n: number]: RegistryEntry} = {};
  private workers: WorkerState[];
  private workQueues: WorkItem[][];
  /**
   * Number of busy workers.
   */
  private numBusy: number = 0;
  /**
   * Number if pending work items.
   */
  private numWaiting: number = 0;


  constructor() {
    let handler = (msg: MessageEvent) => {
      let id = msg.data.id;
      if (typeof id !== "number") {
        console.error("rpc id must be number");
        return;
      }
      if (!this.rpcRegistry[id]) {
        console.error(`RPC with id ${id} has no registry entry`);
        return;
      }
      let {resolve, workerIndex} = this.rpcRegistry[id];
      delete this.rpcRegistry[id];
      let ws = this.workers[workerIndex];
      if (!ws.busy) {
        throw Error("assertion failed");
      }
      ws.busy = false;
      this.numBusy--;
      resolve(msg.data.result);

      // try to find more work for this worker
      for (let i = 0; i < NUM_PRIO; i++) {
        let q = this.workQueues[NUM_PRIO - i - 1];
        if (q.length != 0) {
          let work: WorkItem = q.shift()!;
          let msg: any = {
            operation: work.operation,
            args: work.args,
            id: this.registerRpcId(work.resolve, work.reject, workerIndex),
          };
          ws.w.postMessage(msg);
          ws.busy = true;
          this.numBusy++;
          return;
        }
      }
    };

    this.workers = new Array<WorkerState>((navigator as any)["hardwareConcurrency"] || 2);

    for (let i = 0; i < this.workers.length; i++) {
      let w = new Worker("/lib/wallet/cryptoWorker.js");
      w.onmessage = handler;
      this.workers[i] = {
        w,
        busy: false,
      };
    }
    this.workQueues = [];
    for (let i = 0; i < NUM_PRIO; i++) {
      this.workQueues.push([]);
    }
  }


  private registerRpcId(resolve: any, reject: any,
                        workerIndex: number): number {
    let id = this.nextRpcId++;
    this.rpcRegistry[id] = {resolve, reject, workerIndex};
    return id;
  }


  private doRpc<T>(operation: string, priority: number,
                   ...args: any[]): Promise<T> {
    if (this.numBusy == this.workers.length) {
      let q = this.workQueues[priority];
      if (!q) {
        throw Error("assertion failed");
      }
      return new Promise<T>((resolve, reject) => {
        this.workQueues[priority].push({operation, args, resolve, reject});
      });
    }

    for (let i = 0; i < this.workers.length; i++) {
      let ws = this.workers[i];
      if (ws.busy) {
        continue;
      }

      ws.busy = true;
      this.numBusy++;

      return new Promise<T>((resolve, reject) => {
        let msg: any = {
          operation, args,
          id: this.registerRpcId(resolve, reject, i),
        };
        ws.w.postMessage(msg);
      });
    }

    throw Error("assertion failed");
  }


  createPreCoin(denom: Denomination, reserve: Reserve): Promise<PreCoin> {
    return this.doRpc("createPreCoin", 1, denom, reserve);
  }

  hashString(str: string): Promise<string> {
    return this.doRpc("hashString", 1, str);
  }

  hashRsaPub(rsaPub: string): Promise<string> {
    return this.doRpc("hashRsaPub", 2, rsaPub);
  }

  isValidDenom(denom: Denomination,
               masterPub: string): Promise<boolean> {
    return this.doRpc("isValidDenom", 2, denom, masterPub);
  }

  signDeposit(offer: Offer,
              cds: CoinWithDenom[]): Promise<PayCoinInfo> {
    return this.doRpc("signDeposit", 3, offer, cds);
  }

  createEddsaKeypair(): Promise<{priv: string, pub: string}> {
    return this.doRpc("createEddsaKeypair", 1);
  }

  rsaUnblind(sig: string, bk: string, pk: string): Promise<string> {
    return this.doRpc("rsaUnblind", 4, sig, bk, pk);
  }
}
