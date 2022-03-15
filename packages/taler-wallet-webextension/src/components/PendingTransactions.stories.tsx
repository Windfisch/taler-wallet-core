/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { PendingTransactionsView as TestedComponent } from "./PendingTransactions";
import { Fragment, h, VNode } from "preact";
import { createExample } from "../test-utils";
import { Transaction, TransactionType } from "@gnu-taler/taler-util";

export default {
  title: "component/PendingTransactions",
  component: TestedComponent,
};

export const OnePendingTransaction = createExample(TestedComponent, {
  transactions: [
    {
      amountEffective: "USD:10",
      type: TransactionType.Withdrawal,
      timestamp: {
        t_ms: 1,
      },
    } as Transaction,
  ],
});

export const ThreePendingTransactions = createExample(TestedComponent, {
  transactions: [
    {
      amountEffective: "USD:10",
      type: TransactionType.Withdrawal,
      timestamp: {
        t_ms: 1,
      },
    } as Transaction,
    {
      amountEffective: "USD:10",
      type: TransactionType.Withdrawal,
      timestamp: {
        t_ms: 1,
      },
    } as Transaction,
    {
      amountEffective: "USD:10",
      type: TransactionType.Withdrawal,
      timestamp: {
        t_ms: 1,
      },
    } as Transaction,
  ],
});

export const TenPendingTransactions = createExample(TestedComponent, {
  transactions: [
    {
      amountEffective: "USD:10",
      type: TransactionType.Withdrawal,
      timestamp: {
        t_ms: 1,
      },
    } as Transaction,
    {
      amountEffective: "USD:10",
      type: TransactionType.Withdrawal,
      timestamp: {
        t_ms: 1,
      },
    } as Transaction,
    {
      amountEffective: "USD:10",
      type: TransactionType.Withdrawal,
      timestamp: {
        t_ms: 1,
      },
    } as Transaction,
    {
      amountEffective: "USD:10",
      type: TransactionType.Withdrawal,
      timestamp: {
        t_ms: 1,
      },
    } as Transaction,
    {
      amountEffective: "USD:10",
      type: TransactionType.Withdrawal,
      timestamp: {
        t_ms: 1,
      },
    } as Transaction,
    {
      amountEffective: "USD:10",
      type: TransactionType.Withdrawal,
      timestamp: {
        t_ms: 1,
      },
    } as Transaction,
    {
      amountEffective: "USD:10",
      type: TransactionType.Withdrawal,
      timestamp: {
        t_ms: 1,
      },
    } as Transaction,
    {
      amountEffective: "USD:10",
      type: TransactionType.Withdrawal,
      timestamp: {
        t_ms: 1,
      },
    } as Transaction,
    {
      amountEffective: "USD:10",
      type: TransactionType.Withdrawal,
      timestamp: {
        t_ms: 1,
      },
    } as Transaction,
    {
      amountEffective: "USD:10",
      type: TransactionType.Withdrawal,
      timestamp: {
        t_ms: 1,
      },
    } as Transaction,
  ],
});