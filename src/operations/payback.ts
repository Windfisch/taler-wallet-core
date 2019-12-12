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
  Database
} from "../util/query";
import { InternalWalletState } from "./state";
import { Stores, TipRecord, CoinStatus } from "../types/dbTypes";

import { Logger } from "../util/logging";
import { PaybackConfirmation } from "../types/talerTypes";
import { updateExchangeFromUrl } from "./exchanges";
import { NotificationType } from "../types/notifications";

const logger = new Logger("payback.ts");

export async function payback(
  ws: InternalWalletState,
  coinPub: string,
): Promise<void> {
  let coin = await ws.db.get(Stores.coins, coinPub);
  if (!coin) {
    throw Error(`Coin ${coinPub} not found, can't request payback`);
  }
  const reservePub = coin.reservePub;
  if (!reservePub) {
    throw Error(`Can't request payback for a refreshed coin`);
  }
  const reserve = await ws.db.get(Stores.reserves, reservePub);
  if (!reserve) {
    throw Error(`Reserve of coin ${coinPub} not found`);
  }
  switch (coin.status) {
    case CoinStatus.Dormant:
      throw Error(`Can't do payback for coin ${coinPub} since it's dormant`);
  }
  coin.status = CoinStatus.Dormant;
  // Even if we didn't get the payback yet, we suspend withdrawal, since
  // technically we might update reserve status before we get the response
  // from the reserve for the payback request.
  reserve.hasPayback = true;
  await ws.db.runWithWriteTransaction(
    [Stores.coins, Stores.reserves],
    async tx => {
      await tx.put(Stores.coins, coin!!);
      await tx.put(Stores.reserves, reserve);
    },
  );
  ws.notify({
    type: NotificationType.PaybackStarted,
  });

  const paybackRequest = await ws.cryptoApi.createPaybackRequest(coin);
  const reqUrl = new URL("payback", coin.exchangeBaseUrl);
  const resp = await ws.http.postJson(reqUrl.href, paybackRequest);
  if (resp.status !== 200) {
    throw Error();
  }
  const paybackConfirmation = PaybackConfirmation.checked(await resp.json());
  if (paybackConfirmation.reserve_pub !== coin.reservePub) {
    throw Error(`Coin's reserve doesn't match reserve on payback`);
  }
  coin = await ws.db.get(Stores.coins, coinPub);
  if (!coin) {
    throw Error(`Coin ${coinPub} not found, can't confirm payback`);
  }
  coin.status = CoinStatus.Dormant;
  await ws.db.put(Stores.coins, coin);
  ws.notify({
    type: NotificationType.PaybackFinished,
  });
  await updateExchangeFromUrl(ws, coin.exchangeBaseUrl, true);
}
