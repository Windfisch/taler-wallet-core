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
import { CryptoApi, CryptoWorkerFactory } from "../crypto/workers/cryptoApi.js";
import { WalletStoresV1 } from "../db.js";
import { PendingOperationsResponse } from "../pending-types.js";
import { AsyncOpMemoMap, AsyncOpMemoSingle } from "../util/asyncMemo.js";
import { HttpRequestLibrary } from "../util/http";
import {
  AsyncCondition,
  OpenedPromise,
  openPromise,
} from "../util/promiseUtils.js";
import { DbAccess } from "../util/query.js";
import { TimerGroup } from "../util/timer.js";

type NotificationListener = (n: WalletNotification) => void;

const logger = new Logger("state.ts");

export const EXCHANGE_COINS_LOCK = "exchange-coins-lock";
export const EXCHANGE_RESERVES_LOCK = "exchange-reserves-lock";

/**
 * Internal state of the wallet.
 */
export class InternalWalletState {
  memoProcessReserve: AsyncOpMemoMap<void> = new AsyncOpMemoMap();
  memoMakePlanchet: AsyncOpMemoMap<void> = new AsyncOpMemoMap();
  memoGetPending: AsyncOpMemoSingle<PendingOperationsResponse> = new AsyncOpMemoSingle();
  memoGetBalance: AsyncOpMemoSingle<BalancesResponse> = new AsyncOpMemoSingle();
  memoProcessRefresh: AsyncOpMemoMap<void> = new AsyncOpMemoMap();
  memoProcessRecoup: AsyncOpMemoMap<void> = new AsyncOpMemoMap();
  memoProcessDeposit: AsyncOpMemoMap<void> = new AsyncOpMemoMap();
  cryptoApi: CryptoApi;

  timerGroup: TimerGroup = new TimerGroup();
  latch = new AsyncCondition();
  stopped = false;
  memoRunRetryLoop = new AsyncOpMemoSingle<void>();

  listeners: NotificationListener[] = [];

  initCalled: boolean = false;

  /**
   * Promises that are waiting for a particular resource.
   */
  private resourceWaiters: Record<string, OpenedPromise<void>[]> = {};

  /**
   * Resources that are currently locked.
   */
  private resourceLocks: Set<string> = new Set();

  constructor(
    // FIXME: Make this a getter and make
    // the actual value nullable.
    // Check if we are in a DB migration / garbage collection
    // and throw an error in that case.
    public db: DbAccess<typeof WalletStoresV1>,
    public http: HttpRequestLibrary,
    cryptoWorkerFactory: CryptoWorkerFactory,
  ) {
    this.cryptoApi = new CryptoApi(cryptoWorkerFactory);
  }

  notify(n: WalletNotification): void {
    logger.trace("Notification", n);
    for (const l of this.listeners) {
      const nc = JSON.parse(JSON.stringify(n));
      setTimeout(() => {
        l(nc);
      }, 0);
    }
  }

  addNotificationListener(f: (n: WalletNotification) => void): void {
    this.listeners.push(f);
  }

  /**
   * Stop ongoing processing.
   */
  stop(): void {
    this.stopped = true;
    this.timerGroup.stopCurrentAndFutureTimers();
    this.cryptoApi.stop();
  }

  /**
   * Run an async function after acquiring a list of locks, identified
   * by string tokens.
   */
  async runSequentialized<T>(tokens: string[], f: () => Promise<T>) {
    // Make sure locks are always acquired in the same order
    tokens = [...tokens].sort();

    for (const token of tokens) {
      if (this.resourceLocks.has(token)) {
        const p = openPromise<void>();
        let waitList = this.resourceWaiters[token];
        if (!waitList) {
          waitList = this.resourceWaiters[token] = [];
        }
        waitList.push(p);
        await p.promise;
      }
      this.resourceLocks.add(token);
    }

    try {
      logger.trace(`begin exclusive execution on ${JSON.stringify(tokens)}`);
      const result = await f();
      logger.trace(`end exclusive execution on ${JSON.stringify(tokens)}`);
      return result;
    } finally {
      for (const token of tokens) {
        this.resourceLocks.delete(token);
        let waiter = (this.resourceWaiters[token] ?? []).shift();
        if (waiter) {
          waiter.resolve();
        }
      }
    }
  }
}
