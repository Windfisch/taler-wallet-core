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

import { AmountJson } from "."
import { Amounts, } from "./amounts"
import { getRandomBytes, decodeCrock, encodeCrock } from "./talerCrypto"
import { encode as segwitEncode } from "bech32-buffer"
/**
 *
 * @author sebasjm
 */

export interface SegwitAddrs {
  segwitAddr1: string,
  segwitAddr2: string,
}

function buf2hex(buffer: Uint8Array) { // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSegwitAddress(reservePub: string): SegwitAddrs {
  const pub = decodeCrock(reservePub)

  const first_rnd = getRandomBytes(4)
  const second_rnd = new Uint8Array(first_rnd.length)
  second_rnd.set(first_rnd)

  first_rnd[0] = first_rnd[0] & 0b0111_1111
  second_rnd[0] = second_rnd[0] | 0b1000_0000

  const first_part = new Uint8Array(first_rnd.length + pub.length / 2)
  first_part.set(first_rnd, 0)
  first_part.set(pub.subarray(0, 16), 4)
  const second_part = new Uint8Array(first_rnd.length + pub.length / 2)
  second_part.set(first_rnd, 0)
  second_part.set(pub.subarray(16, 32), 4)

  return {
    segwitAddr1: segwitEncode("bc", first_part),
    segwitAddr2: segwitEncode("bc", second_part),
  }
}

// https://github.com/bitcoin/bitcoin/blob/master/src/policy/policy.cpp
export function segwitMinAmount(): AmountJson {
  return Amounts.parseOrThrow("BTC:0.00000294")
}