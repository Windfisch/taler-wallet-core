/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

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
 * Synchronous implementation of crypto-related functions for the wallet.
 * 
 * The functionality is parameterized over an Emscripten environment.
 */

/**
 * Imports.
 */

import {
  CoinRecord,
  CoinStatus,
  DenominationRecord,
  PreCoinRecord,
  RefreshPreCoinRecord,
  RefreshSessionRecord,
  ReserveRecord,
  TipPlanchet,
  WireFee,
} from "../dbTypes";

import { CoinPaySig, ContractTerms, PaybackRequest } from "../talerTypes";
import { BenchmarkResult, CoinWithDenom, PayCoinInfo } from "../walletTypes";
import { canonicalJson } from "../helpers";
import { EmscEnvironment } from "./emscInterface";
import * as native from "./emscInterface";
import { AmountJson } from "../amounts";
import * as Amounts from "../amounts";
import * as timer from "../timer";
import { getRandomBytes, encodeCrock } from "./nativeCrypto";

export class CryptoImplementation {
  static enableTracing: boolean = false;

  constructor(private emsc: EmscEnvironment) {}

  /**
   * Create a pre-coin of the given denomination to be withdrawn from then given
   * reserve.
   */
  createPreCoin(
    denom: DenominationRecord,
    reserve: ReserveRecord,
  ): PreCoinRecord {
    const reservePriv = new native.EddsaPrivateKey(this.emsc);
    reservePriv.loadCrock(reserve.reservePriv);
    const reservePub = new native.EddsaPublicKey(this.emsc);
    reservePub.loadCrock(reserve.reservePub);
    const denomPub = native.RsaPublicKey.fromCrock(this.emsc, denom.denomPub);
    const coinPriv = native.EddsaPrivateKey.create(this.emsc);
    const coinPub = coinPriv.getPublicKey();
    const blindingFactor = native.RsaBlindingKeySecret.create(this.emsc);
    const pubHash: native.HashCode = coinPub.hash();
    const ev = native.rsaBlind(pubHash, blindingFactor, denomPub);

    if (!ev) {
      throw Error("couldn't blind (malicious exchange key?)");
    }

    if (!denom.feeWithdraw) {
      throw Error("Field fee_withdraw missing");
    }

    const amountWithFee = new native.Amount(this.emsc, denom.value);
    amountWithFee.add(new native.Amount(this.emsc, denom.feeWithdraw));
    const withdrawFee = new native.Amount(this.emsc, denom.feeWithdraw);

    const denomPubHash = denomPub.encode().hash();

    // Signature
    const withdrawRequest = new native.WithdrawRequestPS(this.emsc, {
      amount_with_fee: amountWithFee.toNbo(),
      h_coin_envelope: ev.hash(),
      h_denomination_pub: denomPubHash,
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
      denomPub: denomPub.toCrock(),
      denomPubHash: denomPubHash.toCrock(),
      exchangeBaseUrl: reserve.exchangeBaseUrl,
      isFromTip: false,
      reservePub: reservePub.toCrock(),
      withdrawSig: sig.toCrock(),
    };
    return preCoin;
  }

  /**
   * Create a planchet used for tipping, including the private keys.
   */
  createTipPlanchet(denom: DenominationRecord): TipPlanchet {
    const denomPub = native.RsaPublicKey.fromCrock(this.emsc, denom.denomPub);
    const coinPriv = native.EddsaPrivateKey.create(this.emsc);
    const coinPub = coinPriv.getPublicKey();
    const blindingFactor = native.RsaBlindingKeySecret.create(this.emsc);
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
      denomPub: denomPub.encode().toCrock(),
      denomPubHash: denomPub
        .encode()
        .hash()
        .toCrock(),
    };
    return tipPlanchet;
  }

  /**
   * Create and sign a message to request payback for a coin.
   */
  createPaybackRequest(coin: CoinRecord): PaybackRequest {
    const p = new native.PaybackRequestPS(this.emsc, {
      coin_blind: native.RsaBlindingKeySecret.fromCrock(
        this.emsc,
        coin.blindingKey,
      ),
      coin_pub: native.EddsaPublicKey.fromCrock(this.emsc, coin.coinPub),
      h_denom_pub: native.RsaPublicKey.fromCrock(this.emsc, coin.denomPub)
        .encode()
        .hash(),
    });
    const coinPriv = native.EddsaPrivateKey.fromCrock(this.emsc, coin.coinPriv);
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
  isValidPaymentSignature(
    sig: string,
    contractHash: string,
    merchantPub: string,
  ): boolean {
    const p = new native.PaymentSignaturePS(this.emsc, {
      contract_hash: native.HashCode.fromCrock(this.emsc, contractHash),
    });
    const nativeSig = new native.EddsaSignature(this.emsc);
    nativeSig.loadCrock(sig);
    const nativePub = native.EddsaPublicKey.fromCrock(this.emsc, merchantPub);
    return native.eddsaVerify(
      native.SignaturePurpose.MERCHANT_PAYMENT_OK,
      p.toPurpose(),
      nativeSig,
      nativePub,
    );
  }

  /**
   * Check if a wire fee is correctly signed.
   */
  isValidWireFee(type: string, wf: WireFee, masterPub: string): boolean {
    const p = new native.MasterWireFeePS(this.emsc, {
      closing_fee: new native.Amount(this.emsc, wf.closingFee).toNbo(),
      end_date: native.AbsoluteTimeNbo.fromStampSeconds(this.emsc, (wf.endStamp.t_ms / 1000)),
      h_wire_method: native.ByteArray.fromStringWithNull(
        this.emsc,
        type,
      ).hash(),
      start_date: native.AbsoluteTimeNbo.fromStampSeconds(
        this.emsc,
        Math.floor(wf.startStamp.t_ms / 1000),
      ),
      wire_fee: new native.Amount(this.emsc, wf.wireFee).toNbo(),
    });

    const nativeSig = new native.EddsaSignature(this.emsc);
    nativeSig.loadCrock(wf.sig);
    const nativePub = native.EddsaPublicKey.fromCrock(this.emsc, masterPub);

    return native.eddsaVerify(
      native.SignaturePurpose.MASTER_WIRE_FEES,
      p.toPurpose(),
      nativeSig,
      nativePub,
    );
  }

  /**
   * Check if the signature of a denomination is valid.
   */
  isValidDenom(denom: DenominationRecord, masterPub: string): boolean {
    const p = new native.DenominationKeyValidityPS(this.emsc, {
      denom_hash: native.RsaPublicKey.fromCrock(this.emsc, denom.denomPub)
        .encode()
        .hash(),
      expire_legal: native.AbsoluteTimeNbo.fromTalerString(
        this.emsc,
        denom.stampExpireLegal,
      ),
      expire_spend: native.AbsoluteTimeNbo.fromTalerString(
        this.emsc,
        denom.stampExpireDeposit,
      ),
      expire_withdraw: native.AbsoluteTimeNbo.fromTalerString(
        this.emsc,
        denom.stampExpireWithdraw,
      ),
      fee_deposit: new native.Amount(this.emsc, denom.feeDeposit).toNbo(),
      fee_refresh: new native.Amount(this.emsc, denom.feeRefresh).toNbo(),
      fee_refund: new native.Amount(this.emsc, denom.feeRefund).toNbo(),
      fee_withdraw: new native.Amount(this.emsc, denom.feeWithdraw).toNbo(),
      master: native.EddsaPublicKey.fromCrock(this.emsc, masterPub),
      start: native.AbsoluteTimeNbo.fromTalerString(
        this.emsc,
        denom.stampStart,
      ),
      value: new native.Amount(this.emsc, denom.value).toNbo(),
    });

    const nativeSig = new native.EddsaSignature(this.emsc);
    nativeSig.loadCrock(denom.masterSig);

    const nativePub = native.EddsaPublicKey.fromCrock(this.emsc, masterPub);

    return native.eddsaVerify(
      native.SignaturePurpose.MASTER_DENOMINATION_KEY_VALIDITY,
      p.toPurpose(),
      nativeSig,
      nativePub,
    );
  }

  /**
   * Create a new EdDSA key pair.
   */
  createEddsaKeypair(): { priv: string; pub: string } {
    const priv = native.EddsaPrivateKey.create(this.emsc);
    const pub = priv.getPublicKey();
    return { priv: priv.toCrock(), pub: pub.toCrock() };
  }

  /**
   * Unblind a blindly signed value.
   */
  rsaUnblind(sig: string, bk: string, pk: string): string {
    const denomSig = native.rsaUnblind(
      native.RsaSignature.fromCrock(this.emsc, sig),
      native.RsaBlindingKeySecret.fromCrock(this.emsc, bk),
      native.RsaPublicKey.fromCrock(this.emsc, pk),
    );
    return denomSig.encode().toCrock();
  }

  /**
   * Generate updated coins (to store in the database)
   * and deposit permissions for each given coin.
   */
  signDeposit(
    contractTerms: ContractTerms,
    cds: CoinWithDenom[],
    totalAmount: AmountJson,
  ): PayCoinInfo {
    const ret: PayCoinInfo = {
      originalCoins: [],
      sigs: [],
      updatedCoins: [],
    };

    const contractTermsHash = this.hashString(canonicalJson(contractTerms));

    const feeList: AmountJson[] = cds.map(x => x.denom.feeDeposit);
    let fees = Amounts.add(Amounts.getZero(feeList[0].currency), ...feeList)
      .amount;
    // okay if saturates
    fees = Amounts.sub(fees, Amounts.parseOrThrow(contractTerms.max_fee))
      .amount;
    const total = Amounts.add(fees, totalAmount).amount;

    const amountSpent = native.Amount.getZero(
      this.emsc,
      cds[0].coin.currentAmount.currency,
    );
    const amountRemaining = new native.Amount(this.emsc, total);
    for (const cd of cds) {
      let coinSpend: native.Amount;
      const originalCoin = { ...cd.coin };

      if (amountRemaining.value === 0 && amountRemaining.fraction === 0) {
        break;
      }

      if (
        amountRemaining.cmp(
          new native.Amount(this.emsc, cd.coin.currentAmount),
        ) < 0
      ) {
        coinSpend = new native.Amount(this.emsc, amountRemaining.toJson());
      } else {
        coinSpend = new native.Amount(this.emsc, cd.coin.currentAmount);
      }

      amountSpent.add(coinSpend);
      amountRemaining.sub(coinSpend);

      const feeDeposit: native.Amount = new native.Amount(
        this.emsc,
        cd.denom.feeDeposit,
      );

      // Give the merchant at least the deposit fee, otherwise it'll reject
      // the coin.
      if (coinSpend.cmp(feeDeposit) < 0) {
        coinSpend = feeDeposit;
      }

      const newAmount = new native.Amount(this.emsc, cd.coin.currentAmount);
      newAmount.sub(coinSpend);
      cd.coin.currentAmount = newAmount.toJson();
      cd.coin.status = CoinStatus.Dirty;

      const d = new native.DepositRequestPS(this.emsc, {
        amount_with_fee: coinSpend.toNbo(),
        coin_pub: native.EddsaPublicKey.fromCrock(this.emsc, cd.coin.coinPub),
        deposit_fee: new native.Amount(this.emsc, cd.denom.feeDeposit).toNbo(),
        h_contract: native.HashCode.fromCrock(this.emsc, contractTermsHash),
        h_wire: native.HashCode.fromCrock(this.emsc, contractTerms.H_wire),
        merchant: native.EddsaPublicKey.fromCrock(
          this.emsc,
          contractTerms.merchant_pub,
        ),
        refund_deadline: native.AbsoluteTimeNbo.fromTalerString(
          this.emsc,
          contractTerms.refund_deadline,
        ),
        timestamp: native.AbsoluteTimeNbo.fromTalerString(
          this.emsc,
          contractTerms.timestamp,
        ),
      });

      const coinSig = native
        .eddsaSign(
          d.toPurpose(),
          native.EddsaPrivateKey.fromCrock(this.emsc, cd.coin.coinPriv),
        )
        .toCrock();

      const s: CoinPaySig = {
        coin_pub: cd.coin.coinPub,
        coin_sig: coinSig,
        contribution: Amounts.toString(coinSpend.toJson()),
        denom_pub: cd.coin.denomPub,
        exchange_url: cd.denom.exchangeBaseUrl,
        ub_sig: cd.coin.denomSig,
      };
      ret.sigs.push(s);
      ret.updatedCoins.push(cd.coin);
      ret.originalCoins.push(originalCoin);
    }
    return ret;
  }

  /**
   * Create a new refresh session.
   */
  createRefreshSession(
    exchangeBaseUrl: string,
    kappa: number,
    meltCoin: CoinRecord,
    newCoinDenoms: DenominationRecord[],
    meltFee: AmountJson,
  ): RefreshSessionRecord {
    let valueWithFee = Amounts.getZero(newCoinDenoms[0].value.currency);

    for (const ncd of newCoinDenoms) {
      valueWithFee = Amounts.add(valueWithFee, ncd.value, ncd.feeWithdraw)
        .amount;
    }

    // melt fee
    valueWithFee = Amounts.add(valueWithFee, meltFee).amount;

    const sessionHc = new native.HashContext(this.emsc);

    const transferPubs: string[] = [];
    const transferPrivs: string[] = [];

    const preCoinsForGammas: RefreshPreCoinRecord[][] = [];

    for (let i = 0; i < kappa; i++) {
      const t = native.EcdhePrivateKey.create(this.emsc);
      const pub = t.getPublicKey();
      sessionHc.read(pub);
      transferPrivs.push(t.toCrock());
      transferPubs.push(pub.toCrock());
    }

    for (const denom of newCoinDenoms) {
      const r = native.RsaPublicKey.fromCrock(this.emsc, denom.denomPub);
      sessionHc.read(r.encode());
    }

    sessionHc.read(
      native.EddsaPublicKey.fromCrock(this.emsc, meltCoin.coinPub),
    );
    sessionHc.read(new native.Amount(this.emsc, valueWithFee).toNbo());

    for (let i = 0; i < kappa; i++) {
      const preCoins: RefreshPreCoinRecord[] = [];
      for (let j = 0; j < newCoinDenoms.length; j++) {
        const transferPriv = native.EcdhePrivateKey.fromCrock(
          this.emsc,
          transferPrivs[i],
        );
        const oldCoinPub = native.EddsaPublicKey.fromCrock(
          this.emsc,
          meltCoin.coinPub,
        );
        const transferSecret = native.ecdhEddsa(transferPriv, oldCoinPub);

        const fresh = native.setupFreshCoin(transferSecret, j);

        const coinPriv = fresh.priv;
        const coinPub = coinPriv.getPublicKey();
        const blindingFactor = fresh.blindingKey;
        const pubHash: native.HashCode = coinPub.hash();
        const denomPub = native.RsaPublicKey.fromCrock(
          this.emsc,
          newCoinDenoms[j].denomPub,
        );
        const ev = native.rsaBlind(pubHash, blindingFactor, denomPub);
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

    const sessionHash = new native.HashCode(this.emsc);
    sessionHash.alloc();
    sessionHc.finish(sessionHash);

    const confirmData = new native.RefreshMeltCoinAffirmationPS(this.emsc, {
      amount_with_fee: new native.Amount(this.emsc, valueWithFee).toNbo(),
      coin_pub: native.EddsaPublicKey.fromCrock(this.emsc, meltCoin.coinPub),
      melt_fee: new native.Amount(this.emsc, meltFee).toNbo(),
      session_hash: sessionHash,
    });

    const confirmSig: string = native
      .eddsaSign(
        confirmData.toPurpose(),
        native.EddsaPrivateKey.fromCrock(this.emsc, meltCoin.coinPriv),
      )
      .toCrock();

    let valueOutput = Amounts.getZero(newCoinDenoms[0].value.currency);
    for (const denom of newCoinDenoms) {
      valueOutput = Amounts.add(valueOutput, denom.value).amount;
    }

    const refreshSessionId = encodeCrock(getRandomBytes(32));

    const refreshSession: RefreshSessionRecord = {
      refreshSessionId,
      confirmSig,
      exchangeBaseUrl,
      finished: false,
      hash: sessionHash.toCrock(),
      meltCoinPub: meltCoin.coinPub,
      newDenomHashes: newCoinDenoms.map(d => d.denomPubHash),
      newDenoms: newCoinDenoms.map(d => d.denomPub),
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
  hashString(str: string): string {
    const b = native.ByteArray.fromStringWithNull(this.emsc, str);
    return b.hash().toCrock();
  }

  /**
   * Hash a denomination public key.
   */
  hashDenomPub(denomPub: string): string {
    return native.RsaPublicKey.fromCrock(this.emsc, denomPub)
      .encode()
      .hash()
      .toCrock();
  }

  signCoinLink(
    oldCoinPriv: string,
    newDenomHash: string,
    oldCoinPub: string,
    transferPub: string,
    coinEv: string,
  ): string {
    const coinEvHash = native.ByteArray.fromCrock(this.emsc, coinEv).hash();

    const coinLink = new native.CoinLinkSignaturePS(this.emsc, {
      coin_envelope_hash: coinEvHash,
      h_denom_pub: native.HashCode.fromCrock(this.emsc, newDenomHash),
      old_coin_pub: native.EddsaPublicKey.fromCrock(this.emsc, oldCoinPub),
      transfer_pub: native.EcdhePublicKey.fromCrock(this.emsc, transferPub),
    });

    const coinPriv = native.EddsaPrivateKey.fromCrock(this.emsc, oldCoinPriv);

    const sig = native.eddsaSign(coinLink.toPurpose(), coinPriv);

    return sig.toCrock();
  }

  benchmark(repetitions: number): BenchmarkResult {
    let time_hash = 0;
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      this.hashString("hello world");
      time_hash += timer.performanceNow() - start;
    }

    let time_hash_big = 0;
    const ba = new native.ByteArray(this.emsc, 4096);
    for (let i = 0; i < repetitions; i++) {
      ba.randomize(native.RandomQuality.WEAK);
      const start = timer.performanceNow();
      ba.hash();
      time_hash_big += timer.performanceNow() - start;
    }

    let time_eddsa_create = 0;
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      const priv: native.EddsaPrivateKey = native.EddsaPrivateKey.create(
        this.emsc,
      );
      time_eddsa_create += timer.performanceNow() - start;
      priv.destroy();
    }

    let time_eddsa_sign = 0;
    const eddsaPriv: native.EddsaPrivateKey = native.EddsaPrivateKey.create(
      this.emsc,
    );
    const eddsaPub: native.EddsaPublicKey = eddsaPriv.getPublicKey();
    const h: native.HashCode = new native.HashCode(this.emsc);
    h.alloc();
    h.random(native.RandomQuality.WEAK);

    const ps = new native.PaymentSignaturePS(this.emsc, {
      contract_hash: h,
    });

    const p = ps.toPurpose();

    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      native.eddsaSign(p, eddsaPriv);
      time_eddsa_sign += timer.performanceNow() - start;
    }

    const eddsaSig = native.eddsaSign(p, eddsaPriv);

    let time_ecdsa_create = 0;
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      const priv: native.EcdsaPrivateKey = native.EcdsaPrivateKey.create(
        this.emsc,
      );
      time_ecdsa_create += timer.performanceNow() - start;
      priv.destroy();
    }

    let time_eddsa_verify = 0;
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      native.eddsaVerify(
        native.SignaturePurpose.MERCHANT_PAYMENT_OK,
        p,
        eddsaSig,
        eddsaPub,
      );
      time_eddsa_verify += timer.performanceNow() - start;
    }

    /* rsa 2048 */

    let time_rsa_2048_blind = 0;
    const rsaPriv2048: native.RsaPrivateKey = native.RsaPrivateKey.create(
      this.emsc,
      2048,
    );
    const rsaPub2048 = rsaPriv2048.getPublicKey();
    const blindingSecret2048 = native.RsaBlindingKeySecret.create(this.emsc);
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      native.rsaBlind(h, blindingSecret2048, rsaPub2048);
      time_rsa_2048_blind += timer.performanceNow() - start;
    }

    const blindedMessage2048 = native.rsaBlind(
      h,
      blindingSecret2048,
      rsaPub2048,
    );
    if (!blindedMessage2048) {
      throw Error("should not happen");
    }
    const rsaBlindSig2048 = native.rsaSignBlinded(
      rsaPriv2048,
      blindedMessage2048,
    );

    let time_rsa_2048_unblind = 0;
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      native.rsaUnblind(rsaBlindSig2048, blindingSecret2048, rsaPub2048);
      time_rsa_2048_unblind += timer.performanceNow() - start;
    }

    const unblindedSig2048 = native.rsaUnblind(
      rsaBlindSig2048,
      blindingSecret2048,
      rsaPub2048,
    );

    let time_rsa_2048_verify = 0;
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      native.rsaVerify(h, unblindedSig2048, rsaPub2048);
      time_rsa_2048_verify += timer.performanceNow() - start;
    }

    /* rsa 4096 */

    let time_rsa_4096_blind = 0;
    const rsaPriv4096: native.RsaPrivateKey = native.RsaPrivateKey.create(
      this.emsc,
      4096,
    );
    const rsaPub4096 = rsaPriv4096.getPublicKey();
    const blindingSecret4096 = native.RsaBlindingKeySecret.create(this.emsc);
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      native.rsaBlind(h, blindingSecret4096, rsaPub4096);
      time_rsa_4096_blind += timer.performanceNow() - start;
    }

    const blindedMessage4096 = native.rsaBlind(
      h,
      blindingSecret4096,
      rsaPub4096,
    );
    if (!blindedMessage4096) {
      throw Error("should not happen");
    }
    const rsaBlindSig4096 = native.rsaSignBlinded(
      rsaPriv4096,
      blindedMessage4096,
    );

    let time_rsa_4096_unblind = 0;
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      native.rsaUnblind(rsaBlindSig4096, blindingSecret4096, rsaPub4096);
      time_rsa_4096_unblind += timer.performanceNow() - start;
    }

    const unblindedSig4096 = native.rsaUnblind(
      rsaBlindSig4096,
      blindingSecret4096,
      rsaPub4096,
    );

    let time_rsa_4096_verify = 0;
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      native.rsaVerify(h, unblindedSig4096, rsaPub4096);
      time_rsa_4096_verify += timer.performanceNow() - start;
    }

    return {
      repetitions,
      time: {
        hash_small: time_hash,
        hash_big: time_hash_big,
        eddsa_create: time_eddsa_create,
        eddsa_sign: time_eddsa_sign,
        eddsa_verify: time_eddsa_verify,
        ecdsa_create: time_ecdsa_create,
        rsa_2048_blind: time_rsa_2048_blind,
        rsa_2048_unblind: time_rsa_2048_unblind,
        rsa_2048_verify: time_rsa_2048_verify,
        rsa_4096_blind: time_rsa_4096_blind,
        rsa_4096_unblind: time_rsa_4096_unblind,
        rsa_4096_verify: time_rsa_4096_verify,
      },
    };
  }
}
