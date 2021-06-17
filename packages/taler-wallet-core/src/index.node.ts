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

// Utils for using the wallet under node
export { NodeHttpLib } from "./headless/NodeHttpLib.js";
export {
  getDefaultNodeWallet,
  DefaultNodeWalletArgs,
} from "./headless/helpers.js";

import { setPRNG } from './crypto/primitives/nacl-fast.js';
import cr from 'crypto';

function cleanup(arr: Uint8Array): void {
  for (let i = 0; i < arr.length; i++) arr[i] = 0;
}

// Initialize PRNG if environment provides CSPRNG.
// If not, methods calling randombytes will throw.
if (cr && cr.randomBytes) {
  setPRNG(function (x: Uint8Array, n: number) {
    const v = cr.randomBytes(n);
    for (let i = 0; i < n; i++) x[i] = v[i];
    cleanup(v);
  });
}

export * from "./crypto/workers/nodeThreadWorker.js";
