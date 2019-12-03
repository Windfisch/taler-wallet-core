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
import { WalletBalance, WalletBalanceEntry } from "../walletTypes";
import { runWithReadTransaction } from "../util/query";
import { InternalWalletState } from "./state";
import { Stores, TipRecord, CoinStatus } from "../dbTypes";
import * as Amounts from "../util/amounts";
import { AmountJson } from "../util/amounts";
import { Logger } from "../util/logging";

const logger = new Logger("withdraw.ts");

/**
 * Get detailed balance information, sliced by exchange and by currency.
 */
export async function getBalances(
  ws: InternalWalletState,
): Promise<WalletBalance> {
  /**
   * Add amount to a balance field, both for
   * the slicing by exchange and currency.
   */
  function addTo(
    balance: WalletBalance,
    field: keyof WalletBalanceEntry,
    amount: AmountJson,
    exchange: string,
  ): void {
    const z = Amounts.getZero(amount.currency);
    const balanceIdentity = {
      available: z,
      paybackAmount: z,
      pendingIncoming: z,
      pendingPayment: z,
      pendingIncomingDirty: z,
      pendingIncomingRefresh: z,
      pendingIncomingWithdraw: z,
    };
    let entryCurr = balance.byCurrency[amount.currency];
    if (!entryCurr) {
      balance.byCurrency[amount.currency] = entryCurr = {
        ...balanceIdentity,
      };
    }
    let entryEx = balance.byExchange[exchange];
    if (!entryEx) {
      balance.byExchange[exchange] = entryEx = { ...balanceIdentity };
    }
    entryCurr[field] = Amounts.add(entryCurr[field], amount).amount;
    entryEx[field] = Amounts.add(entryEx[field], amount).amount;
  }

  const balanceStore = {
    byCurrency: {},
    byExchange: {},
  };

  await runWithReadTransaction(
    ws.db,
    [Stores.coins, Stores.refresh, Stores.reserves, Stores.purchases, Stores.withdrawalSession],
    async tx => {
      await tx.iter(Stores.coins).forEach(c => {
        if (c.suspended) {
          return;
        }
        if (c.status === CoinStatus.Fresh) {
          addTo(balanceStore, "available", c.currentAmount, c.exchangeBaseUrl);
        }
        if (c.status === CoinStatus.Dirty) {
          addTo(
            balanceStore,
            "pendingIncoming",
            c.currentAmount,
            c.exchangeBaseUrl,
          );
          addTo(
            balanceStore,
            "pendingIncomingDirty",
            c.currentAmount,
            c.exchangeBaseUrl,
          );
        }
      });
      await tx.iter(Stores.refresh).forEach(r => {
        // Don't count finished refreshes, since the refresh already resulted
        // in coins being added to the wallet.
        if (r.finished) {
          return;
        }
        addTo(
          balanceStore,
          "pendingIncoming",
          r.valueOutput,
          r.exchangeBaseUrl,
        );
        addTo(
          balanceStore,
          "pendingIncomingRefresh",
          r.valueOutput,
          r.exchangeBaseUrl,
        );
      });

      await tx.iter(Stores.withdrawalSession).forEach(wds => {
        let w = wds.totalCoinValue;
        for (let i = 0; i < wds.planchets.length; i++) {
          if (wds.withdrawn[i]) {
            const p = wds.planchets[i];
            if (p) {
              w = Amounts.sub(w, p.coinValue).amount;
            }
          }
        }
        addTo(
          balanceStore,
          "pendingIncoming",
          w,
          wds.exchangeBaseUrl,
        );
      });

      await tx.iter(Stores.purchases).forEach(t => {
        if (t.finished) {
          return;
        }
        for (const c of t.payReq.coins) {
          addTo(
            balanceStore,
            "pendingPayment",
            Amounts.parseOrThrow(c.contribution),
            c.exchange_url,
          );
        }
      });
    },
  );

  logger.trace("computed balances:", balanceStore);
  return balanceStore;
}
