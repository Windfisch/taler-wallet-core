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
 * Implementation of crypto-related high-level functions for the Taler wallet.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports.
 */

// FIXME: Crypto should not use DB Types!
import {
  AmountJson,
  Amounts,
  BenchmarkResult,
  buildSigPS,
  CoinDepositPermission,
  CoinEnvelope,
  createEddsaKeyPair,
  createHashContext,
  decodeCrock,
  DenomKeyType,
  DepositInfo,
  eddsaGetPublic,
  eddsaSign,
  eddsaVerify,
  encodeCrock,
  ExchangeProtocolVersion,
  FreshCoin,
  hash,
  HashCodeString,
  hashCoinEv,
  hashCoinEvInner,
  hashDenomPub,
  hashTruncate32,
  keyExchangeEcdheEddsa,
  Logger,
  MakeSyncSignatureRequest,
  PlanchetCreationRequest,
  WithdrawalPlanchet,
  randomBytes,
  RecoupRefreshRequest,
  RecoupRequest,
  RefreshPlanchetInfo,
  rsaBlind,
  rsaUnblind,
  rsaVerify,
  setupRefreshPlanchet,
  setupRefreshTransferPub,
  setupTipPlanchet,
  setupWithdrawPlanchet,
  stringToBytes,
  TalerSignaturePurpose,
  Timestamp,
  timestampTruncateToSecond,
  typedArrayConcat,
  BlindedDenominationSignature,
  RsaUnblindedSignature,
  UnblindedSignature,
  PlanchetUnblindInfo,
} from "@gnu-taler/taler-util";
import bigint from "big-integer";
import { DenominationRecord, WireFee } from "../../db.js";
import * as timer from "../../util/timer.js";
import {
  CreateRecoupRefreshReqRequest,
  CreateRecoupReqRequest,
  DerivedRefreshSession,
  DerivedTipPlanchet,
  DeriveRefreshSessionRequest,
  DeriveTipRequest,
  SignTrackTransactionRequest,
} from "../cryptoTypes.js";

const logger = new Logger("cryptoImplementation.ts");

function amountToBuffer(amount: AmountJson): Uint8Array {
  const buffer = new ArrayBuffer(8 + 4 + 12);
  const dvbuf = new DataView(buffer);
  const u8buf = new Uint8Array(buffer);
  const curr = stringToBytes(amount.currency);
  if (typeof dvbuf.setBigUint64 !== "undefined") {
    dvbuf.setBigUint64(0, BigInt(amount.value));
  } else {
    const arr = bigint(amount.value).toArray(2 ** 8).value;
    let offset = 8 - arr.length;
    for (let i = 0; i < arr.length; i++) {
      dvbuf.setUint8(offset++, arr[i]);
    }
  }
  dvbuf.setUint32(8, amount.fraction);
  u8buf.set(curr, 8 + 4);

  return u8buf;
}

function timestampRoundedToBuffer(ts: Timestamp): Uint8Array {
  const b = new ArrayBuffer(8);
  const v = new DataView(b);
  const tsRounded = timestampTruncateToSecond(ts);
  if (typeof v.setBigUint64 !== "undefined") {
    const s = BigInt(tsRounded.t_ms) * BigInt(1000);
    v.setBigUint64(0, s);
  } else {
    const s =
      tsRounded.t_ms === "never"
        ? bigint.zero
        : bigint(tsRounded.t_ms).times(1000);
    const arr = s.toArray(2 ** 8).value;
    let offset = 8 - arr.length;
    for (let i = 0; i < arr.length; i++) {
      v.setUint8(offset++, arr[i]);
    }
  }
  return new Uint8Array(b);
}

export interface PrimitiveWorker {
  setupRefreshPlanchet(arg0: {
    transfer_secret: string;
    coin_index: number;
  }): Promise<{
    coin_pub: string;
    coin_priv: string;
    blinding_key: string;
  }>;
  eddsaVerify(req: {
    msg: string;
    sig: string;
    pub: string;
  }): Promise<{ valid: boolean }>;

  eddsaSign(req: { msg: string; priv: string }): Promise<{ sig: string }>;
}

async function myEddsaSign(
  primitiveWorker: PrimitiveWorker | undefined,
  req: { msg: string; priv: string },
): Promise<{ sig: string }> {
  if (primitiveWorker) {
    return primitiveWorker.eddsaSign(req);
  }
  const sig = eddsaSign(decodeCrock(req.msg), decodeCrock(req.priv));
  return {
    sig: encodeCrock(sig),
  };
}

export class CryptoImplementation {
  static enableTracing = false;

  constructor(private primitiveWorker?: PrimitiveWorker) {}

  /**
   * Create a pre-coin of the given denomination to be withdrawn from then given
   * reserve.
   */
  async createPlanchet(
    req: PlanchetCreationRequest,
  ): Promise<WithdrawalPlanchet> {
    const denomPub = req.denomPub;
    if (denomPub.cipher === DenomKeyType.Rsa) {
      const reservePub = decodeCrock(req.reservePub);
      const denomPubRsa = decodeCrock(denomPub.rsa_public_key);
      const derivedPlanchet = setupWithdrawPlanchet(
        decodeCrock(req.secretSeed),
        req.coinIndex,
      );
      const coinPubHash = hash(derivedPlanchet.coinPub);
      const ev = rsaBlind(coinPubHash, derivedPlanchet.bks, denomPubRsa);
      const coinEv: CoinEnvelope = {
        cipher: DenomKeyType.Rsa,
        rsa_blinded_planchet: encodeCrock(ev),
      };
      const amountWithFee = Amounts.add(req.value, req.feeWithdraw).amount;
      const denomPubHash = hashDenomPub(req.denomPub);
      const evHash = hashCoinEv(coinEv, encodeCrock(denomPubHash));
      const withdrawRequest = buildSigPS(
        TalerSignaturePurpose.WALLET_RESERVE_WITHDRAW,
      )
        .put(amountToBuffer(amountWithFee))
        .put(denomPubHash)
        .put(evHash)
        .build();

      const sigResult = await myEddsaSign(this.primitiveWorker, {
        msg: encodeCrock(withdrawRequest),
        priv: req.reservePriv,
      });

      const planchet: WithdrawalPlanchet = {
        blindingKey: encodeCrock(derivedPlanchet.bks),
        coinEv,
        coinPriv: encodeCrock(derivedPlanchet.coinPriv),
        coinPub: encodeCrock(derivedPlanchet.coinPub),
        coinValue: req.value,
        denomPub,
        denomPubHash: encodeCrock(denomPubHash),
        reservePub: encodeCrock(reservePub),
        withdrawSig: sigResult.sig,
        coinEvHash: encodeCrock(evHash),
      };
      return planchet;
    } else {
      throw Error("unsupported cipher, unable to create planchet");
    }
  }

  /**
   * Create a planchet used for tipping, including the private keys.
   */
  createTipPlanchet(req: DeriveTipRequest): DerivedTipPlanchet {
    if (req.denomPub.cipher !== DenomKeyType.Rsa) {
      throw Error(`unsupported cipher (${req.denomPub.cipher})`);
    }
    const fc = setupTipPlanchet(decodeCrock(req.secretSeed), req.planchetIndex);
    const denomPub = decodeCrock(req.denomPub.rsa_public_key);
    const coinPubHash = hash(fc.coinPub);
    const ev = rsaBlind(coinPubHash, fc.bks, denomPub);
    const coinEv = {
      cipher: DenomKeyType.Rsa,
      rsa_blinded_planchet: encodeCrock(ev),
    };
    const tipPlanchet: DerivedTipPlanchet = {
      blindingKey: encodeCrock(fc.bks),
      coinEv,
      coinEvHash: encodeCrock(
        hashCoinEv(coinEv, encodeCrock(hashDenomPub(req.denomPub))),
      ),
      coinPriv: encodeCrock(fc.coinPriv),
      coinPub: encodeCrock(fc.coinPub),
    };
    return tipPlanchet;
  }

  signTrackTransaction(req: SignTrackTransactionRequest): string {
    const p = buildSigPS(TalerSignaturePurpose.MERCHANT_TRACK_TRANSACTION)
      .put(decodeCrock(req.contractTermsHash))
      .put(decodeCrock(req.wireHash))
      .put(decodeCrock(req.merchantPub))
      .put(decodeCrock(req.coinPub))
      .build();
    return encodeCrock(eddsaSign(p, decodeCrock(req.merchantPriv)));
  }

  /**
   * Create and sign a message to recoup a coin.
   */
  createRecoupRequest(req: CreateRecoupReqRequest): RecoupRequest {
    const p = buildSigPS(TalerSignaturePurpose.WALLET_COIN_RECOUP)
      .put(decodeCrock(req.denomPubHash))
      .put(decodeCrock(req.blindingKey))
      .build();

    const coinPriv = decodeCrock(req.coinPriv);
    const coinSig = eddsaSign(p, coinPriv);
    if (req.denomPub.cipher === DenomKeyType.Rsa) {
      const paybackRequest: RecoupRequest = {
        coin_blind_key_secret: req.blindingKey,
        coin_sig: encodeCrock(coinSig),
        denom_pub_hash: req.denomPubHash,
        denom_sig: req.denomSig,
        // FIXME!
        ewv: {
          cipher: "RSA",
        },
      };
      return paybackRequest;
    } else {
      throw new Error();
    }
  }

  /**
   * Create and sign a message to recoup a coin.
   */
  createRecoupRefreshRequest(
    req: CreateRecoupRefreshReqRequest,
  ): RecoupRefreshRequest {
    const p = buildSigPS(TalerSignaturePurpose.WALLET_COIN_RECOUP_REFRESH)
      .put(decodeCrock(req.denomPubHash))
      .put(decodeCrock(req.blindingKey))
      .build();

    const coinPriv = decodeCrock(req.coinPriv);
    const coinSig = eddsaSign(p, coinPriv);
    if (req.denomPub.cipher === DenomKeyType.Rsa) {
      const recoupRequest: RecoupRefreshRequest = {
        coin_blind_key_secret: req.blindingKey,
        coin_sig: encodeCrock(coinSig),
        denom_pub_hash: req.denomPubHash,
        denom_sig: req.denomSig,
        // FIXME!
        ewv: {
          cipher: "RSA",
        },
      };
      return recoupRequest;
    } else {
      throw new Error();
    }
  }

  /**
   * Check if a payment signature is valid.
   */
  isValidPaymentSignature(
    sig: string,
    contractHash: string,
    merchantPub: string,
  ): boolean {
    const p = buildSigPS(TalerSignaturePurpose.MERCHANT_PAYMENT_OK)
      .put(decodeCrock(contractHash))
      .build();
    const sigBytes = decodeCrock(sig);
    const pubBytes = decodeCrock(merchantPub);
    return eddsaVerify(p, sigBytes, pubBytes);
  }

  /**
   * Check if a wire fee is correctly signed.
   */
  async isValidWireFee(
    type: string,
    wf: WireFee,
    masterPub: string,
  ): Promise<boolean> {
    const p = buildSigPS(TalerSignaturePurpose.MASTER_WIRE_FEES)
      .put(hash(stringToBytes(type + "\0")))
      .put(timestampRoundedToBuffer(wf.startStamp))
      .put(timestampRoundedToBuffer(wf.endStamp))
      .put(amountToBuffer(wf.wireFee))
      .put(amountToBuffer(wf.closingFee))
      .put(amountToBuffer(wf.wadFee))
      .build();
    const sig = decodeCrock(wf.sig);
    const pub = decodeCrock(masterPub);
    if (this.primitiveWorker) {
      return (
        await this.primitiveWorker.eddsaVerify({
          msg: encodeCrock(p),
          pub: masterPub,
          sig: encodeCrock(sig),
        })
      ).valid;
    }
    return eddsaVerify(p, sig, pub);
  }

  /**
   * Check if the signature of a denomination is valid.
   */
  async isValidDenom(
    denom: DenominationRecord,
    masterPub: string,
  ): Promise<boolean> {
    const p = buildSigPS(TalerSignaturePurpose.MASTER_DENOMINATION_KEY_VALIDITY)
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
    const res = eddsaVerify(p, sig, pub);
    return res;
  }

  isValidWireAccount(
    versionCurrent: ExchangeProtocolVersion,
    paytoUri: string,
    sig: string,
    masterPub: string,
  ): boolean {
    const paytoHash = hashTruncate32(stringToBytes(paytoUri + "\0"));
    const p = buildSigPS(TalerSignaturePurpose.MASTER_WIRE_DETAILS)
      .put(paytoHash)
      .build();
    return eddsaVerify(p, decodeCrock(sig), decodeCrock(masterPub));
  }

  isValidContractTermsSignature(
    contractTermsHash: string,
    sig: string,
    merchantPub: string,
  ): boolean {
    const cthDec = decodeCrock(contractTermsHash);
    const p = buildSigPS(TalerSignaturePurpose.MERCHANT_CONTRACT)
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

  eddsaGetPublic(key: string): { priv: string; pub: string } {
    return {
      priv: key,
      pub: encodeCrock(eddsaGetPublic(decodeCrock(key))),
    };
  }

  unblindDenominationSignature(req: {
    planchet: PlanchetUnblindInfo;
    evSig: BlindedDenominationSignature;
  }): UnblindedSignature {
    if (req.evSig.cipher === DenomKeyType.Rsa) {
      if (req.planchet.denomPub.cipher !== DenomKeyType.Rsa) {
        throw new Error(
          "planchet cipher does not match blind signature cipher",
        );
      }
      const denomSig = rsaUnblind(
        decodeCrock(req.evSig.blinded_rsa_signature),
        decodeCrock(req.planchet.denomPub.rsa_public_key),
        decodeCrock(req.planchet.blindingKey),
      );
      return {
        cipher: DenomKeyType.Rsa,
        rsa_signature: encodeCrock(denomSig),
      };
    } else {
      throw Error(`unblinding for cipher ${req.evSig.cipher} not implemented`);
    }
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
  async signDepositPermission(
    depositInfo: DepositInfo,
  ): Promise<CoinDepositPermission> {
    // FIXME: put extensions here if used
    const hExt = new Uint8Array(64);
    const hAgeCommitment = new Uint8Array(32);
    let d: Uint8Array;
    if (depositInfo.denomKeyType === DenomKeyType.Rsa) {
      d = buildSigPS(TalerSignaturePurpose.WALLET_COIN_DEPOSIT)
        .put(decodeCrock(depositInfo.contractTermsHash))
        .put(hAgeCommitment)
        .put(hExt)
        .put(decodeCrock(depositInfo.wireInfoHash))
        .put(decodeCrock(depositInfo.denomPubHash))
        .put(timestampRoundedToBuffer(depositInfo.timestamp))
        .put(timestampRoundedToBuffer(depositInfo.refundDeadline))
        .put(amountToBuffer(depositInfo.spendAmount))
        .put(amountToBuffer(depositInfo.feeDeposit))
        .put(decodeCrock(depositInfo.merchantPub))
        .build();
    } else {
      throw Error("unsupported exchange protocol version");
    }
    const coinSigRes = await myEddsaSign(this.primitiveWorker, {
      msg: encodeCrock(d),
      priv: depositInfo.coinPriv,
    });

    if (depositInfo.denomKeyType === DenomKeyType.Rsa) {
      const s: CoinDepositPermission = {
        coin_pub: depositInfo.coinPub,
        coin_sig: coinSigRes.sig,
        contribution: Amounts.stringify(depositInfo.spendAmount),
        h_denom: depositInfo.denomPubHash,
        exchange_url: depositInfo.exchangeBaseUrl,
        ub_sig: {
          cipher: DenomKeyType.Rsa,
          rsa_signature: depositInfo.denomSig.rsa_signature,
        },
      };
      return s;
    } else {
      throw Error(
        `unsupported denomination cipher (${depositInfo.denomKeyType})`,
      );
    }
  }

  async deriveRefreshSession(
    req: DeriveRefreshSessionRequest,
  ): Promise<DerivedRefreshSession> {
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

    const planchetsForGammas: RefreshPlanchetInfo[][] = [];

    for (let i = 0; i < kappa; i++) {
      const transferKeyPair = setupRefreshTransferPub(
        decodeCrock(refreshSessionSecretSeed),
        i,
      );
      sessionHc.update(transferKeyPair.ecdhePub);
      transferPrivs.push(encodeCrock(transferKeyPair.ecdhePriv));
      transferPubs.push(encodeCrock(transferKeyPair.ecdhePub));
    }

    for (const denomSel of newCoinDenoms) {
      for (let i = 0; i < denomSel.count; i++) {
        if (denomSel.denomPub.cipher === DenomKeyType.Rsa) {
          const denomPubHash = hashDenomPub(denomSel.denomPub);
          sessionHc.update(denomPubHash);
        } else {
          throw new Error();
        }
      }
    }

    sessionHc.update(decodeCrock(meltCoinPub));
    sessionHc.update(amountToBuffer(valueWithFee));

    for (let i = 0; i < kappa; i++) {
      const planchets: RefreshPlanchetInfo[] = [];
      for (let j = 0; j < newCoinDenoms.length; j++) {
        const denomSel = newCoinDenoms[j];
        for (let k = 0; k < denomSel.count; k++) {
          const coinIndex = planchets.length;
          const transferPriv = decodeCrock(transferPrivs[i]);
          const oldCoinPub = decodeCrock(meltCoinPub);
          const transferSecret = keyExchangeEcdheEddsa(
            transferPriv,
            oldCoinPub,
          );
          let coinPub: Uint8Array;
          let coinPriv: Uint8Array;
          let blindingFactor: Uint8Array;
          // disabled while not implemented in the C code
          if (0 && this.primitiveWorker) {
            const r = await this.primitiveWorker.setupRefreshPlanchet({
              transfer_secret: encodeCrock(transferSecret),
              coin_index: coinIndex,
            });
            coinPub = decodeCrock(r.coin_pub);
            coinPriv = decodeCrock(r.coin_priv);
            blindingFactor = decodeCrock(r.blinding_key);
          } else {
            let fresh: FreshCoin = setupRefreshPlanchet(
              transferSecret,
              coinIndex,
            );
            coinPriv = fresh.coinPriv;
            coinPub = fresh.coinPub;
            blindingFactor = fresh.bks;
          }
          const coinPubHash = hash(coinPub);
          if (denomSel.denomPub.cipher !== DenomKeyType.Rsa) {
            throw Error("unsupported cipher, can't create refresh session");
          }
          const rsaDenomPub = decodeCrock(denomSel.denomPub.rsa_public_key);
          const ev = rsaBlind(coinPubHash, blindingFactor, rsaDenomPub);
          const coinEv: CoinEnvelope = {
            cipher: DenomKeyType.Rsa,
            rsa_blinded_planchet: encodeCrock(ev),
          };
          const coinEvHash = hashCoinEv(
            coinEv,
            encodeCrock(hashDenomPub(denomSel.denomPub)),
          );
          const planchet: RefreshPlanchetInfo = {
            blindingKey: encodeCrock(blindingFactor),
            coinEv,
            coinPriv: encodeCrock(coinPriv),
            coinPub: encodeCrock(coinPub),
            coinEvHash: encodeCrock(coinEvHash),
          };
          planchets.push(planchet);
          hashCoinEvInner(coinEv, sessionHc);
        }
      }
      planchetsForGammas.push(planchets);
    }

    const sessionHash = sessionHc.finish();
    let confirmData: Uint8Array;
    // FIXME: fill in age commitment
    const hAgeCommitment = new Uint8Array(32);
    confirmData = buildSigPS(TalerSignaturePurpose.WALLET_COIN_MELT)
      .put(sessionHash)
      .put(decodeCrock(meltCoinDenomPubHash))
      .put(hAgeCommitment)
      .put(amountToBuffer(valueWithFee))
      .put(amountToBuffer(meltFee))
      .build();

    const confirmSigResp = await myEddsaSign(this.primitiveWorker, {
      msg: encodeCrock(confirmData),
      priv: meltCoinPriv,
    });

    const refreshSession: DerivedRefreshSession = {
      confirmSig: confirmSigResp.sig,
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

  async signCoinLink(
    oldCoinPriv: string,
    newDenomHash: string,
    oldCoinPub: string,
    transferPub: string,
    coinEv: CoinEnvelope,
  ): Promise<string> {
    const coinEvHash = hashCoinEv(coinEv, newDenomHash);
    // FIXME: fill in
    const hAgeCommitment = new Uint8Array(32);
    const coinLink = buildSigPS(TalerSignaturePurpose.WALLET_COIN_LINK)
      .put(decodeCrock(newDenomHash))
      .put(decodeCrock(transferPub))
      .put(hAgeCommitment)
      .put(coinEvHash)
      .build();
    const sig = await myEddsaSign(this.primitiveWorker, {
      msg: encodeCrock(coinLink),
      priv: oldCoinPriv,
    });
    return sig.sig;
  }

  benchmark(repetitions: number): BenchmarkResult {
    let time_hash = BigInt(0);
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      this.hashString("hello world");
      time_hash += timer.performanceNow() - start;
    }

    let time_hash_big = BigInt(0);
    for (let i = 0; i < repetitions; i++) {
      const ba = randomBytes(4096);
      const start = timer.performanceNow();
      hash(ba);
      time_hash_big += timer.performanceNow() - start;
    }

    let time_eddsa_create = BigInt(0);
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      createEddsaKeyPair();
      time_eddsa_create += timer.performanceNow() - start;
    }

    let time_eddsa_sign = BigInt(0);
    const p = randomBytes(4096);

    const pair = createEddsaKeyPair();

    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      eddsaSign(p, pair.eddsaPriv);
      time_eddsa_sign += timer.performanceNow() - start;
    }

    const sig = eddsaSign(p, pair.eddsaPriv);

    let time_eddsa_verify = BigInt(0);
    for (let i = 0; i < repetitions; i++) {
      const start = timer.performanceNow();
      eddsaVerify(p, sig, pair.eddsaPub);
      time_eddsa_verify += timer.performanceNow() - start;
    }

    return {
      repetitions,
      time: {
        hash_small: Number(time_hash),
        hash_big: Number(time_hash_big),
        eddsa_create: Number(time_eddsa_create),
        eddsa_sign: Number(time_eddsa_sign),
        eddsa_verify: Number(time_eddsa_verify),
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
    const sigBlob = buildSigPS(TalerSignaturePurpose.SYNC_BACKUP_UPLOAD)
      .put(hOld)
      .put(hNew)
      .build();
    const uploadSig = eddsaSign(sigBlob, decodeCrock(req.accountPriv));
    return encodeCrock(uploadSig);
  }
}
