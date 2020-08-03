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
export {
  getDefaultNodeWallet,
  DefaultNodeWalletArgs,
} from "./headless/helpers";
export { Amounts, AmountJson } from "./util/amounts";
export { Logger } from "./util/logging";

export * as talerCrypto from "./crypto/talerCrypto";
export {
  OperationFailedAndReportedError,
  OperationFailedError,
  makeErrorDetails,
} from "./operations/errors";

export * as walletTypes from "./types/walletTypes";

export * as talerTypes from "./types/talerTypes";

export * as walletCoreApi from "./walletCoreApiHandler";

export * as taleruri from "./util/taleruri";

export * as time from "./util/time";

export * as codec from "./util/codec";

export { NodeHttpLib } from "./headless/NodeHttpLib";

export * as payto from "./util/payto";

export * as testvectors from "./util/testvectors";

export * as versions from "./operations/versions";

export type { CryptoWorker } from "./crypto/workers/cryptoWorker";
export type { CryptoWorkerFactory } from "./crypto/workers/cryptoApi";

export * as httpLib from "./util/http";

export { TalerErrorCode } from "./TalerErrorCode";

export * as queryLib from "./util/query";

export { CryptoImplementation } from "./crypto/workers/cryptoImplementation";

export * as db from "./db";

export * as promiseUtil from "./util/promiseUtils";

export * as i18n from "./i18n";

export * as nodeThreadWorker from "./crypto/workers/nodeThreadWorker";

export * as walletNotifications from "./types/notifications";
