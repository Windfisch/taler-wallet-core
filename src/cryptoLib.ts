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
import {
  PreCoinRecord, PayCoinInfo, AmountJson,
  RefreshSessionRecord, RefreshPreCoinRecord, ReserveRecord
} from "./types";
import create = chrome.alarms.create;
import {OfferRecord} from "./wallet";
import {CoinWithDenom} from "./wallet";
import {CoinPaySig, CoinRecord} from "./types";
import {DenominationRecord, Amounts} from "./types";
import {Amount} from "./emscriptif";
import {HashContext} from "./emscriptif";
import {RefreshMeltCoinAffirmationPS} from "./emscriptif";
import {EddsaPublicKey} from "./emscriptif";
import {HashCode} from "./emscriptif";


export function main(worker: Worker) {
  worker.onmessage = (msg: MessageEvent) => {
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


namespace RpcFunctions {

  /**
   * Create a pre-coin of the given denomination to be withdrawn from then given
   * reserve.
   */
  export function createPreCoin(denom: DenominationRecord,
                                reserve: ReserveRecord): PreCoinRecord {
    let reservePriv = new native.EddsaPrivateKey();
    reservePriv.loadCrock(reserve.reserve_priv);
    let reservePub = new native.EddsaPublicKey();
    reservePub.loadCrock(reserve.reserve_pub);
    let denomPub = native.RsaPublicKey.fromCrock(denom.denomPub);
    let coinPriv = native.EddsaPrivateKey.create();
    let coinPub = coinPriv.getPublicKey();
    let blindingFactor = native.RsaBlindingKeySecret.create();
    let pubHash: native.HashCode = coinPub.hash();
    let ev = native.rsaBlind(pubHash,
                             blindingFactor,
                             denomPub);

    if (!ev) {
      throw Error("couldn't blind (malicious exchange key?)");
    }

    if (!denom.feeWithdraw) {
      throw Error("Field fee_withdraw missing");
    }

    let amountWithFee = new native.Amount(denom.value);
    amountWithFee.add(new native.Amount(denom.feeWithdraw));
    let withdrawFee = new native.Amount(denom.feeWithdraw);

    // Signature
    let withdrawRequest = new native.WithdrawRequestPS({
      reserve_pub: reservePub,
      amount_with_fee: amountWithFee.toNbo(),
      withdraw_fee: withdrawFee.toNbo(),
      h_denomination_pub: denomPub.encode().hash(),
      h_coin_envelope: ev.hash()
    });

    var sig = native.eddsaSign(withdrawRequest.toPurpose(), reservePriv);

    let preCoin: PreCoinRecord = {
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


  export function isValidDenom(denom: DenominationRecord,
                               masterPub: string): boolean {
    let p = new native.DenominationKeyValidityPS({
      master: native.EddsaPublicKey.fromCrock(masterPub),
      denom_hash: native.RsaPublicKey.fromCrock(denom.denomPub)
                        .encode()
                        .hash(),
      expire_legal: native.AbsoluteTimeNbo.fromTalerString(denom.stampExpireLegal),
      expire_spend: native.AbsoluteTimeNbo.fromTalerString(denom.stampExpireDeposit),
      expire_withdraw: native.AbsoluteTimeNbo.fromTalerString(denom.stampExpireWithdraw),
      start: native.AbsoluteTimeNbo.fromTalerString(denom.stampStart),
      value: (new native.Amount(denom.value)).toNbo(),
      fee_deposit: (new native.Amount(denom.feeDeposit)).toNbo(),
      fee_refresh: (new native.Amount(denom.feeRefresh)).toNbo(),
      fee_withdraw: (new native.Amount(denom.feeWithdraw)).toNbo(),
      fee_refund: (new native.Amount(denom.feeRefund)).toNbo(),
    });

    let nativeSig = new native.EddsaSignature();
    nativeSig.loadCrock(denom.masterSig);

    let nativePub = native.EddsaPublicKey.fromCrock(masterPub);

    return native.eddsaVerify(native.SignaturePurpose.MASTER_DENOMINATION_KEY_VALIDITY,
                              p.toPurpose(),
                              nativeSig,
                              nativePub);

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
  export function signDeposit(offer: OfferRecord,
                              cds: CoinWithDenom[]): PayCoinInfo {
    let ret: PayCoinInfo = [];


    let feeList: AmountJson[] = cds.map((x) => x.denom.feeDeposit);
    let fees = Amounts.add(Amounts.getZero(feeList[0].currency), ...feeList).amount;
    // okay if saturates
    fees = Amounts.sub(fees, offer.contract.max_fee).amount;
    let total = Amounts.add(fees, offer.contract.amount).amount;

    let amountSpent = native.Amount.getZero(cds[0].coin.currentAmount.currency);
    let amountRemaining = new native.Amount(total);
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

      let feeDeposit: Amount = new native.Amount(cd.denom.feeDeposit);

      // Give the merchant at least the deposit fee, otherwise it'll reject
      // the coin.
      if (coinSpend.cmp(feeDeposit) < 0) {
        coinSpend = feeDeposit;
      }

      let newAmount = new native.Amount(cd.coin.currentAmount);
      newAmount.sub(coinSpend);
      cd.coin.currentAmount = newAmount.toJson();
      cd.coin.dirty = true;
      cd.coin.transactionPending = true;

      let d = new native.DepositRequestPS({
        h_contract: native.HashCode.fromCrock(offer.H_contract),
        h_wire: native.HashCode.fromCrock(offer.contract.H_wire),
        amount_with_fee: coinSpend.toNbo(),
        coin_pub: native.EddsaPublicKey.fromCrock(cd.coin.coinPub),
        deposit_fee: new native.Amount(cd.denom.feeDeposit).toNbo(),
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


  export function createRefreshSession(exchangeBaseUrl: string,
                                       kappa: number,
                                       meltCoin: CoinRecord,
                                       newCoinDenoms: DenominationRecord[],
                                       meltFee: AmountJson): RefreshSessionRecord {

    let valueWithFee = Amounts.getZero(newCoinDenoms[0].value.currency);

    for (let ncd of newCoinDenoms) {
      valueWithFee = Amounts.add(valueWithFee,
                                 ncd.value,
                                 ncd.feeWithdraw).amount;
    }

    // melt fee
    valueWithFee = Amounts.add(valueWithFee, meltFee).amount;

    let sessionHc = new HashContext();

    let transferPubs: string[] = [];
    let transferPrivs: string[] = [];

    let preCoinsForGammas: RefreshPreCoinRecord[][] = [];

    for (let i = 0; i < kappa; i++) {
      let t = native.EcdhePrivateKey.create();
      let pub = t.getPublicKey();
      sessionHc.read(pub);
      transferPrivs.push(t.toCrock());
      transferPubs.push(pub.toCrock());
    }

    for (let i = 0; i < newCoinDenoms.length; i++) {
      let r = native.RsaPublicKey.fromCrock(newCoinDenoms[i].denomPub);
      sessionHc.read(r.encode());
    }

    sessionHc.read(native.EddsaPublicKey.fromCrock(meltCoin.coinPub));
    sessionHc.read((new native.Amount(valueWithFee)).toNbo());

    for (let i = 0; i < kappa; i++) {
      let preCoins: RefreshPreCoinRecord[] = [];
      for (let j = 0; j < newCoinDenoms.length; j++) {

        let transferPriv = native.EcdhePrivateKey.fromCrock(transferPrivs[i]);
        let oldCoinPub = native.EddsaPublicKey.fromCrock(meltCoin.coinPub);
        let transferSecret = native.ecdhEddsa(transferPriv, oldCoinPub);

        let fresh = native.setupFreshCoin(transferSecret, j);

        let coinPriv = fresh.priv;
        let coinPub = coinPriv.getPublicKey();
        let blindingFactor = fresh.blindingKey;
        let pubHash: native.HashCode = coinPub.hash();
        let denomPub = native.RsaPublicKey.fromCrock(newCoinDenoms[j].denomPub);
        let ev = native.rsaBlind(pubHash,
                                 blindingFactor,
                                 denomPub);
        if (!ev) {
          throw Error("couldn't blind (malicious exchange key?)");
        }
        let preCoin: RefreshPreCoinRecord = {
          blindingKey: blindingFactor.toCrock(),
          coinEv: ev.toCrock(),
          publicKey: coinPub.toCrock(),
          privateKey: coinPriv.toCrock(),
        };
        preCoins.push(preCoin);
        sessionHc.read(ev);
      }
      preCoinsForGammas.push(preCoins);
    }

    let sessionHash = new HashCode();
    sessionHash.alloc();
    sessionHc.finish(sessionHash);

    let confirmData = new RefreshMeltCoinAffirmationPS({
      coin_pub: EddsaPublicKey.fromCrock(meltCoin.coinPub),
      amount_with_fee: (new Amount(valueWithFee)).toNbo(),
      session_hash: sessionHash,
      melt_fee: (new Amount(meltFee)).toNbo()
    });


    let confirmSig: string = native.eddsaSign(confirmData.toPurpose(),
                                              native.EddsaPrivateKey.fromCrock(
                                                meltCoin.coinPriv)).toCrock();

    let valueOutput = Amounts.getZero(newCoinDenoms[0].value.currency);
    for (let denom of newCoinDenoms) {
      valueOutput = Amounts.add(valueOutput, denom.value).amount;
    }

    let refreshSession: RefreshSessionRecord = {
      meltCoinPub: meltCoin.coinPub,
      newDenoms: newCoinDenoms.map((d) => d.denomPub),
      confirmSig,
      valueWithFee,
      transferPubs,
      preCoinsForGammas,
      hash: sessionHash.toCrock(),
      norevealIndex: undefined,
      exchangeBaseUrl,
      transferPrivs,
      finished: false,
      valueOutput,
    };

    return refreshSession;
  }

  export function hashString(str: string): string {
    const b = native.ByteArray.fromStringWithNull(str);
    return b.hash().toCrock();
  }
}
