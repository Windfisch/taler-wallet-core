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
 */


/**
 * Imports.
 */
import {
  canonicalJson,
} from "../helpers";
import {
  AmountJson,
  Amounts,
  CoinPaySig,
  CoinRecord,
  CoinStatus,
  CoinWithDenom,
  ContractTerms,
  DenominationRecord,
  PayCoinInfo,
  PaybackRequest,
  PreCoinRecord,
  RefreshPreCoinRecord,
  RefreshSessionRecord,
  ReserveRecord,
  TipPlanchet,
  WireFee,
} from "../types";

import {
  Amount,
  EddsaPublicKey,
  HashCode,
  HashContext,
  RefreshMeltCoinAffirmationPS,
} from "./emscInterface";
import * as native from "./emscInterface";


namespace RpcFunctions {

  /**
   * Create a pre-coin of the given denomination to be withdrawn from then given
   * reserve.
   */
  export function createPreCoin(denom: DenominationRecord,
                                reserve: ReserveRecord): PreCoinRecord {
    const reservePriv = new native.EddsaPrivateKey();
    reservePriv.loadCrock(reserve.reserve_priv);
    const reservePub = new native.EddsaPublicKey();
    reservePub.loadCrock(reserve.reserve_pub);
    const denomPub = native.RsaPublicKey.fromCrock(denom.denomPub);
    const coinPriv = native.EddsaPrivateKey.create();
    const coinPub = coinPriv.getPublicKey();
    const blindingFactor = native.RsaBlindingKeySecret.create();
    const pubHash: native.HashCode = coinPub.hash();
    const ev = native.rsaBlind(pubHash, blindingFactor, denomPub);

    if (!ev) {
      throw Error("couldn't blind (malicious exchange key?)");
    }

    if (!denom.feeWithdraw) {
      throw Error("Field fee_withdraw missing");
    }

    const amountWithFee = new native.Amount(denom.value);
    amountWithFee.add(new native.Amount(denom.feeWithdraw));
    const withdrawFee = new native.Amount(denom.feeWithdraw);

    // Signature
    const withdrawRequest = new native.WithdrawRequestPS({
      amount_with_fee: amountWithFee.toNbo(),
      h_coin_envelope: ev.hash(),
      h_denomination_pub: denomPub.encode().hash(),
      reserve_pub: reservePub,
      withdraw_fee: withdrawFee.toNbo(),
    });

    const sig = native.eddsaSign(withdrawRequest.toPurpose(), reservePriv);

    const preCoin: PreCoinRecord = {
      blindingKey: blindingFactor.toCrock(),
      coinEv: ev.toCrock(),
      coinPriv: coinPriv.toCrock(),
      coinPub: coinPub.toCrock(),
      coinValue: denom.value,
      denomPub: denomPub.encode().toCrock(),
      exchangeBaseUrl: reserve.exchange_base_url,
      isFromTip: false,
      reservePub: reservePub.toCrock(),
      withdrawSig: sig.toCrock(),
    };
    return preCoin;
  }


  export function createTipPlanchet(denom: DenominationRecord): TipPlanchet {
    const denomPub = native.RsaPublicKey.fromCrock(denom.denomPub);
    const coinPriv = native.EddsaPrivateKey.create();
    const coinPub = coinPriv.getPublicKey();
    const blindingFactor = native.RsaBlindingKeySecret.create();
    const pubHash: native.HashCode = coinPub.hash();
    const ev = native.rsaBlind(pubHash, blindingFactor, denomPub);

    if (!ev) {
      throw Error("couldn't blind (malicious exchange key?)");
    }

    if (!denom.feeWithdraw) {
      throw Error("Field fee_withdraw missing");
    }

    const tipPlanchet: TipPlanchet = {
      blindingKey: blindingFactor.toCrock(),
      coinEv: ev.toCrock(),
      coinPriv: coinPriv.toCrock(),
      coinPub: coinPub.toCrock(),
      coinValue: denom.value,
      denomPubHash: denomPub.encode().hash().toCrock(),
      denomPub: denomPub.encode().toCrock(),
    };
    return tipPlanchet;
  }


  /**
   * Create and sign a message to request payback for a coin.
   */
  export function createPaybackRequest(coin: CoinRecord): PaybackRequest {
    const p = new native.PaybackRequestPS({
      coin_blind: native.RsaBlindingKeySecret.fromCrock(coin.blindingKey),
      coin_pub: native.EddsaPublicKey.fromCrock(coin.coinPub),
      h_denom_pub: native.RsaPublicKey.fromCrock(coin.denomPub).encode().hash(),
    });
    const coinPriv = native.EddsaPrivateKey.fromCrock(coin.coinPriv);
    const coinSig = native.eddsaSign(p.toPurpose(), coinPriv);
    const paybackRequest: PaybackRequest = {
      coin_blind_key_secret: coin.blindingKey,
      coin_pub: coin.coinPub,
      coin_sig: coinSig.toCrock(),
      denom_pub: coin.denomPub,
      denom_sig: coin.denomSig,
    };
    return paybackRequest;
  }


  /**
   * Check if a payment signature is valid.
   */
  export function isValidPaymentSignature(sig: string, contractHash: string, merchantPub: string): boolean {
    const p = new native.PaymentSignaturePS({
      contract_hash: native.HashCode.fromCrock(contractHash),
    });
    const nativeSig = new native.EddsaSignature();
    nativeSig.loadCrock(sig);
    const nativePub = native.EddsaPublicKey.fromCrock(merchantPub);
    return native.eddsaVerify(native.SignaturePurpose.MERCHANT_PAYMENT_OK,
                              p.toPurpose(),
                              nativeSig,
                              nativePub);
  }

  /**
   * Check if a wire fee is correctly signed.
   */
  export function isValidWireFee(type: string, wf: WireFee, masterPub: string): boolean {
    const p = new native.MasterWireFeePS({
      closing_fee: (new native.Amount(wf.closingFee)).toNbo(),
      end_date: native.AbsoluteTimeNbo.fromStampSeconds(wf.endStamp),
      h_wire_method: native.ByteArray.fromStringWithNull(type).hash(),
      start_date: native.AbsoluteTimeNbo.fromStampSeconds(wf.startStamp),
      wire_fee: (new native.Amount(wf.wireFee)).toNbo(),
    });

    const nativeSig = new native.EddsaSignature();
    nativeSig.loadCrock(wf.sig);
    const nativePub = native.EddsaPublicKey.fromCrock(masterPub);

    return native.eddsaVerify(native.SignaturePurpose.MASTER_WIRE_FEES,
                              p.toPurpose(),
                              nativeSig,
                              nativePub);
  }


  /**
   * Check if the signature of a denomination is valid.
   */
  export function isValidDenom(denom: DenominationRecord,
                               masterPub: string): boolean {
    const p = new native.DenominationKeyValidityPS({
      denom_hash: native.RsaPublicKey.fromCrock(denom.denomPub) .encode() .hash(),
      expire_legal: native.AbsoluteTimeNbo.fromTalerString(denom.stampExpireLegal),
      expire_spend: native.AbsoluteTimeNbo.fromTalerString(denom.stampExpireDeposit),
      expire_withdraw: native.AbsoluteTimeNbo.fromTalerString(denom.stampExpireWithdraw),
      fee_deposit: (new native.Amount(denom.feeDeposit)).toNbo(),
      fee_refresh: (new native.Amount(denom.feeRefresh)).toNbo(),
      fee_refund: (new native.Amount(denom.feeRefund)).toNbo(),
      fee_withdraw: (new native.Amount(denom.feeWithdraw)).toNbo(),
      master: native.EddsaPublicKey.fromCrock(masterPub),
      start: native.AbsoluteTimeNbo.fromTalerString(denom.stampStart),
      value: (new native.Amount(denom.value)).toNbo(),
    });

    const nativeSig = new native.EddsaSignature();
    nativeSig.loadCrock(denom.masterSig);

    const nativePub = native.EddsaPublicKey.fromCrock(masterPub);

    return native.eddsaVerify(native.SignaturePurpose.MASTER_DENOMINATION_KEY_VALIDITY,
                              p.toPurpose(),
                              nativeSig,
                              nativePub);

  }


  /**
   * Create a new EdDSA key pair.
   */
  export function createEddsaKeypair(): {priv: string, pub: string} {
    const priv = native.EddsaPrivateKey.create();
    const pub = priv.getPublicKey();
    return {priv: priv.toCrock(), pub: pub.toCrock()};
  }


  /**
   * Unblind a blindly signed value.
   */
  export function rsaUnblind(sig: string, bk: string, pk: string): string {
    const denomSig = native.rsaUnblind(native.RsaSignature.fromCrock(sig),
                                     native.RsaBlindingKeySecret.fromCrock(bk),
                                     native.RsaPublicKey.fromCrock(pk));
    return denomSig.encode().toCrock();
  }


  /**
   * Generate updated coins (to store in the database)
   * and deposit permissions for each given coin.
   */
  export function signDeposit(contractTerms: ContractTerms,
                              cds: CoinWithDenom[]): PayCoinInfo {
    const ret: PayCoinInfo = [];

    const contractTermsHash = hashString(canonicalJson(contractTerms));

    const feeList: AmountJson[] = cds.map((x) => x.denom.feeDeposit);
    let fees = Amounts.add(Amounts.getZero(feeList[0].currency), ...feeList).amount;
    // okay if saturates
    fees = Amounts.sub(fees, contractTerms.max_fee).amount;
    const total = Amounts.add(fees, contractTerms.amount).amount;

    const amountSpent = native.Amount.getZero(cds[0].coin.currentAmount.currency);
    const amountRemaining = new native.Amount(total);
    for (const cd of cds) {
      let coinSpend: Amount;

      if (amountRemaining.value === 0 && amountRemaining.fraction === 0) {
        break;
      }

      if (amountRemaining.cmp(new native.Amount(cd.coin.currentAmount)) < 0) {
        coinSpend = new native.Amount(amountRemaining.toJson());
      } else {
        coinSpend = new native.Amount(cd.coin.currentAmount);
      }

      amountSpent.add(coinSpend);
      amountRemaining.sub(coinSpend);

      const feeDeposit: Amount = new native.Amount(cd.denom.feeDeposit);

      // Give the merchant at least the deposit fee, otherwise it'll reject
      // the coin.
      if (coinSpend.cmp(feeDeposit) < 0) {
        coinSpend = feeDeposit;
      }

      const newAmount = new native.Amount(cd.coin.currentAmount);
      newAmount.sub(coinSpend);
      cd.coin.currentAmount = newAmount.toJson();
      cd.coin.status = CoinStatus.PurchasePending;

      const d = new native.DepositRequestPS({
        amount_with_fee: coinSpend.toNbo(),
        coin_pub: native.EddsaPublicKey.fromCrock(cd.coin.coinPub),
        deposit_fee: new native.Amount(cd.denom.feeDeposit).toNbo(),
        h_contract: native.HashCode.fromCrock(contractTermsHash),
        h_wire: native.HashCode.fromCrock(contractTerms.H_wire),
        merchant: native.EddsaPublicKey.fromCrock(contractTerms.merchant_pub),
        refund_deadline: native.AbsoluteTimeNbo.fromTalerString(contractTerms.refund_deadline),
        timestamp: native.AbsoluteTimeNbo.fromTalerString(contractTerms.timestamp),
      });

      const coinSig = native.eddsaSign(d.toPurpose(),
                                     native.EddsaPrivateKey.fromCrock(cd.coin.coinPriv))
                          .toCrock();

      const s: CoinPaySig = {
        coin_pub: cd.coin.coinPub,
        coin_sig: coinSig,
        denom_pub: cd.coin.denomPub,
        f: coinSpend.toJson(),
        ub_sig: cd.coin.denomSig,
      };
      ret.push({sig: s, updatedCoin: cd.coin});
    }
    return ret;
  }


  /**
   * Create a new refresh session.
   */
  export function createRefreshSession(exchangeBaseUrl: string,
                                       kappa: number,
                                       meltCoin: CoinRecord,
                                       newCoinDenoms: DenominationRecord[],
                                       meltFee: AmountJson): RefreshSessionRecord {

    let valueWithFee = Amounts.getZero(newCoinDenoms[0].value.currency);

    for (const ncd of newCoinDenoms) {
      valueWithFee = Amounts.add(valueWithFee,
                                 ncd.value,
                                 ncd.feeWithdraw).amount;
    }

    // melt fee
    valueWithFee = Amounts.add(valueWithFee, meltFee).amount;

    const sessionHc = new HashContext();

    const transferPubs: string[] = [];
    const transferPrivs: string[] = [];

    const preCoinsForGammas: RefreshPreCoinRecord[][] = [];

    for (let i = 0; i < kappa; i++) {
      const t = native.EcdhePrivateKey.create();
      const pub = t.getPublicKey();
      sessionHc.read(pub);
      transferPrivs.push(t.toCrock());
      transferPubs.push(pub.toCrock());
    }

    for (const denom of newCoinDenoms) {
      const r = native.RsaPublicKey.fromCrock(denom.denomPub);
      sessionHc.read(r.encode());
    }

    sessionHc.read(native.EddsaPublicKey.fromCrock(meltCoin.coinPub));
    sessionHc.read((new native.Amount(valueWithFee)).toNbo());

    for (let i = 0; i < kappa; i++) {
      const preCoins: RefreshPreCoinRecord[] = [];
      for (let j = 0; j < newCoinDenoms.length; j++) {

        const transferPriv = native.EcdhePrivateKey.fromCrock(transferPrivs[i]);
        const oldCoinPub = native.EddsaPublicKey.fromCrock(meltCoin.coinPub);
        const transferSecret = native.ecdhEddsa(transferPriv, oldCoinPub);

        const fresh = native.setupFreshCoin(transferSecret, j);

        const coinPriv = fresh.priv;
        const coinPub = coinPriv.getPublicKey();
        const blindingFactor = fresh.blindingKey;
        const pubHash: native.HashCode = coinPub.hash();
        const denomPub = native.RsaPublicKey.fromCrock(newCoinDenoms[j].denomPub);
        const ev = native.rsaBlind(pubHash,
                                 blindingFactor,
                                 denomPub);
        if (!ev) {
          throw Error("couldn't blind (malicious exchange key?)");
        }
        const preCoin: RefreshPreCoinRecord = {
          blindingKey: blindingFactor.toCrock(),
          coinEv: ev.toCrock(),
          privateKey: coinPriv.toCrock(),
          publicKey: coinPub.toCrock(),
        };
        preCoins.push(preCoin);
        sessionHc.read(ev);
      }
      preCoinsForGammas.push(preCoins);
    }

    const sessionHash = new HashCode();
    sessionHash.alloc();
    sessionHc.finish(sessionHash);

    const confirmData = new RefreshMeltCoinAffirmationPS({
      amount_with_fee: (new Amount(valueWithFee)).toNbo(),
      coin_pub: EddsaPublicKey.fromCrock(meltCoin.coinPub),
      melt_fee: (new Amount(meltFee)).toNbo(),
      session_hash: sessionHash,
    });


    const confirmSig: string = native.eddsaSign(confirmData.toPurpose(),
                                              native.EddsaPrivateKey.fromCrock(
                                                meltCoin.coinPriv)).toCrock();

    let valueOutput = Amounts.getZero(newCoinDenoms[0].value.currency);
    for (const denom of newCoinDenoms) {
      valueOutput = Amounts.add(valueOutput, denom.value).amount;
    }

    const refreshSession: RefreshSessionRecord = {
      confirmSig,
      exchangeBaseUrl,
      finished: false,
      hash: sessionHash.toCrock(),
      meltCoinPub: meltCoin.coinPub,
      newDenoms: newCoinDenoms.map((d) => d.denomPub),
      norevealIndex: undefined,
      preCoinsForGammas,
      transferPrivs,
      transferPubs,
      valueOutput,
      valueWithFee,
    };

    return refreshSession;
  }

  /**
   * Hash a string including the zero terminator.
   */
  export function hashString(str: string): string {
    const b = native.ByteArray.fromStringWithNull(str);
    return b.hash().toCrock();
  }

  /**
   * Hash a denomination public key.
   */
  export function hashDenomPub(denomPub: string): string {
    return native.RsaPublicKey.fromCrock(denomPub).encode().hash().toCrock();
  }
}


const worker: Worker = (self as any) as Worker;

worker.onmessage = (msg: MessageEvent) => {
  if (!Array.isArray(msg.data.args)) {
    console.error("args must be array");
    return;
  }
  if (typeof msg.data.id !== "number") {
    console.error("RPC id must be number");
  }
  if (typeof msg.data.operation !== "string") {
    console.error("RPC operation must be string");
  }
  const f = (RpcFunctions as any)[msg.data.operation];
  if (!f) {
    console.error(`unknown operation: '${msg.data.operation}'`);
    return;
  }
  const res = f(...msg.data.args);
  worker.postMessage({result: res, id: msg.data.id});
};
