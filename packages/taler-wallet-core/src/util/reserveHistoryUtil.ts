/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems S.A.

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
 * Helpers for dealing with reserve histories.
 *
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports.
 */
import {
  WalletReserveHistoryItem,
  WalletReserveHistoryItemType,
} from "../types/dbTypes";
import {
  ReserveTransaction,
  ReserveTransactionType,
} from "../types/ReserveTransaction";
import * as Amounts from "../util/amounts";
import { timestampCmp } from "./time";
import { deepCopy } from "./helpers";
import { AmountJson } from "../util/amounts";

/**
 * Result of a reserve reconciliation.
 */
export interface ReserveReconciliationResult {
  /**
   * The wallet's local history reconciled with the exchange's reserve history.
   */
  updatedLocalHistory: WalletReserveHistoryItem[];

  /**
   * History items that were newly created, subset of the
   * updatedLocalHistory items.
   */
  newAddedItems: WalletReserveHistoryItem[];

  /**
   * History items that were newly matched, subset of the
   * updatedLocalHistory items.
   */
  newMatchedItems: WalletReserveHistoryItem[];
}

/**
 * Various totals computed from the wallet's view
 * on the reserve history.
 */
export interface ReserveHistorySummary {
  /**
   * Balance computed by the wallet, should match the balance
   * computed by the reserve.
   */
  computedReserveBalance: Amounts.AmountJson;

  /**
   * Reserve balance that is still available for withdrawal.
   */
  unclaimedReserveAmount: Amounts.AmountJson;

  /**
   * Amount that we're still expecting to come into the reserve.
   */
  awaitedReserveAmount: Amounts.AmountJson;

  /**
   * Amount withdrawn from the reserve so far.  Only counts
   * finished withdrawals, not withdrawals in progress.
   */
  withdrawnAmount: Amounts.AmountJson;
}

/**
 * Check if two reserve history items (exchange's version) match.
 */
function isRemoteHistoryMatch(
  t1: ReserveTransaction,
  t2: ReserveTransaction,
): boolean {
  switch (t1.type) {
    case ReserveTransactionType.Closing: {
      return t1.type === t2.type && t1.wtid == t2.wtid;
    }
    case ReserveTransactionType.Credit: {
      return t1.type === t2.type && t1.wire_reference === t2.wire_reference;
    }
    case ReserveTransactionType.Recoup: {
      return (
        t1.type === t2.type &&
        t1.coin_pub === t2.coin_pub &&
        timestampCmp(t1.timestamp, t2.timestamp) === 0
      );
    }
    case ReserveTransactionType.Withdraw: {
      return t1.type === t2.type && t1.h_coin_envelope === t2.h_coin_envelope;
    }
  }
}

/**
 * Check a local reserve history item and a remote history item are a match.
 */
export function isLocalRemoteHistoryMatch(
  t1: WalletReserveHistoryItem,
  t2: ReserveTransaction,
): boolean {
  switch (t1.type) {
    case WalletReserveHistoryItemType.Credit: {
      return (
        t2.type === ReserveTransactionType.Credit &&
        !!t1.expectedAmount &&
        Amounts.cmp(t1.expectedAmount, Amounts.parseOrThrow(t2.amount)) === 0
      );
    }
    case WalletReserveHistoryItemType.Withdraw:
      return (
        t2.type === ReserveTransactionType.Withdraw &&
        !!t1.expectedAmount &&
        Amounts.cmp(t1.expectedAmount, Amounts.parseOrThrow(t2.amount)) === 0
      );
    case WalletReserveHistoryItemType.Recoup: {
      return (
        t2.type === ReserveTransactionType.Recoup &&
        !!t1.expectedAmount &&
        Amounts.cmp(t1.expectedAmount, Amounts.parseOrThrow(t2.amount)) === 0
      );
    }
  }
  return false;
}

/**
 * Compute totals for the wallet's view of the reserve history.
 */
export function summarizeReserveHistory(
  localHistory: WalletReserveHistoryItem[],
  currency: string,
): ReserveHistorySummary {
  const posAmounts: AmountJson[] = [];
  const negAmounts: AmountJson[] = [];
  const expectedPosAmounts: AmountJson[] = [];
  const expectedNegAmounts: AmountJson[] = [];
  const withdrawnAmounts: AmountJson[] = [];

  for (const item of localHistory) {
    switch (item.type) {
      case WalletReserveHistoryItemType.Credit:
        if (item.matchedExchangeTransaction) {
          posAmounts.push(
            Amounts.parseOrThrow(item.matchedExchangeTransaction.amount),
          );
        } else if (item.expectedAmount) {
          expectedPosAmounts.push(item.expectedAmount);
        }
        break;
      case WalletReserveHistoryItemType.Recoup:
        if (item.matchedExchangeTransaction) {
          if (item.matchedExchangeTransaction) {
            posAmounts.push(
              Amounts.parseOrThrow(item.matchedExchangeTransaction.amount),
            );
          } else if (item.expectedAmount) {
            expectedPosAmounts.push(item.expectedAmount);
          } else {
            throw Error("invariant failed");
          }
        }
        break;
      case WalletReserveHistoryItemType.Closing:
        if (item.matchedExchangeTransaction) {
          negAmounts.push(
            Amounts.parseOrThrow(item.matchedExchangeTransaction.amount),
          );
        } else {
          throw Error("invariant failed");
        }
        break;
      case WalletReserveHistoryItemType.Withdraw:
        if (item.matchedExchangeTransaction) {
          negAmounts.push(
            Amounts.parseOrThrow(item.matchedExchangeTransaction.amount),
          );
          withdrawnAmounts.push(
            Amounts.parseOrThrow(item.matchedExchangeTransaction.amount),
          );
        } else if (item.expectedAmount) {
          expectedNegAmounts.push(item.expectedAmount);
        } else {
          throw Error("invariant failed");
        }
        break;
    }
  }

  const z = Amounts.getZero(currency);

  const computedBalance = Amounts.sub(
    Amounts.add(z, ...posAmounts).amount,
    ...negAmounts,
  ).amount;

  const unclaimedReserveAmount = Amounts.sub(
    Amounts.add(z, ...posAmounts).amount,
    ...negAmounts,
    ...expectedNegAmounts,
  ).amount;

  const awaitedReserveAmount = Amounts.sub(
    Amounts.add(z, ...expectedPosAmounts).amount,
    ...expectedNegAmounts,
  ).amount;

  const withdrawnAmount = Amounts.add(z, ...withdrawnAmounts).amount;

  return {
    computedReserveBalance: computedBalance,
    unclaimedReserveAmount: unclaimedReserveAmount,
    awaitedReserveAmount: awaitedReserveAmount,
    withdrawnAmount,
  };
}

/**
 * Reconcile the wallet's local model of the reserve history
 * with the reserve history of the exchange.
 */
export function reconcileReserveHistory(
  localHistory: WalletReserveHistoryItem[],
  remoteHistory: ReserveTransaction[],
): ReserveReconciliationResult {
  const updatedLocalHistory: WalletReserveHistoryItem[] = deepCopy(
    localHistory,
  );
  const newMatchedItems: WalletReserveHistoryItem[] = [];
  const newAddedItems: WalletReserveHistoryItem[] = [];

  const remoteMatched = remoteHistory.map(() => false);
  const localMatched = localHistory.map(() => false);

  // Take care of deposits

  // First, see which pairs are already a definite match.
  for (let remoteIndex = 0; remoteIndex < remoteHistory.length; remoteIndex++) {
    const rhi = remoteHistory[remoteIndex];
    for (let localIndex = 0; localIndex < localHistory.length; localIndex++) {
      if (localMatched[localIndex]) {
        continue;
      }
      const lhi = localHistory[localIndex];
      if (!lhi.matchedExchangeTransaction) {
        continue;
      }
      if (isRemoteHistoryMatch(rhi, lhi.matchedExchangeTransaction)) {
        localMatched[localIndex] = true;
        remoteMatched[remoteIndex] = true;
        break;
      }
    }
  }

  // Check that all previously matched items are still matched
  for (let localIndex = 0; localIndex < localHistory.length; localIndex++) {
    if (localMatched[localIndex]) {
      continue;
    }
    const lhi = localHistory[localIndex];
    if (lhi.matchedExchangeTransaction) {
      // Don't use for further matching
      localMatched[localIndex] = true;
      // FIXME: emit some error here!
      throw Error("previously matched reserve history item now unmatched");
    }
  }

  // Next, find out if there are any exact new matches between local and remote
  // history items
  for (let localIndex = 0; localIndex < localHistory.length; localIndex++) {
    if (localMatched[localIndex]) {
      continue;
    }
    const lhi = localHistory[localIndex];
    for (
      let remoteIndex = 0;
      remoteIndex < remoteHistory.length;
      remoteIndex++
    ) {
      const rhi = remoteHistory[remoteIndex];
      if (remoteMatched[remoteIndex]) {
        continue;
      }
      if (isLocalRemoteHistoryMatch(lhi, rhi)) {
        localMatched[localIndex] = true;
        remoteMatched[remoteIndex] = true;
        updatedLocalHistory[localIndex].matchedExchangeTransaction = rhi as any;
        newMatchedItems.push(lhi);
        break;
      }
    }
  }

  // Finally we add new history items
  for (let remoteIndex = 0; remoteIndex < remoteHistory.length; remoteIndex++) {
    if (remoteMatched[remoteIndex]) {
      continue;
    }
    const rhi = remoteHistory[remoteIndex];
    let newItem: WalletReserveHistoryItem;
    switch (rhi.type) {
      case ReserveTransactionType.Closing: {
        newItem = {
          type: WalletReserveHistoryItemType.Closing,
          matchedExchangeTransaction: rhi,
        };
        break;
      }
      case ReserveTransactionType.Credit: {
        newItem = {
          type: WalletReserveHistoryItemType.Credit,
          matchedExchangeTransaction: rhi,
        };
        break;
      }
      case ReserveTransactionType.Recoup: {
        newItem = {
          type: WalletReserveHistoryItemType.Recoup,
          matchedExchangeTransaction: rhi,
        };
        break;
      }
      case ReserveTransactionType.Withdraw: {
        newItem = {
          type: WalletReserveHistoryItemType.Withdraw,
          matchedExchangeTransaction: rhi,
        };
        break;
      }
    }
    updatedLocalHistory.push(newItem);
    newAddedItems.push(newItem);
  }

  return {
    updatedLocalHistory,
    newAddedItems,
    newMatchedItems,
  };
}
