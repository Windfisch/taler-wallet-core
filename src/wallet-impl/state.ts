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
import { Badge, Notifier, NextUrlResult } from "../walletTypes";
import { SpeculativePayData } from "./pay";
import { CryptoApi } from "../crypto/cryptoApi";
import { AsyncOpMemo } from "../util/asyncMemo";

export interface InternalWalletState {
  db: IDBDatabase;
  http: HttpRequestLibrary;
  badge: Badge;
  notifier: Notifier;
  cryptoApi: CryptoApi;
  speculativePayData: SpeculativePayData | undefined;
  cachedNextUrl: { [fulfillmentUrl: string]: NextUrlResult };
  memoProcessReserve: AsyncOpMemo<void>;
  memoMakePlanchet: AsyncOpMemo<void>;
}