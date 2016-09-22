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
 * Web worker for crypto operations.
 * @author Florian Dold
 */

"use strict";

import * as native from "./emscriptif";
import {PreCoin, Reserve, PayCoinInfo} from "./types";
import create = chrome.alarms.create;
import {Offer} from "./wallet";
import {CoinWithDenom} from "./wallet";
import {CoinPaySig} from "./types";
import {Denomination} from "./types";
import {Amount} from "./emscriptif";


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
    let f = (RpcFunctions as any)[msg.data.operation];
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
  export function createPreCoin(denom: Denomination,
                                reserve: Reserve): PreCoin {
    let reservePriv = new native.EddsaPrivateKey();
    reservePriv.loadCrock(reserve.reserve_priv);
    let reservePub = new native.EddsaPublicKey();
    reservePub.loadCrock(reserve.reserve_pub);
    let denomPub = native.RsaPublicKey.fromCrock(denom.denom_pub);
    let coinPriv = native.EddsaPrivateKey.create();
    let coinPub = coinPriv.getPublicKey();
    let blindingFactor = native.RsaBlindingKeySecret.create();
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
      exchangeBaseUrl: reserve.exchange_base_url,
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
      fee_refund: (new native.Amount(denom.fee_refund)).toNbo(),
    });

    let nativeSig = new native.EddsaSignature();
    nativeSig.loadCrock(denom.master_sig);

    let nativePub = native.EddsaPublicKey.fromCrock(masterPub);

    return native.eddsaVerify(native.SignaturePurpose.MASTER_DENOMINATION_KEY_VALIDITY,
                              p.toPurpose(),
                              nativeSig,
                              nativePub);

  }


  export function hashRsaPub(rsaPub: string): string {
    return native.RsaPublicKey.fromCrock(rsaPub)
                 .encode()
                 .hash()
                 .toCrock();
  }


  export function createEddsaKeypair(): {priv: string, pub: string} {
    const priv = native.EddsaPrivateKey.create();
    const pub = priv.getPublicKey();
    return {priv: priv.toCrock(), pub: pub.toCrock()};
  }


  export function rsaUnblind(sig: string, bk: string, pk: string): string {
    let denomSig = native.rsaUnblind(native.RsaSignature.fromCrock(sig),
                                     native.RsaBlindingKeySecret.fromCrock(bk),
                                     native.RsaPublicKey.fromCrock(pk));
    return denomSig.encode().toCrock()
  }


  /**
   * Generate updated coins (to store in the database)
   * and deposit permissions for each given coin.
   */
  export function signDeposit(offer: Offer,
                              cds: CoinWithDenom[]): PayCoinInfo {
    let ret: PayCoinInfo = [];
    let amountSpent = native.Amount.getZero(cds[0].coin.currentAmount.currency);
    let amountRemaining = new native.Amount(offer.contract.amount);
    for (let cd of cds) {
      let coinSpend: Amount;

      if (amountRemaining.value == 0 && amountRemaining.fraction == 0) {
        break;
      }

      if (amountRemaining.cmp(new native.Amount(cd.coin.currentAmount)) < 0) {
        coinSpend = new native.Amount(amountRemaining.toJson());
      } else {
        coinSpend = new native.Amount(cd.coin.currentAmount);
      }

      amountSpent.add(coinSpend);
      amountRemaining.sub(coinSpend);

      let newAmount = new native.Amount(cd.coin.currentAmount);
      newAmount.sub(coinSpend);
      cd.coin.currentAmount = newAmount.toJson();

      let d = new native.DepositRequestPS({
        h_contract: native.HashCode.fromCrock(offer.H_contract),
        h_wire: native.HashCode.fromCrock(offer.contract.H_wire),
        amount_with_fee: coinSpend.toNbo(),
        coin_pub: native.EddsaPublicKey.fromCrock(cd.coin.coinPub),
        deposit_fee: new native.Amount(cd.denom.fee_deposit).toNbo(),
        merchant: native.EddsaPublicKey.fromCrock(offer.contract.merchant_pub),
        refund_deadline: native.AbsoluteTimeNbo.fromTalerString(offer.contract.refund_deadline),
        timestamp: native.AbsoluteTimeNbo.fromTalerString(offer.contract.timestamp),
        transaction_id: native.UInt64.fromNumber(offer.contract.transaction_id),
      });

      let coinSig = native.eddsaSign(d.toPurpose(),
                                     native.EddsaPrivateKey.fromCrock(cd.coin.coinPriv))
                          .toCrock();

      let s: CoinPaySig = {
        coin_sig: coinSig,
        coin_pub: cd.coin.coinPub,
        ub_sig: cd.coin.denomSig,
        denom_pub: cd.coin.denomPub,
        f: coinSpend.toJson(),
      };
      ret.push({sig: s, updatedCoin: cd.coin});
    }
    return ret;
  }
}
