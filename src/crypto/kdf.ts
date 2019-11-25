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

import nacl = require("./nacl-fast");
import { sha256 } from "./sha256";

let createHmac: any;

export function sha512(data: Uint8Array): Uint8Array {
  return nacl.hash(data);
}

export function hmac(
  digest: (d: Uint8Array) => Uint8Array,
  blockSize: number,
  key: Uint8Array,
  message: Uint8Array,
): Uint8Array {
  if (key.byteLength > blockSize) {
    key = digest(key);
  }
  console.log("message", message);
  if (key.byteLength < blockSize) {
    const k = key;
    key = new Uint8Array(blockSize);
    key.set(k, 0);
  }
  const okp = new Uint8Array(blockSize);
  const ikp = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ikp[i] = key[i] ^ 0x36;
    okp[i] = key[i] ^ 0x5c;
  }
  const b1 = new Uint8Array(blockSize + message.byteLength);
  b1.set(ikp, 0);
  b1.set(message, blockSize);
  const h0 = digest(b1);
  const b2 = new Uint8Array(blockSize + h0.length);
  b2.set(okp, 0);
  b2.set(h0, blockSize);
  return digest(b2);
}

export function hmacSha512(key: Uint8Array, message: Uint8Array) {
  return hmac(sha512, 128, key, message);
}

export function hmacSha256(key: Uint8Array, message: Uint8Array) {
  return hmac(sha256, 64, key, message);
}

/*
function expand(prfAlgo: string, prk: Uint8Array, length: number, info: Uint8Array) {
  let hashLength;
  if (prfAlgo == "sha512") {
    hashLength = 64;
  } else if (prfAlgo == "sha256") {
    hashLength = 32;
  } else {
    throw Error("unsupported hash");
  }
  info = info || Buffer.alloc(0);
  var N = Math.ceil(length / hashLength);
  var memo: Buffer[] = [];

  for (var i = 0; i < N; i++) {
    memo[i] = createHmac(prfAlgo, prk)
      .update(memo[i - 1] || Buffer.alloc(0))
      .update(info)
      .update(Buffer.alloc(1, i + 1))
      .digest();
  }
  return Buffer.concat(memo, length);
}
*/

export function kdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array) {
  // extract
  const prk = hmacSha512(salt, ikm);

  // expand

  var N = Math.ceil(length / 256);

  //return expand(prfAlgo, prk, length, info);
  return prk;
}
