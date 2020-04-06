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

import { HttpRequestLibrary } from "../util/http";
import { NextUrlResult, WalletBalance } from "../types/walletTypes";
import { CryptoApi, CryptoWorkerFactory } from "../crypto/workers/cryptoApi";
import { AsyncOpMemoMap, AsyncOpMemoSingle } from "../util/asyncMemo";
import { Logger } from "../util/logging";
import { PendingOperationsResponse } from "../types/pending";
import { WalletNotification } from "../types/notifications";
import { Database } from "../util/query";

type NotificationListener = (n: WalletNotification) => void;

const logger = new Logger("state.ts");

export class InternalWalletState {
  cachedNextUrl: { [fulfillmentUrl: string]: NextUrlResult } = {};
  memoProcessReserve: AsyncOpMemoMap<void> = new AsyncOpMemoMap();
  memoMakePlanchet: AsyncOpMemoMap<void> = new AsyncOpMemoMap();
  memoGetPending: AsyncOpMemoSingle<
    PendingOperationsResponse
  > = new AsyncOpMemoSingle();
  memoGetBalance: AsyncOpMemoSingle<WalletBalance> = new AsyncOpMemoSingle();
  memoProcessRefresh: AsyncOpMemoMap<void> = new AsyncOpMemoMap();
  memoProcessRecoup: AsyncOpMemoMap<void> = new AsyncOpMemoMap();
  cryptoApi: CryptoApi;

  listeners: NotificationListener[] = [];

  constructor(
    public db: Database,
    public http: HttpRequestLibrary,
    cryptoWorkerFactory: CryptoWorkerFactory,
  ) {
    this.cryptoApi = new CryptoApi(cryptoWorkerFactory);
  }

  public notify(n: WalletNotification) {
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
}
