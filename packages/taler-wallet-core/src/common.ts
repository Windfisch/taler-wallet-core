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
 * Imports.
 */
import {
  WalletNotification,
  BalancesResponse,
  Logger,
} from "@gnu-taler/taler-util";
import { CryptoApi, CryptoWorkerFactory } from "./crypto/workers/cryptoApi.js";
import { ExchangeDetailsRecord, ExchangeRecord, WalletStoresV1 } from "./db.js";
import {
  getExchangeDetails,
  getExchangeTrust,
  updateExchangeFromUrl,
} from "./operations/exchanges.js";
import { PendingOperationsResponse } from "./pending-types.js";
import { AsyncOpMemoMap, AsyncOpMemoSingle } from "./util/asyncMemo.js";
import { HttpRequestLibrary } from "./util/http.js";
import {
  AsyncCondition,
  OpenedPromise,
  openPromise,
} from "./util/promiseUtils.js";
import { DbAccess, GetReadOnlyAccess } from "./util/query.js";
import { TimerGroup } from "./util/timer.js";

const logger = new Logger("state.ts");

export const EXCHANGE_COINS_LOCK = "exchange-coins-lock";
export const EXCHANGE_RESERVES_LOCK = "exchange-reserves-lock";

export interface TrustInfo {
  isTrusted: boolean;
  isAudited: boolean;
}

/**
 * Interface for exchange-related operations.
 */
export interface ExchangeOperations {
  // FIXME:  Should other operations maybe always use
  // updateExchangeFromUrl?
  getExchangeDetails(
    tx: GetReadOnlyAccess<{
      exchanges: typeof WalletStoresV1.exchanges;
      exchangeDetails: typeof WalletStoresV1.exchangeDetails;
    }>,
    exchangeBaseUrl: string,
  ): Promise<ExchangeDetailsRecord | undefined>;
  getExchangeTrust(
    ws: InternalWalletState,
    exchangeInfo: ExchangeRecord,
  ): Promise<TrustInfo>;
  updateExchangeFromUrl(
    ws: InternalWalletState,
    baseUrl: string,
    forceNow?: boolean,
  ): Promise<{
    exchange: ExchangeRecord;
    exchangeDetails: ExchangeDetailsRecord;
  }>;
}

export type NotificationListener = (n: WalletNotification) => void;

/**
 * Internal, shard wallet state that is used by the implementation
 * of wallet operations.
 * 
 * FIXME:  This should not be exported anywhere from the taler-wallet-core package,
 * as it's an opaque implementation detail.
 */
export interface InternalWalletState {
  memoProcessReserve: AsyncOpMemoMap<void>;
  memoMakePlanchet: AsyncOpMemoMap<void>;
  memoGetPending: AsyncOpMemoSingle<PendingOperationsResponse>;
  memoGetBalance: AsyncOpMemoSingle<BalancesResponse>;
  memoProcessRefresh: AsyncOpMemoMap<void>;
  memoProcessRecoup: AsyncOpMemoMap<void>;
  memoProcessDeposit: AsyncOpMemoMap<void>;
  cryptoApi: CryptoApi;

  timerGroup: TimerGroup;
  latch: AsyncCondition;
  stopped: boolean;
  memoRunRetryLoop: AsyncOpMemoSingle<void>;

  listeners: NotificationListener[];

  initCalled: boolean;

  exchangeOps: ExchangeOperations;

  db: DbAccess<typeof WalletStoresV1>;
  http: HttpRequestLibrary;

  notify(n: WalletNotification): void;

  addNotificationListener(f: (n: WalletNotification) => void): void;

  /**
   * Stop ongoing processing.
   */
  stop(): void;

  /**
   * Run an async function after acquiring a list of locks, identified
   * by string tokens.
   */
  runSequentialized<T>(tokens: string[], f: () => Promise<T>): Promise<T>;
}
