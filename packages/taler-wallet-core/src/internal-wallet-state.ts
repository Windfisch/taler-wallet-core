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
 * Common interface of the internal wallet state.  This object is passed
 * to the various operations (exchange management, withdrawal, refresh, reserve
 * management, etc.).
 *
 * Some operations can be accessed via this state object.  This allows mutual
 * recursion between operations, without having cyclic dependencies between
 * the respective TypeScript files.
 *
 * (You can think of this as a "header file" for the wallet implementation.)
 */

/**
 * Imports.
 */
import {
  WalletNotification,
  BalancesResponse,
  AmountJson,
  DenominationPubKey,
  TalerProtocolTimestamp,
  CancellationToken,
  DenominationInfo,
} from "@gnu-taler/taler-util";
import { CryptoDispatcher } from "./crypto/workers/cryptoDispatcher.js";
import { TalerCryptoInterface } from "./crypto/cryptoImplementation.js";
import { ExchangeDetailsRecord, ExchangeRecord, WalletStoresV1 } from "./db.js";
import { PendingOperationsResponse } from "./pending-types.js";
import { AsyncOpMemoMap, AsyncOpMemoSingle } from "./util/asyncMemo.js";
import { HttpRequestLibrary } from "./util/http.js";
import { AsyncCondition } from "./util/promiseUtils.js";
import {
  DbAccess,
  GetReadOnlyAccess,
  GetReadWriteAccess,
} from "./util/query.js";
import { TimerGroup } from "./util/timer.js";

export const EXCHANGE_COINS_LOCK = "exchange-coins-lock";
export const EXCHANGE_RESERVES_LOCK = "exchange-reserves-lock";

export interface TrustInfo {
  isTrusted: boolean;
  isAudited: boolean;
}

export interface MerchantInfo {
  protocolVersionCurrent: number;
}

/**
 * Interface for merchant-related operations.
 */
export interface MerchantOperations {
  getMerchantInfo(
    ws: InternalWalletState,
    merchantBaseUrl: string,
  ): Promise<MerchantInfo>;
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
    options?: {
      forceNow?: boolean;
      cancellationToken?: CancellationToken;
    },
  ): Promise<{
    exchange: ExchangeRecord;
    exchangeDetails: ExchangeDetailsRecord;
  }>;
}

export interface RecoupOperations {
  createRecoupGroup(
    ws: InternalWalletState,
    tx: GetReadWriteAccess<{
      recoupGroups: typeof WalletStoresV1.recoupGroups;
      denominations: typeof WalletStoresV1.denominations;
      refreshGroups: typeof WalletStoresV1.refreshGroups;
      coins: typeof WalletStoresV1.coins;
    }>,
    exchangeBaseUrl: string,
    coinPubs: string[],
  ): Promise<string>;
  processRecoupGroup(
    ws: InternalWalletState,
    recoupGroupId: string,
    options?: {
      forceNow?: boolean;
    },
  ): Promise<void>;
}

export type NotificationListener = (n: WalletNotification) => void;

export interface ActiveLongpollInfo {
  [opId: string]: {
    cancel: () => void;
  };
}

/**
 * Internal, shard wallet state that is used by the implementation
 * of wallet operations.
 *
 * FIXME:  This should not be exported anywhere from the taler-wallet-core package,
 * as it's an opaque implementation detail.
 */
export interface InternalWalletState {
  /**
   * Active longpoll operations.
   */
  activeLongpoll: ActiveLongpollInfo;

  cryptoApi: TalerCryptoInterface;

  timerGroup: TimerGroup;
  stopped: boolean;

  insecureTrustExchange: boolean;

  batchWithdrawal: boolean;

  /**
   * Asynchronous condition to interrupt the sleep of the
   * retry loop.
   *
   * Used to allow processing of new work faster.
   */
  latch: AsyncCondition;

  listeners: NotificationListener[];

  initCalled: boolean;

  merchantInfoCache: Record<string, MerchantInfo>;

  exchangeOps: ExchangeOperations;
  recoupOps: RecoupOperations;
  merchantOps: MerchantOperations;

  getDenomInfo(
    ws: InternalWalletState,
    tx: GetReadOnlyAccess<{
      denominations: typeof WalletStoresV1.denominations;
    }>,
    exchangeBaseUrl: string,
    denomPubHash: string,
  ): Promise<DenominationInfo | undefined>;

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

  runUntilDone(req?: { maxRetries?: number }): Promise<void>;
}
