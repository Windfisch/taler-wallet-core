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

/**
 * Module entry point for the wallet when used as a node module.
 */

// Errors
export * from "./operations/errors.js";

// Util functionality
export { URL } from "./util/url.js";
export * from "./util/promiseUtils.js";
export * from "./util/query.js";
export * from "./util/http.js";

// Utils for using the wallet under node
export { NodeHttpLib } from "./headless/NodeHttpLib.js";
export {
  getDefaultNodeWallet,
  DefaultNodeWalletArgs,
} from "./headless/helpers.js";

export * from "./operations/versions.js";

export * from "./db.js";

// Crypto and crypto workers
export * from "./crypto/workers/nodeThreadWorker.js";
export { CryptoImplementation } from "./crypto/workers/cryptoImplementation.js";
export type { CryptoWorker } from "./crypto/workers/cryptoWorker.js";
export { CryptoWorkerFactory, CryptoApi } from "./crypto/workers/cryptoApi.js";
export * from "./crypto/talerCrypto.js";

export * from "./pending-types.js";

export * from "./util/debugFlags.js";

export * from "./wallet.js";
