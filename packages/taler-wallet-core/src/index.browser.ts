/*
 This file is part of TALER
 (C) 2019 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

export * from "./index.js";

import { setPRNG } from './crypto/primitives/nacl-fast.js';
// export default API;

function cleanup(arr: Uint8Array): void {
  for (let i = 0; i < arr.length; i++) arr[i] = 0;
}

// Initialize PRNG if environment provides CSPRNG.
// If not, methods calling randombytes will throw.
// @ts-ignore-error
const cr = typeof self !== "undefined" ? self.crypto || self.msCrypto : null;

const QUOTA = 65536;
setPRNG(function (x: Uint8Array, n: number) {
  let i;
  const v = new Uint8Array(n);
  for (i = 0; i < n; i += QUOTA) {
    cr.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
  }
  for (i = 0; i < n; i++) x[i] = v[i];
  cleanup(v);
});
// function initPRNG() {
//   // Initialize PRNG if environment provides CSPRNG.
//   // If not, methods calling randombytes will throw.
//   // @ts-ignore-error
//   const cr = typeof self !== "undefined" ? self.crypto || self.msCrypto : null;
//   if (cr && cr.getRandomValues) {
//     // Browsers.
//     const QUOTA = 65536;
//     setPRNG(function (x: Uint8Array, n: number) {
//       let i;
//       const v = new Uint8Array(n);
//       for (i = 0; i < n; i += QUOTA) {
//         cr.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
//       }
//       for (i = 0; i < n; i++) x[i] = v[i];
//       cleanup(v);
//     });
//   } else if (typeof require !== "undefined") {
//     // Node.js.
//     // eslint-disable-next-line @typescript-eslint/no-var-requires
//     const cr = require("crypto");
//     if (cr && cr.randomBytes) {
//       setPRNG(function (x: Uint8Array, n: number) {
//         const v = cr.randomBytes(n);
//         for (let i = 0; i < n; i++) x[i] = v[i];
//         cleanup(v);
//       });
//     }
//   }
// }

// initPRNG();