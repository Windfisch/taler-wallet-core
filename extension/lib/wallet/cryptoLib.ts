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

import {Denomination} from "./types";
/**
 * Web worker for crypto operations.
 * @author Florian Dold
 */

"use strict";

import * as native from "./emscriptif";
import {PreCoin, Reserve} from "./types";
import create = chrome.alarms.create;


export function main(worker: Worker) {
  worker.onmessage = (msg: MessageEvent) => {
    console.log("got data", msg.data);
    if (!Array.isArray(msg.data.args)) {
      console.error("args must be array");
      return;
    }
    if (typeof msg.data.id != "number") {
      console.error("RPC id must be number");
    }
    if (typeof msg.data.operation != "string") {
      console.error("RPC operation must be string");
    }
    let f = RpcFunctions[msg.data.operation];
    if (!f) {
      console.error(`unknown operation: '${msg.data.operation}'`);
      return;
    }
    let res = f(...msg.data.args);
    worker.postMessage({result: res, id: msg.data.id});
  }
}

console.log("hello, this is the crypto lib");

namespace RpcFunctions {

  /**
   * Create a pre-coin of the given denomination to be withdrawn from then given
   * reserve.
   */
  export function createPreCoin(denom: Denomination, reserve: Reserve): PreCoin {
    let reservePriv = new native.EddsaPrivateKey();
    reservePriv.loadCrock(reserve.reserve_priv);
    let reservePub = new native.EddsaPublicKey();
    reservePub.loadCrock(reserve.reserve_pub);
    let denomPub = native.RsaPublicKey.fromCrock(denom.denom_pub);
    let coinPriv = native.EddsaPrivateKey.create();
    let coinPub = coinPriv.getPublicKey();
    let blindingFactor = native.RsaBlindingKey.create(1024);
    let pubHash: native.HashCode = coinPub.hash();
    let ev: native.ByteArray = native.rsaBlind(pubHash,
                                               blindingFactor,
                                               denomPub);

    if (!denom.fee_withdraw) {
      throw Error("Field fee_withdraw missing");
    }

    let amountWithFee = new native.Amount(denom.value);
    amountWithFee.add(new native.Amount(denom.fee_withdraw));
    let withdrawFee = new native.Amount(denom.fee_withdraw);

    // Signature
    let withdrawRequest = new native.WithdrawRequestPS({
      reserve_pub: reservePub,
      amount_with_fee: amountWithFee.toNbo(),
      withdraw_fee: withdrawFee.toNbo(),
      h_denomination_pub: denomPub.encode().hash(),
      h_coin_envelope: ev.hash()
    });

    var sig = native.eddsaSign(withdrawRequest.toPurpose(), reservePriv);

    let preCoin: PreCoin = {
      reservePub: reservePub.toCrock(),
      blindingKey: blindingFactor.toCrock(),
      coinPub: coinPub.toCrock(),
      coinPriv: coinPriv.toCrock(),
      denomPub: denomPub.encode().toCrock(),
      mintBaseUrl: reserve.mint_base_url,
      withdrawSig: sig.toCrock(),
      coinEv: ev.toCrock(),
      coinValue: denom.value
    };
    return preCoin;
  }


  export function isValidDenom(denom: Denomination,
                        masterPub: string): boolean {
    let p = new native.DenominationKeyValidityPS({
      master: native.EddsaPublicKey.fromCrock(masterPub),
      denom_hash: native.RsaPublicKey.fromCrock(denom.denom_pub)
                        .encode()
                        .hash(),
      expire_legal: native.AbsoluteTimeNbo.fromTalerString(denom.stamp_expire_legal),
      expire_spend: native.AbsoluteTimeNbo.fromTalerString(denom.stamp_expire_deposit),
      expire_withdraw: native.AbsoluteTimeNbo.fromTalerString(denom.stamp_expire_withdraw),
      start: native.AbsoluteTimeNbo.fromTalerString(denom.stamp_start),
      value: (new native.Amount(denom.value)).toNbo(),
      fee_deposit: (new native.Amount(denom.fee_deposit)).toNbo(),
      fee_refresh: (new native.Amount(denom.fee_refresh)).toNbo(),
      fee_withdraw: (new native.Amount(denom.fee_withdraw)).toNbo(),
    });

    let nativeSig = new native.EddsaSignature();
    nativeSig.loadCrock(denom.master_sig);

    let nativePub = native.EddsaPublicKey.fromCrock(masterPub);

    return native.eddsaVerify(native.SignaturePurpose.MASTER_DENOMINATION_KEY_VALIDITY,
                              p.toPurpose(),
                              nativeSig,
                              nativePub);

  }
}
