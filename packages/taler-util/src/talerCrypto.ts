/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Native implementation of GNU Taler crypto.
 */

/**
 * Imports.
 */
import * as nacl from "./nacl-fast.js";
import { kdf } from "./kdf.js";
import bigint from "big-integer";
import { DenominationPubKey, DenomKeyType } from "./talerTypes.js";
import { AssertionError, equal } from "assert";

export function getRandomBytes(n: number): Uint8Array {
  return nacl.randomBytes(n);
}

const encTable = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

class EncodingError extends Error {
  constructor() {
    super("Encoding error");
    Object.setPrototypeOf(this, EncodingError.prototype);
  }
}

function getValue(chr: string): number {
  let a = chr;
  switch (chr) {
    case "O":
    case "o":
      a = "0;";
      break;
    case "i":
    case "I":
    case "l":
    case "L":
      a = "1";
      break;
    case "u":
    case "U":
      a = "V";
  }

  if (a >= "0" && a <= "9") {
    return a.charCodeAt(0) - "0".charCodeAt(0);
  }

  if (a >= "a" && a <= "z") a = a.toUpperCase();
  let dec = 0;
  if (a >= "A" && a <= "Z") {
    if ("I" < a) dec++;
    if ("L" < a) dec++;
    if ("O" < a) dec++;
    if ("U" < a) dec++;
    return a.charCodeAt(0) - "A".charCodeAt(0) + 10 - dec;
  }
  throw new EncodingError();
}

export function encodeCrock(data: ArrayBuffer): string {
  const dataBytes = new Uint8Array(data);
  let sb = "";
  const size = data.byteLength;
  let bitBuf = 0;
  let numBits = 0;
  let pos = 0;
  while (pos < size || numBits > 0) {
    if (pos < size && numBits < 5) {
      const d = dataBytes[pos++];
      bitBuf = (bitBuf << 8) | d;
      numBits += 8;
    }
    if (numBits < 5) {
      // zero-padding
      bitBuf = bitBuf << (5 - numBits);
      numBits = 5;
    }
    const v = (bitBuf >>> (numBits - 5)) & 31;
    sb += encTable[v];
    numBits -= 5;
  }
  return sb;
}

export function decodeCrock(encoded: string): Uint8Array {
  const size = encoded.length;
  let bitpos = 0;
  let bitbuf = 0;
  let readPosition = 0;
  const outLen = Math.floor((size * 5) / 8);
  const out = new Uint8Array(outLen);
  let outPos = 0;

  while (readPosition < size || bitpos > 0) {
    if (readPosition < size) {
      const v = getValue(encoded[readPosition++]);
      bitbuf = (bitbuf << 5) | v;
      bitpos += 5;
    }
    while (bitpos >= 8) {
      const d = (bitbuf >>> (bitpos - 8)) & 0xff;
      out[outPos++] = d;
      bitpos -= 8;
    }
    if (readPosition == size && bitpos > 0) {
      bitbuf = (bitbuf << (8 - bitpos)) & 0xff;
      bitpos = bitbuf == 0 ? 0 : 8;
    }
  }
  return out;
}

export function eddsaGetPublic(eddsaPriv: Uint8Array): Uint8Array {
  const pair = nacl.crypto_sign_keyPair_fromSeed(eddsaPriv);
  return pair.publicKey;
}

export function ecdheGetPublic(ecdhePriv: Uint8Array): Uint8Array {
  return nacl.scalarMult_base(ecdhePriv);
}

export function keyExchangeEddsaEcdhe(
  eddsaPriv: Uint8Array,
  ecdhePub: Uint8Array,
): Uint8Array {
  const ph = nacl.hash(eddsaPriv);
  const a = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    a[i] = ph[i];
  }
  const x = nacl.scalarMult(a, ecdhePub);
  return nacl.hash(x);
}

export function keyExchangeEcdheEddsa(
  ecdhePriv: Uint8Array,
  eddsaPub: Uint8Array,
): Uint8Array {
  const curve25519Pub = nacl.sign_ed25519_pk_to_curve25519(eddsaPub);
  const x = nacl.scalarMult(ecdhePriv, curve25519Pub);
  return nacl.hash(x);
}

interface RsaPub {
  N: bigint.BigInteger;
  e: bigint.BigInteger;
}

/**
 * KDF modulo a big integer.
 */
function kdfMod(
  n: bigint.BigInteger,
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
): bigint.BigInteger {
  const nbits = n.bitLength().toJSNumber();
  const buflen = Math.floor((nbits - 1) / 8 + 1);
  const mask = (1 << (8 - (buflen * 8 - nbits))) - 1;
  let counter = 0;
  while (true) {
    const ctx = new Uint8Array(info.byteLength + 2);
    ctx.set(info, 0);
    ctx[ctx.length - 2] = (counter >>> 8) & 0xff;
    ctx[ctx.length - 1] = counter & 0xff;
    const buf = kdf(buflen, ikm, salt, ctx);
    const arr = Array.from(buf);
    arr[0] = arr[0] & mask;
    const r = bigint.fromArray(arr, 256, false);
    if (r.lt(n)) {
      return r;
    }
    counter++;
  }
}

function csKdfMod(
  n: bigint.BigInteger,
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
): Uint8Array {
  const nbits = n.bitLength().toJSNumber();
  const buflen = Math.floor((nbits - 1) / 8 + 1);
  const mask = (1 << (8 - (buflen * 8 - nbits))) - 1;
  let counter = 0;
  while (true) {
    const ctx = new Uint8Array(info.byteLength + 2);
    ctx.set(info, 0);
    ctx[ctx.length - 2] = (counter >>> 8) & 0xff;
    ctx[ctx.length - 1] = counter & 0xff;
    const buf = kdf(buflen, ikm, salt, ctx);
    const arr = Array.from(buf);
    arr[0] = arr[0] & mask;
    const r = bigint.fromArray(arr, 256, false);
    if (r.lt(n)) {
      return new Uint8Array(arr);
    }
    counter++;
  }
}

// Newer versions of node have TextEncoder and TextDecoder as a global,
// just like modern browsers.
// In older versions of node or environments that do not have these
// globals, they must be polyfilled (by adding them to globa/globalThis)
// before stringToBytes or bytesToString is called the first time.

let encoder: any;
let decoder: any;

export function stringToBytes(s: string): Uint8Array {
  if (!encoder) {
    // @ts-ignore
    encoder = new TextEncoder();
  }
  return encoder.encode(s);
}

export function bytesToString(b: Uint8Array): string {
  if (!decoder) {
    // @ts-ignore
    decoder = new TextDecoder();
  }
  return decoder.decode(b);
}

function loadBigInt(arr: Uint8Array): bigint.BigInteger {
  return bigint.fromArray(Array.from(arr), 256, false);
}

function rsaBlindingKeyDerive(
  rsaPub: RsaPub,
  bks: Uint8Array,
): bigint.BigInteger {
  const salt = stringToBytes("Blinding KDF extractor HMAC key");
  const info = stringToBytes("Blinding KDF");
  return kdfMod(rsaPub.N, bks, salt, info);
}

/*
 * Test for malicious RSA key.
 *
 * Assuming n is an RSA modulous and r is generated using a call to
 * GNUNET_CRYPTO_kdf_mod_mpi, if gcd(r,n) != 1 then n must be a
 * malicious RSA key designed to deanomize the user.
 *
 * @param r KDF result
 * @param n RSA modulus of the public key
 */
function rsaGcdValidate(r: bigint.BigInteger, n: bigint.BigInteger): void {
  const t = bigint.gcd(r, n);
  if (!t.equals(bigint.one)) {
    throw Error("malicious RSA public key");
  }
}

function rsaFullDomainHash(hm: Uint8Array, rsaPub: RsaPub): bigint.BigInteger {
  const info = stringToBytes("RSA-FDA FTpsW!");
  const salt = rsaPubEncode(rsaPub);
  const r = kdfMod(rsaPub.N, hm, salt, info);
  rsaGcdValidate(r, rsaPub.N);
  return r;
}

function rsaPubDecode(rsaPub: Uint8Array): RsaPub {
  const modulusLength = (rsaPub[0] << 8) | rsaPub[1];
  const exponentLength = (rsaPub[2] << 8) | rsaPub[3];
  if (4 + exponentLength + modulusLength != rsaPub.length) {
    throw Error("invalid RSA public key (format wrong)");
  }
  const modulus = rsaPub.slice(4, 4 + modulusLength);
  const exponent = rsaPub.slice(
    4 + modulusLength,
    4 + modulusLength + exponentLength,
  );
  const res = {
    N: loadBigInt(modulus),
    e: loadBigInt(exponent),
  };
  return res;
}

function rsaPubEncode(rsaPub: RsaPub): Uint8Array {
  const mb = rsaPub.N.toArray(256).value;
  const eb = rsaPub.e.toArray(256).value;
  const out = new Uint8Array(4 + mb.length + eb.length);
  out[0] = (mb.length >>> 8) & 0xff;
  out[1] = mb.length & 0xff;
  out[2] = (eb.length >>> 8) & 0xff;
  out[3] = eb.length & 0xff;
  out.set(mb, 4);
  out.set(eb, 4 + mb.length);
  return out;
}

export function rsaBlind(
  hm: Uint8Array,
  bks: Uint8Array,
  rsaPubEnc: Uint8Array,
): Uint8Array {
  const rsaPub = rsaPubDecode(rsaPubEnc);
  const data = rsaFullDomainHash(hm, rsaPub);
  const r = rsaBlindingKeyDerive(rsaPub, bks);
  const r_e = r.modPow(rsaPub.e, rsaPub.N);
  const bm = r_e.multiply(data).mod(rsaPub.N);
  return new Uint8Array(bm.toArray(256).value);
}

export function rsaUnblind(
  sig: Uint8Array,
  rsaPubEnc: Uint8Array,
  bks: Uint8Array,
): Uint8Array {
  const rsaPub = rsaPubDecode(rsaPubEnc);
  const blinded_s = loadBigInt(sig);
  const r = rsaBlindingKeyDerive(rsaPub, bks);
  const r_inv = r.modInv(rsaPub.N);
  const s = blinded_s.multiply(r_inv).mod(rsaPub.N);
  return new Uint8Array(s.toArray(256).value);
}

export function rsaVerify(
  hm: Uint8Array,
  rsaSig: Uint8Array,
  rsaPubEnc: Uint8Array,
): boolean {
  const rsaPub = rsaPubDecode(rsaPubEnc);
  const d = rsaFullDomainHash(hm, rsaPub);
  const sig = loadBigInt(rsaSig);
  const sig_e = sig.modPow(rsaPub.e, rsaPub.N);
  return sig_e.equals(d);
}

export type CsSignature = {
  s: Uint8Array;
  rPub: Uint8Array;
};

export type CsBlindSignature = {
  sBlind: Uint8Array;
  rPubBlind: Uint8Array;
};

export type CsBlindingSecrets = {
  alpha: [Uint8Array, Uint8Array];
  beta: [Uint8Array, Uint8Array];
};

function typedArrayConcat(chunks: Uint8Array[]): Uint8Array {
  let payloadLen = 0;
  for (const c of chunks) {
    payloadLen += c.byteLength;
  }
  const buf = new ArrayBuffer(payloadLen);
  const u8buf = new Uint8Array(buf);
  let p = 0;
  for (const c of chunks) {
    u8buf.set(c, p);
    p += c.byteLength;
  }
  return u8buf;
}

/**
 * Map to scalar subgroup function
 * perform clamping as described in RFC7748
 * @param scalar
 */
function mtoSS(scalar: Uint8Array): Uint8Array {
  scalar[0] &= 248;
  scalar[31] &= 127;
  scalar[31] |= 64;
  return scalar;
}

/**
 * The function returns the CS blinding secrets from a seed
 * @param bseed seed to derive blinding secrets
 * @returns blinding secrets
 */
export function deriveSecrets(bseed: Uint8Array): CsBlindingSecrets {
  const outLen = 130;
  const salt = stringToBytes("alphabeta");
  const rndout = kdf(outLen, bseed, salt);
  const secrets: CsBlindingSecrets = {
    alpha: [mtoSS(rndout.slice(0, 32)), mtoSS(rndout.slice(64, 96))],
    beta: [mtoSS(rndout.slice(32, 64)), mtoSS(rndout.slice(96, 128))],
  };
  return secrets;
}

/**
 * Used for testing, simple scalar multiplication with base point of Ed25519
 * @param s scalar
 * @returns new point sG
 */
export async function scalarMultBase25519(s: Uint8Array): Promise<Uint8Array> {
  return nacl.crypto_scalarmult_ed25519_base_noclamp(s);
}

/**
 * calculation of the blinded public point R in CS
 * @param csPub denomination publik key
 * @param secrets client blinding secrets
 * @param rPub public R received from /csr API
 */
export async function calcRBlind(
  csPub: Uint8Array,
  secrets: CsBlindingSecrets,
  rPub: [Uint8Array, Uint8Array],
): Promise<[Uint8Array, Uint8Array]> {
  const aG0 = nacl.crypto_scalarmult_ed25519_base_noclamp(secrets.alpha[0]);
  const aG1 = nacl.crypto_scalarmult_ed25519_base_noclamp(secrets.alpha[1]);

  const bDp0 = nacl.crypto_scalarmult_ed25519_noclamp(secrets.beta[0], csPub);
  const bDp1 = nacl.crypto_scalarmult_ed25519_noclamp(secrets.beta[1], csPub);

  const res0 = nacl.crypto_core_ed25519_add(aG0, bDp0);
  const res1 = nacl.crypto_core_ed25519_add(aG1, bDp1);
  return [
    nacl.crypto_core_ed25519_add(rPub[0], res0),
    nacl.crypto_core_ed25519_add(rPub[1], res1),
  ];
}

/**
 * FDH function used in CS
 * @param hm message hash
 * @param rPub public R included in FDH
 * @param csPub denomination public key as context
 * @returns mapped Curve25519 scalar
 */
function csFDH(
  hm: Uint8Array,
  rPub: Uint8Array,
  csPub: Uint8Array,
): Uint8Array {
  const lMod = Array.from(
    new Uint8Array([
      0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x14, 0xde, 0xf9, 0xde, 0xa2, 0xf7, 0x9c, 0xd6,
      0x58, 0x12, 0x63, 0x1a, 0x5c, 0xf5, 0xd3, 0xed,
    ]),
  );
  const L = bigint.fromArray(lMod, 256, false);

  const info = stringToBytes("Curve25519FDH");
  const preshash = nacl.hash(typedArrayConcat([rPub, hm]));
  return csKdfMod(L, preshash, csPub, info).reverse();
}

/**
 * blinding seed derived from coin private key
 * @param coinPriv private key of the corresponding coin
 * @param rPub public R received from /csr API
 * @returns blinding seed
 */
export function deriveBSeed(
  coinPriv: Uint8Array,
  rPub: [Uint8Array, Uint8Array],
): Uint8Array {
  const outLen = 32;
  const salt = stringToBytes("b-seed");
  const ikm = typedArrayConcat([coinPriv, rPub[0], rPub[1]]);
  return kdf(outLen, ikm, salt);
}

/**
 * Derive withdraw nonce, used in /csr request
 * Note: In withdraw protocol, the nonce is chosen randomly
 * @param coinPriv coin private key
 * @returns nonce
 */
export function deriveWithdrawNonce(
  coinPriv: Uint8Array,
): Uint8Array { 
  const outLen = 32;
  const salt = stringToBytes("n");
  return kdf(outLen, coinPriv, salt);
}

/**
 * Blind operation for CS signatures, used after /csr call
 * @param bseed blinding seed to derive blinding secrets
 * @param rPub public R received from /csr
 * @param csPub denomination public key
 * @param hm message to blind
 * @returns two blinded c
 */
export async function csBlind(
  bseed: Uint8Array,
  rPub: [Uint8Array, Uint8Array],
  csPub: Uint8Array,
  hm: Uint8Array,
): Promise<[Uint8Array, Uint8Array]> {
  const secrets = deriveSecrets(bseed);
  const rPubBlind = await calcRBlind(csPub, secrets, rPub);
  const c_0 = csFDH(hm, rPubBlind[0], csPub);
  const c_1 = csFDH(hm, rPubBlind[1], csPub);
  return [
    nacl.crypto_core_ed25519_scalar_add(c_0, secrets.beta[0]),
    nacl.crypto_core_ed25519_scalar_add(c_1, secrets.beta[1]),
  ];
}

/**
 * Unblind operation to unblind the signature
 * @param bseed seed to derive secrets
 * @param rPub public R received from /csr
 * @param csPub denomination publick key
 * @param b returned from exchange to select c
 * @param csSig blinded signature
 * @returns unblinded signature
 */
export async function csUnblind(
  bseed: Uint8Array,
  rPub: [Uint8Array, Uint8Array],
  csPub: Uint8Array,
  b: number,
  csSig: CsBlindSignature,
): Promise<CsSignature> {
  if (b != 0 && b != 1) {
    throw new AssertionError();
  }
  const secrets = deriveSecrets(bseed);
  const rPubDash = (await calcRBlind(csPub, secrets, rPub))[b];
  const sig: CsSignature = {
    s: nacl.crypto_core_ed25519_scalar_add(csSig.sBlind, secrets.alpha[b]),
    rPub: rPubDash,
  };
  return sig;
}

/**
 * Verification algorithm for CS signatures
 * @param hm message signed
 * @param csSig unblinded signature
 * @param csPub denomination publick key
 * @returns true if valid, false if unvalid
 */
export async function csVerify(
  hm: Uint8Array,
  csSig: CsSignature,
  csPub: Uint8Array,
): Promise<boolean> {
  const cDash = csFDH(hm, csSig.rPub, csPub);
  const sG = nacl.crypto_scalarmult_ed25519_base_noclamp(csSig.s);
  const cbDp = nacl.crypto_scalarmult_ed25519_noclamp(cDash, csPub);
  const sGeq = nacl.crypto_core_ed25519_add(csSig.rPub, cbDp);
  return nacl.verify(sG, sGeq);
}

export interface EddsaKeyPair {
  eddsaPub: Uint8Array;
  eddsaPriv: Uint8Array;
}

export interface EcdheKeyPair {
  ecdhePub: Uint8Array;
  ecdhePriv: Uint8Array;
}

export function createEddsaKeyPair(): EddsaKeyPair {
  const eddsaPriv = nacl.randomBytes(32);
  const eddsaPub = eddsaGetPublic(eddsaPriv);
  return { eddsaPriv, eddsaPub };
}

export function createEcdheKeyPair(): EcdheKeyPair {
  const ecdhePriv = nacl.randomBytes(32);
  const ecdhePub = ecdheGetPublic(ecdhePriv);
  return { ecdhePriv, ecdhePub };
}

export function hash(d: Uint8Array): Uint8Array {
  return nacl.hash(d);
}

/**
 * Hash a denomination public key according to the
 * algorithm of exchange protocol v10.
 */
export function hashDenomPub(pub: DenominationPubKey): Uint8Array {
  if (pub.cipher === DenomKeyType.Rsa) {
    const pubBuf = decodeCrock(pub.rsa_public_key);
    const hashInputBuf = new ArrayBuffer(pubBuf.length + 4 + 4);
    const uint8ArrayBuf = new Uint8Array(hashInputBuf);
    const dv = new DataView(hashInputBuf);
    dv.setUint32(0, pub.age_mask ?? 0);
    dv.setUint32(4, pub.cipher);
    uint8ArrayBuf.set(pubBuf, 8);
    return nacl.hash(uint8ArrayBuf);
  } else if (pub.cipher === DenomKeyType.LegacyRsa) {
    return hash(decodeCrock(pub.rsa_public_key));
  } else if (pub.cipher === DenomKeyType.ClauseSchnorr) {
    const pubBuf = decodeCrock(pub.cs_public_key);
    const hashInputBuf = new ArrayBuffer(pubBuf.length + 4 + 4);
    const uint8ArrayBuf = new Uint8Array(hashInputBuf);
    const dv = new DataView(hashInputBuf);
    dv.setUint32(0, pub.age_mask ?? 0);
    dv.setUint32(4, pub.cipher);
    uint8ArrayBuf.set(pubBuf, 8);
    return nacl.hash(uint8ArrayBuf);
  } else {
    throw Error(
      `unsupported cipher (${
        (pub as DenominationPubKey).cipher
      }), unable to hash`,
    );
  }
}

export function eddsaSign(msg: Uint8Array, eddsaPriv: Uint8Array): Uint8Array {
  const pair = nacl.crypto_sign_keyPair_fromSeed(eddsaPriv);
  return nacl.sign_detached(msg, pair.secretKey);
}

export function eddsaVerify(
  msg: Uint8Array,
  sig: Uint8Array,
  eddsaPub: Uint8Array,
): boolean {
  return nacl.sign_detached_verify(msg, sig, eddsaPub);
}

export function createHashContext(): nacl.HashState {
  return new nacl.HashState();
}

export interface FreshCoin {
  coinPub: Uint8Array;
  coinPriv: Uint8Array;
  bks: Uint8Array;
}

export function setupRefreshPlanchet(
  secretSeed: Uint8Array,
  coinNumber: number,
): FreshCoin {
  const info = stringToBytes("taler-coin-derivation");
  const saltArrBuf = new ArrayBuffer(4);
  const salt = new Uint8Array(saltArrBuf);
  const saltDataView = new DataView(saltArrBuf);
  saltDataView.setUint32(0, coinNumber);
  const out = kdf(64, secretSeed, salt, info);
  const coinPriv = out.slice(0, 32);
  const bks = out.slice(32, 64);
  return {
    bks,
    coinPriv,
    coinPub: eddsaGetPublic(coinPriv),
  };
}

export function setupWithdrawPlanchet(
  secretSeed: Uint8Array,
  coinNumber: number,
): FreshCoin {
  const info = stringToBytes("taler-withdrawal-coin-derivation");
  const saltArrBuf = new ArrayBuffer(4);
  const salt = new Uint8Array(saltArrBuf);
  const saltDataView = new DataView(saltArrBuf);
  saltDataView.setUint32(0, coinNumber);
  const out = kdf(64, secretSeed, salt, info);
  const coinPriv = out.slice(0, 32);
  const bks = out.slice(32, 64);
  return {
    bks,
    coinPriv,
    coinPub: eddsaGetPublic(coinPriv),
  };
}

export function setupTipPlanchet(
  secretSeed: Uint8Array,
  coinNumber: number,
): FreshCoin {
  const info = stringToBytes("taler-tip-coin-derivation");
  const saltArrBuf = new ArrayBuffer(4);
  const salt = new Uint8Array(saltArrBuf);
  const saltDataView = new DataView(saltArrBuf);
  saltDataView.setUint32(0, coinNumber);
  const out = kdf(64, secretSeed, salt, info);
  const coinPriv = out.slice(0, 32);
  const bks = out.slice(32, 64);
  return {
    bks,
    coinPriv,
    coinPub: eddsaGetPublic(coinPriv),
  };
}

export function setupRefreshTransferPub(
  secretSeed: Uint8Array,
  transferPubIndex: number,
): EcdheKeyPair {
  const info = stringToBytes("taler-transfer-pub-derivation");
  const saltArrBuf = new ArrayBuffer(4);
  const salt = new Uint8Array(saltArrBuf);
  const saltDataView = new DataView(saltArrBuf);
  saltDataView.setUint32(0, transferPubIndex);
  const out = kdf(32, secretSeed, salt, info);
  return {
    ecdhePriv: out,
    ecdhePub: ecdheGetPublic(out),
  };
}

export enum TalerSignaturePurpose {
  MERCHANT_TRACK_TRANSACTION = 1103,
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
  WALLET_COIN_RECOUP_REFRESH = 1206,
  EXCHANGE_CONFIRM_RECOUP = 1039,
  EXCHANGE_CONFIRM_RECOUP_REFRESH = 1041,
  ANASTASIS_POLICY_UPLOAD = 1400,
  ANASTASIS_POLICY_DOWNLOAD = 1401,
  SYNC_BACKUP_UPLOAD = 1450,
}

export class SignaturePurposeBuilder {
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

export function buildSigPS(purposeNum: number): SignaturePurposeBuilder {
  return new SignaturePurposeBuilder(purposeNum);
}
