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
 * Imports.
 */
import test from "ava";
import {
  reconcileReserveHistory,
  summarizeReserveHistory,
} from "./reserveHistoryUtil";
import {
  WalletReserveHistoryItem,
  WalletReserveHistoryItemType,
} from "../types/dbTypes";
import {
  ReserveTransaction,
  ReserveTransactionType,
} from "../types/ReserveTransaction";
import { Amounts } from "./amounts";

test("basics", (t) => {
  const r = reconcileReserveHistory([], []);
  t.deepEqual(r.updatedLocalHistory, []);
});

test("unmatched credit", (t) => {
  const localHistory: WalletReserveHistoryItem[] = [];
  const remoteHistory: ReserveTransaction[] = [
    {
      type: ReserveTransactionType.Credit,
      amount: "TESTKUDOS:100",
      sender_account_url: "payto://void/",
      timestamp: { t_ms: 42 },
      wire_reference: "ABC01",
    },
  ];
  const r = reconcileReserveHistory(localHistory, remoteHistory);
  const s = summarizeReserveHistory(r.updatedLocalHistory, "TESTKUDOS");
  t.deepEqual(r.updatedLocalHistory.length, 1);
  t.deepEqual(Amounts.stringify(s.computedReserveBalance), "TESTKUDOS:100");
  t.deepEqual(Amounts.stringify(s.awaitedReserveAmount), "TESTKUDOS:0");
  t.deepEqual(Amounts.stringify(s.unclaimedReserveAmount), "TESTKUDOS:100");
});

test("unmatched credit #2", (t) => {
  const localHistory: WalletReserveHistoryItem[] = [];
  const remoteHistory: ReserveTransaction[] = [
    {
      type: ReserveTransactionType.Credit,
      amount: "TESTKUDOS:100",
      sender_account_url: "payto://void/",
      timestamp: { t_ms: 42 },
      wire_reference: "ABC01",
    },
    {
      type: ReserveTransactionType.Credit,
      amount: "TESTKUDOS:50",
      sender_account_url: "payto://void/",
      timestamp: { t_ms: 42 },
      wire_reference: "ABC02",
    },
  ];
  const r = reconcileReserveHistory(localHistory, remoteHistory);
  const s = summarizeReserveHistory(r.updatedLocalHistory, "TESTKUDOS");
  t.deepEqual(r.updatedLocalHistory.length, 2);
  t.deepEqual(Amounts.stringify(s.computedReserveBalance), "TESTKUDOS:150");
  t.deepEqual(Amounts.stringify(s.awaitedReserveAmount), "TESTKUDOS:0");
  t.deepEqual(Amounts.stringify(s.unclaimedReserveAmount), "TESTKUDOS:150");
});

test("matched credit", (t) => {
  const localHistory: WalletReserveHistoryItem[] = [
    {
      type: WalletReserveHistoryItemType.Credit,
      expectedAmount: Amounts.parseOrThrow("TESTKUDOS:100"),
      matchedExchangeTransaction: {
        type: ReserveTransactionType.Credit,
        amount: "TESTKUDOS:100",
        sender_account_url: "payto://void/",
        timestamp: { t_ms: 42 },
        wire_reference: "ABC01",
      },
    },
  ];
  const remoteHistory: ReserveTransaction[] = [
    {
      type: ReserveTransactionType.Credit,
      amount: "TESTKUDOS:100",
      sender_account_url: "payto://void/",
      timestamp: { t_ms: 42 },
      wire_reference: "ABC01",
    },
    {
      type: ReserveTransactionType.Credit,
      amount: "TESTKUDOS:50",
      sender_account_url: "payto://void/",
      timestamp: { t_ms: 42 },
      wire_reference: "ABC02",
    },
  ];
  const r = reconcileReserveHistory(localHistory, remoteHistory);
  const s = summarizeReserveHistory(r.updatedLocalHistory, "TESTKUDOS");
  t.deepEqual(r.updatedLocalHistory.length, 2);
  t.deepEqual(Amounts.stringify(s.computedReserveBalance), "TESTKUDOS:150");
  t.deepEqual(Amounts.stringify(s.awaitedReserveAmount), "TESTKUDOS:0");
  t.deepEqual(Amounts.stringify(s.unclaimedReserveAmount), "TESTKUDOS:150");
});

test("fulfilling credit", (t) => {
  const localHistory: WalletReserveHistoryItem[] = [
    {
      type: WalletReserveHistoryItemType.Credit,
      expectedAmount: Amounts.parseOrThrow("TESTKUDOS:100"),
    },
  ];
  const remoteHistory: ReserveTransaction[] = [
    {
      type: ReserveTransactionType.Credit,
      amount: "TESTKUDOS:100",
      sender_account_url: "payto://void/",
      timestamp: { t_ms: 42 },
      wire_reference: "ABC01",
    },
    {
      type: ReserveTransactionType.Credit,
      amount: "TESTKUDOS:50",
      sender_account_url: "payto://void/",
      timestamp: { t_ms: 42 },
      wire_reference: "ABC02",
    },
  ];
  const r = reconcileReserveHistory(localHistory, remoteHistory);
  const s = summarizeReserveHistory(r.updatedLocalHistory, "TESTKUDOS");
  t.deepEqual(r.updatedLocalHistory.length, 2);
  t.deepEqual(Amounts.stringify(s.computedReserveBalance), "TESTKUDOS:150");
});

test("unfulfilled credit", (t) => {
  const localHistory: WalletReserveHistoryItem[] = [
    {
      type: WalletReserveHistoryItemType.Credit,
      expectedAmount: Amounts.parseOrThrow("TESTKUDOS:100"),
    },
  ];
  const remoteHistory: ReserveTransaction[] = [
    {
      type: ReserveTransactionType.Credit,
      amount: "TESTKUDOS:100",
      sender_account_url: "payto://void/",
      timestamp: { t_ms: 42 },
      wire_reference: "ABC01",
    },
    {
      type: ReserveTransactionType.Credit,
      amount: "TESTKUDOS:50",
      sender_account_url: "payto://void/",
      timestamp: { t_ms: 42 },
      wire_reference: "ABC02",
    },
  ];
  const r = reconcileReserveHistory(localHistory, remoteHistory);
  const s = summarizeReserveHistory(r.updatedLocalHistory, "TESTKUDOS");
  t.deepEqual(r.updatedLocalHistory.length, 2);
  t.deepEqual(Amounts.stringify(s.computedReserveBalance), "TESTKUDOS:150");
});

test("awaited credit", (t) => {
  const localHistory: WalletReserveHistoryItem[] = [
    {
      type: WalletReserveHistoryItemType.Credit,
      expectedAmount: Amounts.parseOrThrow("TESTKUDOS:50"),
    },
    {
      type: WalletReserveHistoryItemType.Credit,
      expectedAmount: Amounts.parseOrThrow("TESTKUDOS:100"),
    },
  ];
  const remoteHistory: ReserveTransaction[] = [
    {
      type: ReserveTransactionType.Credit,
      amount: "TESTKUDOS:100",
      sender_account_url: "payto://void/",
      timestamp: { t_ms: 42 },
      wire_reference: "ABC01",
    },
  ];
  const r = reconcileReserveHistory(localHistory, remoteHistory);
  const s = summarizeReserveHistory(r.updatedLocalHistory, "TESTKUDOS");
  t.deepEqual(r.updatedLocalHistory.length, 2);
  t.deepEqual(Amounts.stringify(s.computedReserveBalance), "TESTKUDOS:100");
  t.deepEqual(Amounts.stringify(s.awaitedReserveAmount), "TESTKUDOS:50");
  t.deepEqual(Amounts.stringify(s.unclaimedReserveAmount), "TESTKUDOS:100");
});

test("withdrawal new match", (t) => {
  const localHistory: WalletReserveHistoryItem[] = [
    {
      type: WalletReserveHistoryItemType.Credit,
      expectedAmount: Amounts.parseOrThrow("TESTKUDOS:100"),
      matchedExchangeTransaction: {
        type: ReserveTransactionType.Credit,
        amount: "TESTKUDOS:100",
        sender_account_url: "payto://void/",
        timestamp: { t_ms: 42 },
        wire_reference: "ABC01",
      },
    },
    {
      type: WalletReserveHistoryItemType.Withdraw,
      expectedAmount: Amounts.parseOrThrow("TESTKUDOS:5"),
    },
  ];
  const remoteHistory: ReserveTransaction[] = [
    {
      type: ReserveTransactionType.Credit,
      amount: "TESTKUDOS:100",
      sender_account_url: "payto://void/",
      timestamp: { t_ms: 42 },
      wire_reference: "ABC01",
    },
    {
      type: ReserveTransactionType.Withdraw,
      amount: "TESTKUDOS:5",
      h_coin_envelope: "foobar",
      h_denom_pub: "foobar",
      reserve_sig: "foobar",
      withdraw_fee: "TESTKUDOS:0.1",
    },
  ];
  const r = reconcileReserveHistory(localHistory, remoteHistory);
  const s = summarizeReserveHistory(r.updatedLocalHistory, "TESTKUDOS");
  console.log(r);
  t.deepEqual(r.updatedLocalHistory.length, 2);
  t.deepEqual(Amounts.stringify(s.computedReserveBalance), "TESTKUDOS:95");
  t.deepEqual(Amounts.stringify(s.awaitedReserveAmount), "TESTKUDOS:0");
  t.deepEqual(Amounts.stringify(s.unclaimedReserveAmount), "TESTKUDOS:95");
});

test("claimed but now arrived", (t) => {
  const localHistory: WalletReserveHistoryItem[] = [
    {
      type: WalletReserveHistoryItemType.Credit,
      expectedAmount: Amounts.parseOrThrow("TESTKUDOS:100"),
      matchedExchangeTransaction: {
        type: ReserveTransactionType.Credit,
        amount: "TESTKUDOS:100",
        sender_account_url: "payto://void/",
        timestamp: { t_ms: 42 },
        wire_reference: "ABC01",
      },
    },
    {
      type: WalletReserveHistoryItemType.Withdraw,
      expectedAmount: Amounts.parseOrThrow("TESTKUDOS:5"),
    },
  ];
  const remoteHistory: ReserveTransaction[] = [
    {
      type: ReserveTransactionType.Credit,
      amount: "TESTKUDOS:100",
      sender_account_url: "payto://void/",
      timestamp: { t_ms: 42 },
      wire_reference: "ABC01",
    },
  ];
  const r = reconcileReserveHistory(localHistory, remoteHistory);
  const s = summarizeReserveHistory(r.updatedLocalHistory, "TESTKUDOS");
  t.deepEqual(r.updatedLocalHistory.length, 2);
  t.deepEqual(Amounts.stringify(s.computedReserveBalance), "TESTKUDOS:100");
  t.deepEqual(Amounts.stringify(s.awaitedReserveAmount), "TESTKUDOS:0");
  t.deepEqual(Amounts.stringify(s.unclaimedReserveAmount), "TESTKUDOS:95");
});
