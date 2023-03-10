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
  AmountJson,
  BalancesResponse,
  Amounts,
  Logger,
} from "@gnu-taler/taler-util";
import { WalletStoresV1 } from "../db.js";
import { GetReadOnlyAccess } from "../util/query.js";
import { InternalWalletState } from "../internal-wallet-state.js";

const logger = new Logger("operations/balance.ts");

interface WalletBalance {
  available: AmountJson;
  pendingIncoming: AmountJson;
  pendingOutgoing: AmountJson;
}

/**
 * Get balance information.
 */
export async function getBalancesInsideTransaction(
  ws: InternalWalletState,
  tx: GetReadOnlyAccess<{
    coins: typeof WalletStoresV1.coins;
    coinAvailability: typeof WalletStoresV1.coinAvailability;
    refreshGroups: typeof WalletStoresV1.refreshGroups;
    withdrawalGroups: typeof WalletStoresV1.withdrawalGroups;
  }>,
): Promise<BalancesResponse> {
  const balanceStore: Record<string, WalletBalance> = {};

  /**
   * Add amount to a balance field, both for
   * the slicing by exchange and currency.
   */
  const initBalance = (currency: string): WalletBalance => {
    const b = balanceStore[currency];
    if (!b) {
      balanceStore[currency] = {
        available: Amounts.zeroOfCurrency(currency),
        pendingIncoming: Amounts.zeroOfCurrency(currency),
        pendingOutgoing: Amounts.zeroOfCurrency(currency),
      };
    }
    return balanceStore[currency];
  };

  await tx.coinAvailability.iter().forEach((ca) => {
    const b = initBalance(ca.currency);
    for (let i = 0; i < ca.freshCoinCount; i++) {
      b.available = Amounts.add(b.available, {
        currency: ca.currency,
        fraction: ca.amountFrac,
        value: ca.amountVal,
      }).amount;
    }
  });

  await tx.refreshGroups.iter().forEach((r) => {
    // Don't count finished refreshes, since the refresh already resulted
    // in coins being added to the wallet.
    if (r.timestampFinished) {
      return;
    }
    for (let i = 0; i < r.oldCoinPubs.length; i++) {
      const session = r.refreshSessionPerCoin[i];
      if (session) {
        const currency = Amounts.parseOrThrow(
          session.amountRefreshOutput,
        ).currency;
        const b = initBalance(currency);
        // We are always assuming the refresh will succeed, thus we
        // report the output as available balance.
        b.available = Amounts.add(
          b.available,
          session.amountRefreshOutput,
        ).amount;
      } else {
        const currency = Amounts.parseOrThrow(r.inputPerCoin[i]).currency;
        const b = initBalance(currency);
        b.available = Amounts.add(
          b.available,
          r.estimatedOutputPerCoin[i],
        ).amount;
      }
    }
  });

  await tx.withdrawalGroups.iter().forEach((wds) => {
    if (wds.timestampFinish) {
      return;
    }
    const b = initBalance(Amounts.currencyOf(wds.denomsSel.totalWithdrawCost));
    b.pendingIncoming = Amounts.add(
      b.pendingIncoming,
      wds.denomsSel.totalCoinValue,
    ).amount;
  });

  const balancesResponse: BalancesResponse = {
    balances: [],
  };

  Object.keys(balanceStore)
    .sort()
    .forEach((c) => {
      const v = balanceStore[c];
      balancesResponse.balances.push({
        available: Amounts.stringify(v.available),
        pendingIncoming: Amounts.stringify(v.pendingIncoming),
        pendingOutgoing: Amounts.stringify(v.pendingOutgoing),
        hasPendingTransactions: false,
        requiresUserInput: false,
      });
    });

  return balancesResponse;
}

/**
 * Get detailed balance information, sliced by exchange and by currency.
 */
export async function getBalances(
  ws: InternalWalletState,
): Promise<BalancesResponse> {
  logger.trace("starting to compute balance");

  const wbal = await ws.db
    .mktx((x) => [
      x.coins,
      x.coinAvailability,
      x.refreshGroups,
      x.purchases,
      x.withdrawalGroups,
    ])
    .runReadOnly(async (tx) => {
      return getBalancesInsideTransaction(ws, tx);
    });

  logger.trace("finished computing wallet balance");

  return wbal;
}
