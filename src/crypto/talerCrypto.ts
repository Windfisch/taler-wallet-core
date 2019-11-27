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

import nacl = require("./nacl-fast");
import bigint from "big-integer";
import { kdf } from "./kdf";

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
  const pair = nacl.sign_keyPair_fromSeed(eddsaPriv); 
  return pair.publicKey;
}

export function ecdheGetPublic(ecdhePriv: Uint8Array): Uint8Array {
  return nacl.scalarMult_base(ecdhePriv);
}

export function keyExchangeEddsaEcdhe(eddsaPriv: Uint8Array, ecdhePub: Uint8Array): Uint8Array {
  const ph = nacl.hash(eddsaPriv);
  const a = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    a[i] = ph[i];
  }
  const x = nacl.scalarMult(a, ecdhePub);
  return nacl.hash(x);
}

export function keyExchangeEcdheEddsa(ecdhePriv: Uint8Array, eddsaPub: Uint8Array): Uint8Array {
  const curve25519Pub = nacl.sign_ed25519_pk_to_curve25519(eddsaPub);
  const x = nacl.scalarMult(ecdhePriv, curve25519Pub);
  return nacl.hash(x);
}

interface RsaPub {
  N: bigint.BigInteger;
  e: bigint.BigInteger;
}

interface RsaBlindingKey {
  r: bigint.BigInteger;
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
    ctx[ctx.length - 2] = (counter >>> 8) & 0xFF;
    ctx[ctx.length - 1] = counter & 0xFF;
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

function stringToBuf(s: string) {
  const te = new TextEncoder();
  return te.encode(s);
}

function loadBigInt(arr: Uint8Array) {
  return bigint.fromArray(Array.from(arr), 256, false);
}

function rsaBlindingKeyDerive(rsaPub: RsaPub, bks: Uint8Array): bigint.BigInteger {
  const salt = stringToBuf("Blinding KDF extrator HMAC key");
  const info = stringToBuf("Blinding KDF");
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
function rsaGcdValidate(r: bigint.BigInteger, n: bigint.BigInteger) {
  const t = bigint.gcd(r, n);
  if (!t.equals(bigint.one)) {
    throw Error("malicious RSA public key");
  }
}

function rsaFullDomainHash(hm: Uint8Array, rsaPub: RsaPub): bigint.BigInteger {
  const info = stringToBuf("RSA-FDA FTpsW!");
  const salt = rsaPubEncode(rsaPub);
  const r = kdfMod(rsaPub.N, hm, salt, info);
  rsaGcdValidate(r, rsaPub.N);
  return r;
}

function rsaPubDecode(rsaPub: Uint8Array): RsaPub {
  const modulusLength = (rsaPub[0] << 8) | rsaPub[1];
  const exponentLength = (rsaPub[2] << 8) | rsaPub[3];
  const modulus = rsaPub.slice(4, 4 + modulusLength)
  const exponent = rsaPub.slice(4 + modulusLength, 4 + modulusLength + exponentLength);
  const res = {
    N: loadBigInt(modulus),
    e: loadBigInt(exponent),
  }
  return res;
}

function rsaPubEncode(rsaPub: RsaPub): Uint8Array {
  const mb = rsaPub.N.toArray(256).value;
  const eb = rsaPub.e.toArray(256).value;
  const out = new Uint8Array(4 + mb.length + eb.length);
  out[0] = (mb.length >>> 8) & 0xFF;
  out[1] = mb.length & 0xFF;
  out[2] = (eb.length >>> 8) & 0xFF;
  out[3] = eb.length & 0xFF;
  out.set(mb, 4);
  out.set(eb, 4 + mb.length);
  return out;
}

export function rsaBlind(hm: Uint8Array, bks: Uint8Array, rsaPubEnc: Uint8Array): Uint8Array {
  const rsaPub = rsaPubDecode(rsaPubEnc);
  const data = rsaFullDomainHash(hm, rsaPub);
  const r = rsaBlindingKeyDerive(rsaPub, bks);
  const r_e = r.modPow(rsaPub.e, rsaPub.N);
  const bm = r_e.multiply(data).mod(rsaPub.N);
  return new Uint8Array(bm.toArray(256).value);
}

export function rsaUnblind(sig: Uint8Array, rsaPubEnc: Uint8Array, bks: Uint8Array): Uint8Array {
  const rsaPub = rsaPubDecode(rsaPubEnc);
  const blinded_s = loadBigInt(sig);
  const r = rsaBlindingKeyDerive(rsaPub, bks);
  const r_inv = r.modInv(rsaPub.N);
  const s = blinded_s.multiply(r_inv).mod(rsaPub.N);
  return new Uint8Array(s.toArray(256).value);
}

export function rsaVerify(hm: Uint8Array, rsaSig: Uint8Array, rsaPubEnc: Uint8Array): boolean {
  const rsaPub = rsaPubDecode(rsaPubEnc);
  const d = rsaFullDomainHash(hm, rsaPub);
  const sig = loadBigInt(rsaSig);
  const sig_e = sig.modPow(rsaPub.e, rsaPub.N);
  return sig_e.equals(d);
}