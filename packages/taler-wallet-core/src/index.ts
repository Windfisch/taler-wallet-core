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

export { Wallet } from "./wallet";

// Errors
export { TalerErrorCode } from "./TalerErrorCode";
export * from "./operations/errors";

// Utils for using the wallet under node
export { NodeHttpLib } from "./headless/NodeHttpLib";
export {
  getDefaultNodeWallet,
  DefaultNodeWalletArgs,
} from "./headless/helpers";

export * from "./operations/versions";

export * from "./db";
export * from "./types/dbTypes";

// Internationalization
export * from "./i18n";

// Crypto and crypto workers
export * from "./crypto/workers/nodeThreadWorker";
export { CryptoImplementation } from "./crypto/workers/cryptoImplementation";
export type { CryptoWorker } from "./crypto/workers/cryptoWorker";
export { CryptoWorkerFactory, CryptoApi } from "./crypto/workers/cryptoApi";
export * from "./crypto/talerCrypto";

// Util functionality
export { Amounts, AmountJson } from "./util/amounts";
export { Logger } from "./util/logging";
export { Configuration } from "./util/talerconfig";
export { URL } from "./util/url";
export * from "./util/codec";
export * from "./util/promiseUtils";
export * from "./util/query";
export * from "./util/http";
export * from "./util/payto";
export * from "./util/testvectors";
export * from "./util/taleruri";
export * from "./util/time";

// Types
export * from "./types/talerTypes";
export * from "./types/walletTypes";
export * from "./types/notifications";
export * from "./types/transactionsTypes";
export * from "./types/pendingTypes";
