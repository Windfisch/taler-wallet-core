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
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
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
export class CryptoApi {
  private nextRpcId: number = 1;
  private rpcRegistry = {};
  private cryptoWorker: Worker;


  constructor() {
    this.cryptoWorker = new Worker("/lib/wallet/cryptoWorker.js");

    this.cryptoWorker.onmessage = (msg: MessageEvent) => {
      let id = msg.data.id;
      if (typeof id !== "number") {
        console.error("rpc id must be number");
        return;
      }
      if (!this.rpcRegistry[id]) {
        console.error(`RPC with id ${id} has no registry entry`);
        return;
      }
      let {resolve, reject} = this.rpcRegistry[id];
      resolve(msg.data.result);
    }
  }


  private registerRpcId(resolve, reject): number {
    let id = this.nextRpcId++;
    this.rpcRegistry[id] = {resolve, reject};
    return id;
  }


  private doRpc<T>(methodName: string, ...args): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let msg = {
        operation: methodName,
        id: this.registerRpcId(resolve, reject),
        args: args,
      };
      this.cryptoWorker.postMessage(msg);
    });
  }


  createPreCoin(denom: Denomination, reserve: Reserve): Promise<PreCoin> {
    return this.doRpc("createPreCoin", denom, reserve);
  }

  hashRsaPub(rsaPub: string): Promise<string> {
    return this.doRpc("hashRsaPub", rsaPub);
  }

  isValidDenom(denom: Denomination,
               masterPub: string): Promise<boolean> {
    return this.doRpc("isValidDenom", denom, masterPub);
  }

  signDeposit(offer: Offer,
              cds: CoinWithDenom[]): Promise<PayCoinInfo> {
    return this.doRpc("signDeposit", offer, cds);
  }

  createEddsaKeypair(): Promise<{priv: string, pub: string}> {
    return this.doRpc("createEddsaKeypair");
  }

  rsaUnblind(sig: string, bk: string, pk: string): Promise<string> {
    return this.doRpc("rsaUnblind", sig, bk, pk);
  }
}
