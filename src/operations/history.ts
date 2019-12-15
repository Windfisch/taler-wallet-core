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
import { InternalWalletState } from "./state";
import { Stores, TipRecord } from "../types/dbTypes";
import * as Amounts from "../util/amounts";
import { AmountJson } from "../util/amounts";
import { HistoryQuery, HistoryEvent, HistoryEventType } from "../types/history";

/**
 * Retrive the full event history for this wallet.
 */
export async function getHistory(
  ws: InternalWalletState,
  historyQuery?: HistoryQuery,
): Promise<{ history: HistoryEvent[] }> {
  const history: HistoryEvent[] = [];

  // FIXME: do pagination instead of generating the full history
  // We uniquely identify history rows via their timestamp.
  // This works as timestamps are guaranteed to be monotonically
  // increasing even

  await ws.db.runWithReadTransaction(
    [
      Stores.currencies,
      Stores.coins,
      Stores.denominations,
      Stores.exchanges,
      Stores.proposals,
      Stores.purchases,
      Stores.refreshGroups,
      Stores.reserves,
      Stores.tips,
      Stores.withdrawalSession,
    ],
    async tx => {
      // FIXME: implement new history schema!!
    }
  );

  history.sort((h1, h2) => Math.sign(h1.timestamp.t_ms - h2.timestamp.t_ms));

  return { history };
}
