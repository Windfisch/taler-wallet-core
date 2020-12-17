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
  RefreshPlanchet,
  WireFee,
  CoinSourceType,
} from "../../types/dbTypes";

import { CoinDepositPermission, RecoupRequest } from "../../types/talerTypes";
import {
  BenchmarkResult,
  PlanchetCreationResult,
  PlanchetCreationRequest,
  DepositInfo,
  MakeSyncSignatureRequest,
} from "../../types/walletTypes";
import { AmountJson, Amounts } from "../../util/amounts";
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
  keyExchangeEcdheEddsa,
  setupRefreshPlanchet,
  rsaVerify,
  setupRefreshTransferPub,
  setupTipPlanchet,
  setupWithdrawPlanchet,
} from "../talerCrypto";
import { randomBytes } from "../primitives/nacl-fast";
import { kdf } from "../primitives/kdf";
import { Timestamp, timestampTruncateToSecond } from "../../util/time";

import { Logger } from "../../util/logging";
import {
  DerivedRefreshSession,
  DerivedTipPlanchet,
  DeriveRefreshSessionRequest,
  DeriveTipRequest,
} from "../../types/cryptoTypes";

const logger = new Logger("cryptoImplementation.ts");

enum SignaturePurpose {
  WALLET_RESERVE_WITHDRAW = 1200,
  WALLET_COIN_DEPOSIT = 1201,
  MASTER_DENOMINATION_KEY_VALIDITY = 1025,
  MASTER_WIRE_FEES = 1028,
  MASTER_WIRE_DETAILS = 1030,
  WALLET_COIN_MELT = 1202,
  TEST = 4242,
  MERCHANT_PAYMENT_OK = 1104,
  MERCHANT_CONTRACT = 1101,
  WALLET_COIN_RECOUP = 1203,
  WALLET_COIN_LINK = 1204,
  EXCHANGE_CONFIRM_RECOUP = 1039,
  EXCHANGE_CONFIRM_RECOUP_REFRESH = 1041,
  SYNC_BACKUP_UPLOAD = 1450,
}

function amountToBuffer(amount: AmountJson): Uint8Array {
  const buffer = new ArrayBuffer(8 + 4 + 12);
  const dvbuf = new DataView(buffer);
  const u8buf = new Uint8Array(buffer);
  const curr = stringToBytes(amount.currency);
  dvbuf.setBigUint64(0, BigInt(amount.value));
  dvbuf.setUint32(8, amount.fraction);
  u8buf.set(curr, 8 + 4);

  return u8buf;
}

function timestampRoundedToBuffer(ts: Timestamp): Uint8Array {
  const b = new ArrayBuffer(8);
  const v = new DataView(b);
  const tsRounded = timestampTruncateToSecond(ts);
  const s = BigInt(tsRounded.t_ms) * BigInt(1000);
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
    for (const c of this.chunks) {
      payloadLen += c.byteLength;
    }
    const buf = new ArrayBuffer(4 + 4 + payloadLen);
    const u8buf = new Uint8Array(buf);
    let p = 8;
    for (const c of this.chunks) {
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

export class CryptoImplementation {
  static enableTracing = false;

  /**
   * Create a pre-coin of the given denomination to be withdrawn from then given
   * reserve.
   */
  createPlanchet(req: PlanchetCreationRequest): PlanchetCreationResult {
    const reservePub = decodeCrock(req.reservePub);
    const reservePriv = decodeCrock(req.reservePriv);
    const denomPub = decodeCrock(req.denomPub);
    const derivedPlanchet = setupWithdrawPlanchet(
      decodeCrock(req.secretSeed),
      req.coinIndex,
    );
    const coinPubHash = hash(derivedPlanchet.coinPub);
    const ev = rsaBlind(coinPubHash, derivedPlanchet.bks, denomPub);
    const amountWithFee = Amounts.add(req.value, req.feeWithdraw).amount;
    const denomPubHash = hash(denomPub);
    const evHash = hash(ev);

    const withdrawRequest = buildSigPS(SignaturePurpose.WALLET_RESERVE_WITHDRAW)
      .put(reservePub)
      .put(amountToBuffer(amountWithFee))
      .put(denomPubHash)
      .put(evHash)
      .build();

    const sig = eddsaSign(withdrawRequest, reservePriv);

    const planchet: PlanchetCreationResult = {
      blindingKey: encodeCrock(derivedPlanchet.bks),
      coinEv: encodeCrock(ev),
      coinPriv: encodeCrock(derivedPlanchet.coinPriv),
      coinPub: encodeCrock(derivedPlanchet.coinPub),
      coinValue: req.value,
      denomPub: encodeCrock(denomPub),
      denomPubHash: encodeCrock(denomPubHash),
      reservePub: encodeCrock(reservePub),
      withdrawSig: encodeCrock(sig),
      coinEvHash: encodeCrock(evHash),
    };
    return planchet;
  }

  /**
   * Create a planchet used for tipping, including the private keys.
   */
  createTipPlanchet(req: DeriveTipRequest): DerivedTipPlanchet {
    const fc = setupTipPlanchet(decodeCrock(req.secretSeed), req.planchetIndex);
    const denomPub = decodeCrock(req.denomPub);
    const blindingFactor = createBlindingKeySecret();
    const coinPubHash = hash(fc.coinPub);
    const ev = rsaBlind(coinPubHash, blindingFactor, denomPub);

    const tipPlanchet: DerivedTipPlanchet = {
      blindingKey: encodeCrock(blindingFactor),
      coinEv: encodeCrock(ev),
      coinEvHash: encodeCrock(hash(ev)),
      coinPriv: encodeCrock(fc.coinPriv),
      coinPub: encodeCrock(fc.coinPub),
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
      .put(timestampRoundedToBuffer(wf.startStamp))
      .put(timestampRoundedToBuffer(wf.endStamp))
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
      .put(timestampRoundedToBuffer(denom.stampStart))
      .put(timestampRoundedToBuffer(denom.stampExpireWithdraw))
      .put(timestampRoundedToBuffer(denom.stampExpireDeposit))
      .put(timestampRoundedToBuffer(denom.stampExpireLegal))
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
    const p = buildSigPS(SignaturePurpose.MASTER_WIRE_DETAILS).put(h).build();
    return eddsaVerify(p, decodeCrock(sig), decodeCrock(masterPub));
  }

  isValidContractTermsSignature(
    contractTermsHash: string,
    sig: string,
    merchantPub: string,
  ): boolean {
    const cthDec = decodeCrock(contractTermsHash);
    const p = buildSigPS(SignaturePurpose.MERCHANT_CONTRACT)
      .put(cthDec)
      .build();
    return eddsaVerify(p, decodeCrock(sig), decodeCrock(merchantPub));
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
      .put(decodeCrock(depositInfo.denomPubHash))
      .put(timestampRoundedToBuffer(depositInfo.timestamp))
      .put(timestampRoundedToBuffer(depositInfo.refundDeadline))
      .put(amountToBuffer(depositInfo.spendAmount))
      .put(amountToBuffer(depositInfo.feeDeposit))
      .put(decodeCrock(depositInfo.merchantPub))
      .put(decodeCrock(depositInfo.coinPub))
      .build();
    const coinSig = eddsaSign(d, decodeCrock(depositInfo.coinPriv));

    const s: CoinDepositPermission = {
      coin_pub: depositInfo.coinPub,
      coin_sig: encodeCrock(coinSig),
      contribution: Amounts.stringify(depositInfo.spendAmount),
      h_denom: depositInfo.denomPubHash,
      exchange_url: depositInfo.exchangeBaseUrl,
      ub_sig: depositInfo.denomSig,
    };
    return s;
  }

  deriveRefreshSession(
    req: DeriveRefreshSessionRequest,
  ): DerivedRefreshSession {
    const {
      newCoinDenoms,
      feeRefresh: meltFee,
      kappa,
      meltCoinDenomPubHash,
      meltCoinPriv,
      meltCoinPub,
      sessionSecretSeed: refreshSessionSecretSeed,
    } = req;

    const currency = newCoinDenoms[0].value.currency;
    let valueWithFee = Amounts.getZero(currency);

    for (const ncd of newCoinDenoms) {
      const t = Amounts.add(ncd.value, ncd.feeWithdraw).amount;
      valueWithFee = Amounts.add(
        valueWithFee,
        Amounts.mult(t, ncd.count).amount,
      ).amount;
    }

    // melt fee
    valueWithFee = Amounts.add(valueWithFee, meltFee).amount;

    const sessionHc = createHashContext();

    const transferPubs: string[] = [];
    const transferPrivs: string[] = [];

    const planchetsForGammas: RefreshPlanchet[][] = [];

    logger.trace("starting RC computation");

    for (let i = 0; i < kappa; i++) {
      const transferKeyPair = setupRefreshTransferPub(
        decodeCrock(refreshSessionSecretSeed),
        i,
      );
      sessionHc.update(transferKeyPair.ecdhePub);
      logger.trace(
        `HASH transfer_pub ${encodeCrock(transferKeyPair.ecdhePub)}`,
      );
      transferPrivs.push(encodeCrock(transferKeyPair.ecdhePriv));
      transferPubs.push(encodeCrock(transferKeyPair.ecdhePub));
    }

    for (const denomSel of newCoinDenoms) {
      for (let i = 0; i < denomSel.count; i++) {
        const r = decodeCrock(denomSel.denomPub);
        sessionHc.update(r);
        logger.trace(`HASH new_coins ${encodeCrock(r)}`);
      }
    }

    sessionHc.update(decodeCrock(meltCoinPub));
    logger.trace(`HASH coin_pub ${meltCoinPub}`);
    sessionHc.update(amountToBuffer(valueWithFee));
    logger.trace(
      `HASH melt_amount ${encodeCrock(amountToBuffer(valueWithFee))}`,
    );

    for (let i = 0; i < kappa; i++) {
      const planchets: RefreshPlanchet[] = [];
      for (let j = 0; j < newCoinDenoms.length; j++) {
        const denomSel = newCoinDenoms[j];
        for (let k = 0; k < denomSel.count; k++) {
          const coinNumber = planchets.length;
          const transferPriv = decodeCrock(transferPrivs[i]);
          const oldCoinPub = decodeCrock(meltCoinPub);
          const transferSecret = keyExchangeEcdheEddsa(
            transferPriv,
            oldCoinPub,
          );
          const fresh = setupRefreshPlanchet(transferSecret, coinNumber);
          const coinPriv = fresh.coinPriv;
          const coinPub = fresh.coinPub;
          const blindingFactor = fresh.bks;
          const pubHash = hash(coinPub);
          const denomPub = decodeCrock(denomSel.denomPub);
          const ev = rsaBlind(pubHash, blindingFactor, denomPub);
          const planchet: RefreshPlanchet = {
            blindingKey: encodeCrock(blindingFactor),
            coinEv: encodeCrock(ev),
            privateKey: encodeCrock(coinPriv),
            publicKey: encodeCrock(coinPub),
            coinEvHash: encodeCrock(hash(ev)),
          };
          planchets.push(planchet);

          logger.trace(
            `GENERATE i=${i} coin=${coinNumber} m=${encodeCrock(
              pubHash,
            )} bf=${encodeCrock(blindingFactor)} dp=${encodeCrock(
              denomPub,
            )} ev=${encodeCrock(ev)}`,
          );

          sessionHc.update(ev);
          logger.trace(`HASH ev ${encodeCrock(ev)}`);
        }
      }
      planchetsForGammas.push(planchets);
    }

    const sessionHash = sessionHc.finish();

    logger.trace(`RHASH ${encodeCrock(sessionHash)}`);

    const confirmData = buildSigPS(SignaturePurpose.WALLET_COIN_MELT)
      .put(sessionHash)
      .put(decodeCrock(meltCoinDenomPubHash))
      .put(amountToBuffer(valueWithFee))
      .put(amountToBuffer(meltFee))
      .put(decodeCrock(meltCoinPub))
      .build();

    const confirmSig = eddsaSign(confirmData, decodeCrock(meltCoinPriv));

    const refreshSession: DerivedRefreshSession = {
      confirmSig: encodeCrock(confirmSig),
      hash: encodeCrock(sessionHash),
      meltCoinPub: meltCoinPub,
      planchetsForGammas: planchetsForGammas,
      transferPrivs,
      transferPubs,
      meltValueWithFee: valueWithFee,
    };

    return refreshSession;
  }

  /**
   * Hash a string including the zero terminator.
   */
  hashString(str: string): string {
    const b = stringToBytes(str + "\0");
    return encodeCrock(hash(b));
  }

  /**
   * Hash a crockford encoded value.
   */
  hashEncoded(encodedBytes: string): string {
    return encodeCrock(hash(decodeCrock(encodedBytes)));
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
      createEddsaKeyPair();
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

  makeSyncSignature(req: MakeSyncSignatureRequest): string {
    const hNew = decodeCrock(req.newHash);
    let hOld: Uint8Array;
    if (req.oldHash) {
      hOld = decodeCrock(req.oldHash);
    } else {
      hOld = new Uint8Array(64);
    }
    const sigBlob = new SignaturePurposeBuilder(
      SignaturePurpose.SYNC_BACKUP_UPLOAD,
    )
      .put(hOld)
      .put(hNew)
      .build();
    const uploadSig = eddsaSign(sigBlob, decodeCrock(req.accountPriv));
    return encodeCrock(uploadSig);
  }
}
