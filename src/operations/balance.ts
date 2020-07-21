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
import { WalletBalance, WalletBalanceEntry } from "../types/walletTypes";
import { TransactionHandle } from "../util/query";
import { InternalWalletState } from "./state";
import { Stores, CoinStatus } from "../types/dbTypes";
import * as Amounts from "../util/amounts";
import { AmountJson } from "../util/amounts";
import { Logger } from "../util/logging";

const logger = new Logger("withdraw.ts");

/**
 * Get balance information.
 */
export async function getBalancesInsideTransaction(
  ws: InternalWalletState,
  tx: TransactionHandle,
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

  await tx.iter(Stores.reserves).forEach((r) => {
    const z = Amounts.getZero(r.currency);
    addTo(balanceStore, "available", z, r.exchangeBaseUrl);
  });

  await tx.iter(Stores.coins).forEach((c) => {
    if (c.suspended) {
      return;
    }
    if (c.status === CoinStatus.Fresh) {
      addTo(balanceStore, "available", c.currentAmount, c.exchangeBaseUrl);
    }
  });

  await tx.iter(Stores.refreshGroups).forEach((r) => {
    // Don't count finished refreshes, since the refresh already resulted
    // in coins being added to the wallet.
    if (r.timestampFinished) {
      return;
    }
    for (let i = 0; i < r.oldCoinPubs.length; i++) {
      const session = r.refreshSessionPerCoin[i];
      if (session) {
        addTo(
          balanceStore,
          "pendingIncoming",
          session.amountRefreshOutput,
          session.exchangeBaseUrl,
        );
        addTo(
          balanceStore,
          "pendingIncomingRefresh",
          session.amountRefreshOutput,
          session.exchangeBaseUrl,
        );
      }
    }
  });

  // FIXME: re-implement
  // await tx.iter(Stores.withdrawalGroups).forEach((wds) => {
  //   let w = wds.totalCoinValue;
  //   for (let i = 0; i < wds.planchets.length; i++) {
  //     if (wds.withdrawn[i]) {
  //       const p = wds.planchets[i];
  //       if (p) {
  //         w = Amounts.sub(w, p.coinValue).amount;
  //       }
  //     }
  //   }
  //   addTo(balanceStore, "pendingIncoming", w, wds.exchangeBaseUrl);
  // });

  await tx.iter(Stores.purchases).forEach((t) => {
    if (t.timestampFirstSuccessfulPay) {
      return;
    }
    for (const c of t.coinDepositPermissions) {
      addTo(
        balanceStore,
        "pendingPayment",
        Amounts.parseOrThrow(c.contribution),
        c.exchange_url,
      );
    }
  });

  return balanceStore;
}

/**
 * Get detailed balance information, sliced by exchange and by currency.
 */
export async function getBalances(
  ws: InternalWalletState,
): Promise<WalletBalance> {
  logger.trace("starting to compute balance");

  const wbal = await ws.db.runWithReadTransaction(
    [
      Stores.coins,
      Stores.refreshGroups,
      Stores.reserves,
      Stores.purchases,
      Stores.withdrawalGroups,
    ],
    async (tx) => {
      return getBalancesInsideTransaction(ws, tx);
    },
  );

  logger.trace("finished computing wallet balance");

  return wbal;
}
