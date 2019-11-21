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

let isNode;

let myGetRandom: (n: number) => ArrayBuffer;

if (require) {
  // node.js
  const cr = require("crypto");
  myGetRandom = (n: number) => {
    const buf = cr.randomBytes(n);
    return Uint8Array.from(buf);
  }
} else {
  // Browser
  myGetRandom = (n: number) => {
    const ret = new Uint8Array(n);
    window.crypto.getRandomValues(ret);
    return ret;
  }
}

export function getRandomBytes(n: number): ArrayBuffer {
  return myGetRandom(n);
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

export function decodeCrock(encoded: string): ArrayBuffer {
  const size = encoded.length;
  let bitpos = 0;
  let bitbuf = 0;
  let readPosition = 0;
  const outLen = Math.floor((size * 5) / 8);
  const out = new Int8Array(outLen);
  let outPos = 0;

  while (readPosition < size || bitpos > 0) {
    //println("at position $readPosition with bitpos $bitpos")
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
