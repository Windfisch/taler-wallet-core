/*
 This file is part of GNU Taler
 (C) 2019 Taler Systems S.A.

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
 *
 * @author sebasjm
 */

/**
 * Imports.
 */
import { AmountJson, Amounts } from "./amounts.js";
import { decodeCrock } from "./talerCrypto.js";
import * as segwit from "./segwit_addr.js";


function buf2hex(buffer: Uint8Array) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

const hext2buf = (hexString: string) =>
  new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));


export function generateFakeSegwitAddress(
  reservePub: string | undefined,
  addr: string
): string[] {
  if (!reservePub) return []
  let pub;
  try {
    pub = decodeCrock(reservePub);
  } catch {
    // pub = new Uint8Array(0)
  }
  if (!pub || pub.length !== 32) return []

  const first_rnd = new Uint8Array(4);
  first_rnd.set(pub.subarray(0, 4))
  const second_rnd = new Uint8Array(4);
  second_rnd.set(pub.subarray(0, 4));

  first_rnd[0] = first_rnd[0] & 0b0111_1111;
  second_rnd[0] = second_rnd[0] | 0b1000_0000;

  const first_part = new Uint8Array(first_rnd.length + pub.length / 2);
  first_part.set(first_rnd, 0);
  first_part.set(pub.subarray(0, 16), 4);

  const second_part = new Uint8Array(first_rnd.length + pub.length / 2);
  second_part.set(second_rnd, 0);
  second_part.set(pub.subarray(16, 32), 4);

  const prefix =
    addr[0] === "t" && addr[1] == "b"
      ? "tb"
      : addr[0] === "b" && addr[1] == "c" && addr[2] === "r" && addr[3] == "t"
        ? "bcrt"
        : addr[0] === "b" && addr[1] == "c"
          ? "bc"
          : undefined;
  if (prefix === undefined) throw new Error("unknown bitcoin net");

  const addr1 = segwit.default.encode(prefix, 0, first_part);
  const addr2 = segwit.default.encode(prefix, 0, second_part);

  return [addr1, addr2]
}

// https://github.com/bitcoin/bitcoin/blob/master/src/policy/policy.cpp
export function segwitMinAmount(currency: string): AmountJson {
  return Amounts.parseOrThrow(`${currency}:0.00000294`);
}
