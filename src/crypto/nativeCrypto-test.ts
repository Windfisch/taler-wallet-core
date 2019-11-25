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
 * Imports
 */
import test from "ava";
import { encodeCrock, decodeCrock } from "./nativeCrypto";
import { hmacSha512, sha512 } from "./kdf";
import nacl = require("./nacl-fast");

function hexToBytes(hex: string) {
  for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  for (var hex = [], i = 0; i < bytes.length; i++) {
    var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    hex.push((current >>> 4).toString(16));
    hex.push((current & 0xf).toString(16));
  }
  return hex.join("");
}

test("encoding", t => {
  const utf8decoder = new TextDecoder("utf-8");
  const utf8encoder = new TextEncoder();
  const s = "Hello, World";
  const encStr = encodeCrock(utf8encoder.encode(s));
  const outBuf = decodeCrock(encStr);
  const sOut = utf8decoder.decode(outBuf);
  t.deepEqual(s, sOut);
});

test("taler-exchange-tvg hash code", t => {
  const input = "91JPRV3F5GG4EKJN41A62V35E8";
  const output =
    "CW96WR74JS8T53EC8GKSGD49QKH4ZNFTZXDAWMMV5GJ1E4BM6B8GPN5NVHDJ8ZVXNCW7Q4WBYCV61HCA3PZC2YJD850DT29RHHN7ESR";

  const myOutput = encodeCrock(sha512(decodeCrock(input)));

  t.deepEqual(myOutput, output);
});

test("taler-exchange-tvg ecdhe key", t => {
  const priv1 = "YSYA38XH1PH40ZPSEZCXEFX9PH9Q3A2PE19FHM54DMTZ4MAPH9S0";
  const pub1 = "GNQRNSYF4BT4V0EV0DBXZCHFVQ79ATP0KBJ9EAY18FGSY513A5VG";

  const myPub = nacl.x25519_edwards_keyPair_fromSecretKey(decodeCrock(priv1))
  t.deepEqual(encodeCrock(myPub), pub1);

  //const myPub1 = nacl.scalarMult.base(decodeCrock(priv1));
  //t.deepEqual(encodeCrock(myPub1), pub1);

  //const p = nacl.box.keyPair.fromSecretKey(decodeCrock(priv1))
  //t.deepEqual(encodeCrock(p.publicKey), pub1);

  //const r = nacl.scalarMult(decodeCrock(priv2), decodeCrock(pub1));
  //t.deepEqual(encodeCrock(nacl.hash(r)), skm);

  //const mySkm = nacl.
});

test("taler-exchange-tvg eddsa key", t => {
  const priv = "H2JGQ2T3A5WBC5QV3YRFE31AMRGF2F9WPXZ03EM3NS3PYHM80WA0";
  const pub = "QFGMB2WTPYXMXZRPFYFEM2VMQ028M71JMECF31P3J8VC3SCJ777G";
  
  const pair = nacl.sign_keyPair_fromSeed(decodeCrock(priv));
  t.deepEqual(encodeCrock(pair.publicKey), pub);
});
