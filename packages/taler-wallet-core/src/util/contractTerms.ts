/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { canonicalJson } from "@gnu-taler/taler-util";
import { kdf } from "../crypto/primitives/kdf.js";
import {
  bytesToString,
  decodeCrock,
  encodeCrock,
  getRandomBytes,
  hash,
  stringToBytes,
} from "../crypto/talerCrypto.js";

export namespace ContractTermsUtil {
  export type PathPredicate = (path: string[]) => boolean;

  /**
   * Scrub all forgettable members from an object.
   */
  export function scrub(anyJson: any): any {
    return forgetAllImpl(anyJson, [], () => true);
  }

  /**
   * Recursively forget all forgettable members of an object,
   * where the path matches a predicate.
   */
  export function forgetAll(anyJson: any, pred: PathPredicate): any {
    return forgetAllImpl(anyJson, [], pred);
  }

  function forgetAllImpl(
    anyJson: any,
    path: string[],
    pred: PathPredicate,
  ): any {
    const dup = JSON.parse(JSON.stringify(anyJson));
    if (Array.isArray(dup)) {
      for (let i = 0; i < dup.length; i++) {
        dup[i] = forgetAllImpl(dup[i], [...path, `${i}`], pred);
      }
    } else if (typeof dup === "object") {
      const fge = dup.$forgettable;
      const fgo = dup.$forgettable;
      if (typeof fge === "object") {
        for (const x of Object.keys(fge)) {
          if (!pred([...path, x])) {
            continue;
          }
          delete dup[x];
          if (!fgo[x]) {
            const membValCanon = stringToBytes(
              canonicalJson(scrub(dup[x])) + "\0",
            );
            const membSalt = decodeCrock(fge[x]);
            const h = kdf(64, membValCanon, membSalt, new Uint8Array([]));
            fgo[x] = encodeCrock(h);
          }
        }
      }
      for (const x of Object.keys(dup)) {
        if (x.startsWith("$")) {
          continue;
        }
        dup[x] = forgetAllImpl(dup[x], [...path, x], pred);
      }
    }
    return dup;
  }

  /**
   * Generate a salt for all members marked as forgettable,
   * but which don't have an actual salt yet.
   */
  export function saltForgettable(anyJson: any): any {
    const dup = JSON.parse(JSON.stringify(anyJson));
    if (Array.isArray(dup)) {
      for (let i = 0; i < dup.length; i++) {
        dup[i] = saltForgettable(dup[i]);
      }
    } else if (typeof dup === "object") {
      if (typeof dup.$forgettable === "object") {
        for (const k of Object.keys(dup.$forgettable)) {
          if (dup.$forgettable[k] === true) {
            dup.$forgettable[k] = encodeCrock(getRandomBytes(32));
          }
        }
      }
      for (const x of Object.keys(dup)) {
        if (x.startsWith("$")) {
          continue;
        }
        dup[x] = saltForgettable(dup[x]);
      }
    }
    return dup;
  }

  /**
   * Hash a contract terms object.  Forgettable fields
   * are scrubbed and JSON canonicalization is applied
   * before hashing.
   */
  export function hashContractTerms(contractTerms: unknown): string {
    const cleaned = scrub(contractTerms);
    const canon = canonicalJson(cleaned) + "\0";
    return encodeCrock(hash(stringToBytes(canon)));
  }
}
