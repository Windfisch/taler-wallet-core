/*
 This file is part of GNU Taler
 (C) 2019-2020 Taler Systems SA

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
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports.
 */

import {
  CoinRecord,
  DenominationRecord,
  RefreshPlanchetRecord,
  RefreshSessionRecord,
  TipPlanchet,
  WireFee,
  CoinSourceType,
} from "../../types/dbTypes";

import {
  CoinDepositPermission,
  RecoupRequest,
  RecoupConfirmation,
  ExchangeSignKeyJson,
  EddsaPublicKeyString,
} from "../../types/talerTypes";
import {
  BenchmarkResult,
  PlanchetCreationResult,
  PlanchetCreationRequest,
  DepositInfo,
} from "../../types/walletTypes";
import { AmountJson } from "../../util/amounts";
import * as Amounts from "../../util/amounts";
import * as timer from "../../util/timer";
import {
  encodeCrock,
  decodeCrock,
  createEddsaKeyPair,
  createBlindingKeySecret,
  hash,
  rsaBlind,
  eddsaVerify,
  eddsaSign,
  rsaUnblind,
  stringToBytes,
  createHashContext,
  createEcdheKeyPair,
  keyExchangeEcdheEddsa,
  setupRefreshPlanchet,
  rsaVerify,
} from "../talerCrypto";
import { randomBytes } from "../primitives/nacl-fast";
import { kdf } from "../primitives/kdf";
import {
  Timestamp,
  getTimestampNow,
  timestampIsBetween,
} from "../../util/time";

enum SignaturePurpose {
  RESERVE_WITHDRAW = 1200,
  WALLET_COIN_DEPOSIT = 1201,
  MASTER_DENOMINATION_KEY_VALIDITY = 1025,
  MASTER_WIRE_FEES = 1028,
  MASTER_WIRE_DETAILS = 1030,
  WALLET_COIN_MELT = 1202,
  TEST = 4242,
  MERCHANT_PAYMENT_OK = 1104,
  WALLET_COIN_RECOUP = 1203,
  WALLET_COIN_LINK = 1204,
  EXCHANGE_CONFIRM_RECOUP = 1039,
  EXCHANGE_CONFIRM_RECOUP_REFRESH = 1041,
}

function amountToBuffer(amount: AmountJson): Uint8Array {
  const buffer = new ArrayBuffer(8 + 4 + 12);
  const dvbuf = new DataView(buffer);
  const u8buf = new Uint8Array(buffer);
  const te = new TextEncoder();
  const curr = te.encode(amount.currency);
  dvbuf.setBigUint64(0, BigInt(amount.value));
  dvbuf.setUint32(8, amount.fraction);
  u8buf.set(curr, 8 + 4);

  return u8buf;
}

function timestampToBuffer(ts: Timestamp): Uint8Array {
  const b = new ArrayBuffer(8);
  const v = new DataView(b);
  const s = BigInt(ts.t_ms) * BigInt(1000);
  v.setBigUint64(0, s);
  return new Uint8Array(b);
}
class SignaturePurposeBuilder {
  private chunks: Uint8Array[] = [];

  constructor(private purposeNum: number) {}

  put(bytes: Uint8Array): SignaturePurposeBuilder {
    this.chunks.push(Uint8Array.from(bytes));
    return this;
  }

  build(): Uint8Array {
    let payloadLen = 0;
    for (let c of this.chunks) {
      payloadLen += c.byteLength;
    }
    const buf = new ArrayBuffer(4 + 4 + payloadLen);
    const u8buf = new Uint8Array(buf);
    let p = 8;
    for (let c of this.chunks) {
      u8buf.set(c, p);
      p += c.byteLength;
    }
    const dvbuf = new DataView(buf);
    dvbuf.setUint32(0, payloadLen + 4 + 4);
    dvbuf.setUint32(4, this.purposeNum);
    return u8buf;
  }
}

function buildSigPS(purposeNum: number): SignaturePurposeBuilder {
  return new SignaturePurposeBuilder(purposeNum);
}

function checkSignKeyOkay(
  key: string,
  exchangeKeys: ExchangeSignKeyJson[],
): boolean {
  const now = getTimestampNow();
  for (const k of exchangeKeys) {
    if (k.key == key) {
      return timestampIsBetween(now, k.stamp_start, k.stamp_end);
    }
  }
  return false;
}

export class CryptoImplementation {
  static enableTracing: boolean = false;

  constructor() {}

  /**
   * Create a pre-coin of the given denomination to be withdrawn from then given
   * reserve.
   */
  createPlanchet(req: PlanchetCreationRequest): PlanchetCreationResult {
    const reservePub = decodeCrock(req.reservePub);
    const reservePriv = decodeCrock(req.reservePriv);
    const denomPub = decodeCrock(req.denomPub);
    const coinKeyPair = createEddsaKeyPair();
    const blindingFactor = createBlindingKeySecret();
    const coinPubHash = hash(coinKeyPair.eddsaPub);
    const ev = rsaBlind(coinPubHash, blindingFactor, denomPub);
    const amountWithFee = Amounts.add(req.value, req.feeWithdraw).amount;
    const denomPubHash = hash(denomPub);
    const evHash = hash(ev);

    const withdrawRequest = buildSigPS(SignaturePurpose.RESERVE_WITHDRAW)
      .put(reservePub)
      .put(amountToBuffer(amountWithFee))
      .put(amountToBuffer(req.feeWithdraw))
      .put(denomPubHash)
      .put(evHash)
      .build();

    const sig = eddsaSign(withdrawRequest, reservePriv);

    const planchet: PlanchetCreationResult = {
      blindingKey: encodeCrock(blindingFactor),
      coinEv: encodeCrock(ev),
      coinPriv: encodeCrock(coinKeyPair.eddsaPriv),
      coinPub: encodeCrock(coinKeyPair.eddsaPub),
      coinValue: req.value,
      denomPub: encodeCrock(denomPub),
      denomPubHash: encodeCrock(denomPubHash),
      reservePub: encodeCrock(reservePub),
      withdrawSig: encodeCrock(sig),
    };
    return planchet;
  }

  /**
   * Create a planchet used for tipping, including the private keys.
   */
  createTipPlanchet(denom: DenominationRecord): TipPlanchet {
    const denomPub = decodeCrock(denom.denomPub);
    const coinKeyPair = createEddsaKeyPair();
    const blindingFactor = createBlindingKeySecret();
    const coinPubHash = hash(coinKeyPair.eddsaPub);
    const ev = rsaBlind(coinPubHash, blindingFactor, denomPub);

    const tipPlanchet: TipPlanchet = {
      blindingKey: encodeCrock(blindingFactor),
      coinEv: encodeCrock(ev),
      coinPriv: encodeCrock(coinKeyPair.eddsaPriv),
      coinPub: encodeCrock(coinKeyPair.eddsaPub),
      coinValue: denom.value,
      denomPub: encodeCrock(denomPub),
      denomPubHash: encodeCrock(hash(denomPub)),
    };
    return tipPlanchet;
  }

  /**
   * Create and sign a message to recoup a coin.
   */
  createRecoupRequest(coin: CoinRecord): RecoupRequest {
    const p = buildSigPS(SignaturePurpose.WALLET_COIN_RECOUP)
      .put(decodeCrock(coin.coinPub))
      .put(decodeCrock(coin.denomPubHash))
      .put(decodeCrock(coin.blindingKey))
      .build();

    const coinPriv = decodeCrock(coin.coinPriv);
    const coinSig = eddsaSign(p, coinPriv);
    const paybackRequest: RecoupRequest = {
      coin_blind_key_secret: coin.blindingKey,
      coin_pub: coin.coinPub,
      coin_sig: encodeCrock(coinSig),
      denom_pub_hash: coin.denomPubHash,
      denom_sig: coin.denomSig,
      refreshed: coin.coinSource.type === CoinSourceType.Refresh,
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
    const p = buildSigPS(SignaturePurpose.MERCHANT_PAYMENT_OK)
      .put(decodeCrock(contractHash))
      .build();
    const sigBytes = decodeCrock(sig);
    const pubBytes = decodeCrock(merchantPub);
    return eddsaVerify(p, sigBytes, pubBytes);
  }

  /**
   * Check if a wire fee is correctly signed.
   */
  isValidWireFee(type: string, wf: WireFee, masterPub: string): boolean {
    const p = buildSigPS(SignaturePurpose.MASTER_WIRE_FEES)
      .put(hash(stringToBytes(type + "\0")))
      .put(timestampToBuffer(wf.startStamp))
      .put(timestampToBuffer(wf.endStamp))
      .put(amountToBuffer(wf.wireFee))
      .put(amountToBuffer(wf.closingFee))
      .build();
    const sig = decodeCrock(wf.sig);
    const pub = decodeCrock(masterPub);
    return eddsaVerify(p, sig, pub);
  }

  /**
   * Check if the signature of a denomination is valid.
   */
  isValidDenom(denom: DenominationRecord, masterPub: string): boolean {
    const p = buildSigPS(SignaturePurpose.MASTER_DENOMINATION_KEY_VALIDITY)
      .put(decodeCrock(masterPub))
      .put(timestampToBuffer(denom.stampStart))
      .put(timestampToBuffer(denom.stampExpireWithdraw))
      .put(timestampToBuffer(denom.stampExpireDeposit))
      .put(timestampToBuffer(denom.stampExpireLegal))
      .put(amountToBuffer(denom.value))
      .put(amountToBuffer(denom.feeWithdraw))
      .put(amountToBuffer(denom.feeDeposit))
      .put(amountToBuffer(denom.feeRefresh))
      .put(amountToBuffer(denom.feeRefund))
      .put(decodeCrock(denom.denomPubHash))
      .build();
    const sig = decodeCrock(denom.masterSig);
    const pub = decodeCrock(masterPub);
    return eddsaVerify(p, sig, pub);
  }

  isValidWireAccount(
    paytoUri: string,
    sig: string,
    masterPub: string,
  ): boolean {
    const h = kdf(
      64,
      stringToBytes("exchange-wire-signature"),
      stringToBytes(paytoUri + "\0"),
      new Uint8Array(0),
    );
    const p = buildSigPS(SignaturePurpose.MASTER_WIRE_DETAILS)
      .put(h)
      .build();
    return eddsaVerify(p, decodeCrock(sig), decodeCrock(masterPub));
  }

  /**
   * Create a new EdDSA key pair.
   */
  createEddsaKeypair(): { priv: string; pub: string } {
    const pair = createEddsaKeyPair();
    return {
      priv: encodeCrock(pair.eddsaPriv),
      pub: encodeCrock(pair.eddsaPub),
    };
  }

  /**
   * Unblind a blindly signed value.
   */
  rsaUnblind(blindedSig: string, bk: string, pk: string): string {
    const denomSig = rsaUnblind(
      decodeCrock(blindedSig),
      decodeCrock(pk),
      decodeCrock(bk),
    );
    return encodeCrock(denomSig);
  }

  /**
   * Unblind a blindly signed value.
   */
  rsaVerify(hm: string, sig: string, pk: string): boolean {
    return rsaVerify(hash(decodeCrock(hm)), decodeCrock(sig), decodeCrock(pk));
  }

  /**
   * Generate updated coins (to store in the database)
   * and deposit permissions for each given coin.
   */
  signDepositPermission(depositInfo: DepositInfo): CoinDepositPermission {
    const d = buildSigPS(SignaturePurpose.WALLET_COIN_DEPOSIT)
      .put(decodeCrock(depositInfo.contractTermsHash))
      .put(decodeCrock(depositInfo.wireInfoHash))
      .put(timestampToBuffer(depositInfo.timestamp))
      .put(timestampToBuffer(depositInfo.refundDeadline))
      .put(amountToBuffer(depositInfo.spendAmount))
      .put(amountToBuffer(depositInfo.feeDeposit))
      .put(decodeCrock(depositInfo.merchantPub))
      .put(decodeCrock(depositInfo.coinPub))
      .build();
    const coinSig = eddsaSign(d, decodeCrock(depositInfo.coinPriv));

    const s: CoinDepositPermission = {
      coin_pub: depositInfo.coinPub,
      coin_sig: encodeCrock(coinSig),
      contribution: Amounts.toString(depositInfo.spendAmount),
      denom_pub: depositInfo.denomPub,
      exchange_url: depositInfo.exchangeBaseUrl,
      ub_sig: depositInfo.denomSig,
    };
    return s;
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

    const sessionHc = createHashContext();

    const transferPubs: string[] = [];
    const transferPrivs: string[] = [];

    const planchetsForGammas: RefreshPlanchetRecord[][] = [];

    for (let i = 0; i < kappa; i++) {
      const transferKeyPair = createEcdheKeyPair();
      sessionHc.update(transferKeyPair.ecdhePub);
      transferPrivs.push(encodeCrock(transferKeyPair.ecdhePriv));
      transferPubs.push(encodeCrock(transferKeyPair.ecdhePub));
    }

    for (const denom of newCoinDenoms) {
      const r = decodeCrock(denom.denomPub);
      sessionHc.update(r);
    }

    sessionHc.update(decodeCrock(meltCoin.coinPub));
    sessionHc.update(amountToBuffer(valueWithFee));

    for (let i = 0; i < kappa; i++) {
      const planchets: RefreshPlanchetRecord[] = [];
      for (let j = 0; j < newCoinDenoms.length; j++) {
        const transferPriv = decodeCrock(transferPrivs[i]);
        const oldCoinPub = decodeCrock(meltCoin.coinPub);
        const transferSecret = keyExchangeEcdheEddsa(transferPriv, oldCoinPub);

        const fresh = setupRefreshPlanchet(transferSecret, j);

        const coinPriv = fresh.coinPriv;
        const coinPub = fresh.coinPub;
        const blindingFactor = fresh.bks;
        const pubHash = hash(coinPub);
        const denomPub = decodeCrock(newCoinDenoms[j].denomPub);
        const ev = rsaBlind(pubHash, blindingFactor, denomPub);
        const planchet: RefreshPlanchetRecord = {
          blindingKey: encodeCrock(blindingFactor),
          coinEv: encodeCrock(ev),
          privateKey: encodeCrock(coinPriv),
          publicKey: encodeCrock(coinPub),
        };
        planchets.push(planchet);
        sessionHc.update(ev);
      }
      planchetsForGammas.push(planchets);
    }

    const sessionHash = sessionHc.finish();

    const confirmData = buildSigPS(SignaturePurpose.WALLET_COIN_MELT)
      .put(sessionHash)
      .put(amountToBuffer(valueWithFee))
      .put(amountToBuffer(meltFee))
      .put(decodeCrock(meltCoin.coinPub))
      .build();

    const confirmSig = eddsaSign(confirmData, decodeCrock(meltCoin.coinPriv));

    let valueOutput = Amounts.getZero(newCoinDenoms[0].value.currency);
    for (const denom of newCoinDenoms) {
      valueOutput = Amounts.add(valueOutput, denom.value).amount;
    }

    const refreshSession: RefreshSessionRecord = {
      confirmSig: encodeCrock(confirmSig),
      exchangeBaseUrl,
      hash: encodeCrock(sessionHash),
      meltCoinPub: meltCoin.coinPub,
      newDenomHashes: newCoinDenoms.map(d => d.denomPubHash),
      newDenoms: newCoinDenoms.map(d => d.denomPub),
      norevealIndex: undefined,
      planchetsForGammas: planchetsForGammas,
      transferPrivs,
      transferPubs,
      amountRefreshOutput: valueOutput,
      amountRefreshInput: valueWithFee,
      timestampCreated: getTimestampNow(),
      finishedTimestamp: undefined,
      lastError: undefined,
    };

    return refreshSession;
  }

  /**
   * Hash a string including the zero terminator.
   */
  hashString(str: string): string {
    const ts = new TextEncoder();
    const b = ts.encode(str + "\0");
    return encodeCrock(hash(b));
  }

  /**
   * Hash a denomination public key.
   */
  hashDenomPub(denomPub: string): string {
    return encodeCrock(hash(decodeCrock(denomPub)));
  }

  signCoinLink(
    oldCoinPriv: string,
    newDenomHash: string,
    oldCoinPub: string,
    transferPub: string,
    coinEv: string,
  ): string {
    const coinEvHash = hash(decodeCrock(coinEv));
    const coinLink = buildSigPS(SignaturePurpose.WALLET_COIN_LINK)
      .put(decodeCrock(newDenomHash))
      .put(decodeCrock(oldCoinPub))
      .put(decodeCrock(transferPub))
      .put(coinEvHash)
      .build();
    const coinPriv = decodeCrock(oldCoinPriv);
    const sig = eddsaSign(coinLink, coinPriv);
    return encodeCrock(sig);
  }

  /**
   * Validate the signature in a recoup confirmation.
   */
  isValidRecoupConfirmation(
    recoupCoinPub: EddsaPublicKeyString,
    recoupConfirmation: RecoupConfirmation,
    exchangeSigningKeys: ExchangeSignKeyJson[],
  ): boolean {
    const pubEnc = recoupConfirmation.exchange_pub;
    if (!checkSignKeyOkay(pubEnc, exchangeSigningKeys)) {
      return false;
    }

    const sig = decodeCrock(recoupConfirmation.exchange_sig);
    const pub = decodeCrock(pubEnc);

    if (recoupConfirmation.old_coin_pub) {
      // We're dealing with a refresh recoup
      const p = buildSigPS(
        SignaturePurpose.EXCHANGE_CONFIRM_RECOUP_REFRESH,
      ).put(timestampToBuffer(recoupConfirmation.timestamp))
       .put(amountToBuffer(Amounts.parseOrThrow(recoupConfirmation.amount)))
       .put(decodeCrock(recoupCoinPub))
       .put(decodeCrock(recoupConfirmation.old_coin_pub)).build();
       return eddsaVerify(p, sig, pub)
    } else if (recoupConfirmation.reserve_pub) {
      const p = buildSigPS(
        SignaturePurpose.EXCHANGE_CONFIRM_RECOUP_REFRESH,
      ).put(timestampToBuffer(recoupConfirmation.timestamp))
       .put(amountToBuffer(Amounts.parseOrThrow(recoupConfirmation.amount)))
       .put(decodeCrock(recoupCoinPub))
       .put(decodeCrock(recoupConfirmation.reserve_pub)).build();
       return eddsaVerify(p, sig, pub)
    } else {
      throw Error("invalid recoup confirmation");
    }
  }

  benchmark(repetitions: number): BenchmarkResult {
    let time_hash = 0;
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      this.hashString("hello world");
      time_hash += timer.performanceNow() - start;
    }

    let time_hash_big = 0;
    for (let i = 0; i < repetitions; i++) {
      const ba = randomBytes(4096);
      const start = timer.performanceNow();
      hash(ba);
      time_hash_big += timer.performanceNow() - start;
    }

    let time_eddsa_create = 0;
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      const pair = createEddsaKeyPair();
      time_eddsa_create += timer.performanceNow() - start;
    }

    let time_eddsa_sign = 0;
    const p = randomBytes(4096);

    const pair = createEddsaKeyPair();

    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      eddsaSign(p, pair.eddsaPriv);
      time_eddsa_sign += timer.performanceNow() - start;
    }

    const sig = eddsaSign(p, pair.eddsaPriv);

    let time_eddsa_verify = 0;
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      eddsaVerify(p, sig, pair.eddsaPub);
      time_eddsa_verify += timer.performanceNow() - start;
    }

    return {
      repetitions,
      time: {
        hash_small: time_hash,
        hash_big: time_hash_big,
        eddsa_create: time_eddsa_create,
        eddsa_sign: time_eddsa_sign,
        eddsa_verify: time_eddsa_verify,
      },
    };
  }
}
