/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

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

import {
  PaymentStatus,
  TalerProtocolTimestamp,
  TransactionCommon,
  TransactionDeposit,
  TransactionPayment,
  TransactionPeerPullCredit,
  TransactionPeerPullDebit,
  TransactionPeerPushCredit,
  TransactionPeerPushDebit,
  TransactionRefresh,
  TransactionRefund,
  TransactionTip,
  TransactionType,
  TransactionWithdrawal,
  WithdrawalType,
} from "@gnu-taler/taler-util";
import { HistoryView as TestedComponent } from "./History.js";
import { createExample } from "../test-utils.js";

export default {
  title: "wallet/balance",
  component: TestedComponent,
};

let count = 0;
const commonTransaction = (): TransactionCommon =>
  ({
    amountRaw: "USD:10",
    amountEffective: "USD:9",
    pending: false,
    timestamp: TalerProtocolTimestamp.fromSeconds(
      new Date().getTime() - count++ * 60 * 60 * 7,
    ),
    transactionId: "12",
  } as TransactionCommon);

const exampleData = {
  withdraw: {
    ...commonTransaction(),
    type: TransactionType.Withdrawal,
    exchangeBaseUrl: "http://exchange.demo.taler.net",
    withdrawalDetails: {
      reservePub: "A05AJGMFNSK4Q62NXR2FKNDB1J4EXTYQTE7VA4M9GZQ4TR06YBNG",
      confirmed: false,
      exchangePaytoUris: ["payto://x-taler-bank/bank/account"],
      type: WithdrawalType.ManualTransfer,
    },
  } as TransactionWithdrawal,
  payment: {
    ...commonTransaction(),
    amountEffective: "USD:11",
    type: TransactionType.Payment,
    info: {
      contractTermsHash: "ASDZXCASD",
      merchant: {
        name: "Blog",
      },
      orderId: "2021.167-03NPY6MCYMVGT",
      products: [],
      summary: "the summary",
      fulfillmentMessage: "",
    },
    refunds: [],
    refundPending: undefined,
    totalRefundEffective: "USD:0",
    totalRefundRaw: "USD:0",
    proposalId: "1EMJJH8EP1NX3XF7733NCYS2DBEJW4Q2KA5KEB37MCQJQ8Q5HMC0",
    status: PaymentStatus.Accepted,
  } as TransactionPayment,
  deposit: {
    ...commonTransaction(),
    type: TransactionType.Deposit,
    depositGroupId: "#groupId",
    targetPaytoUri: "payto://x-taler-bank/bank/account",
  } as TransactionDeposit,
  refresh: {
    ...commonTransaction(),
    type: TransactionType.Refresh,
    exchangeBaseUrl: "http://exchange.taler",
  } as TransactionRefresh,
  tip: {
    ...commonTransaction(),
    type: TransactionType.Tip,
    merchantBaseUrl: "http://ads.merchant.taler.net/",
  } as TransactionTip,
  refund: {
    ...commonTransaction(),
    type: TransactionType.Refund,
    refundedTransactionId:
      "payment:1EMJJH8EP1NX3XF7733NCYS2DBEJW4Q2KA5KEB37MCQJQ8Q5HMC0",
    info: {
      contractTermsHash: "ASDZXCASD",
      merchant: {
        name: "the merchant",
      },
      orderId: "2021.167-03NPY6MCYMVGT",
      products: [],
      summary: "the summary",
      fulfillmentMessage: "",
    },
    refundPending: undefined,
  } as TransactionRefund,
  push_credit: {
    ...commonTransaction(),
    type: TransactionType.PeerPushCredit,

    exchangeBaseUrl: "https://exchange.taler.net",
  } as TransactionPeerPushCredit,
  push_debit: {
    ...commonTransaction(),
    type: TransactionType.PeerPushDebit,
    talerUri:
      "taler://pay-push/exchange.taler.ar/HS585JK0QCXHJ8Z8QWZA3EBAY5WY7XNC1RR2MHJXSH2Z4WP0YPJ0",
    exchangeBaseUrl: "https://exchange.taler.net",
  } as TransactionPeerPushDebit,
  pull_credit: {
    ...commonTransaction(),
    type: TransactionType.PeerPullCredit,
    talerUri:
      "taler://pay-push/exchange.taler.ar/HS585JK0QCXHJ8Z8QWZA3EBAY5WY7XNC1RR2MHJXSH2Z4WP0YPJ0",
    exchangeBaseUrl: "https://exchange.taler.net",
  } as TransactionPeerPullCredit,
  pull_debit: {
    ...commonTransaction(),
    type: TransactionType.PeerPullDebit,
    exchangeBaseUrl: "https://exchange.taler.net",
  } as TransactionPeerPullDebit,
};

export const NoBalance = createExample(TestedComponent, {
  transactions: [],
  balances: [],
});

export const SomeBalanceWithNoTransactions = createExample(TestedComponent, {
  transactions: [],
  balances: [
    {
      available: "TESTKUDOS:10",
      pendingIncoming: "TESTKUDOS:0",
      pendingOutgoing: "TESTKUDOS:0",
      hasPendingTransactions: false,
      requiresUserInput: false,
    },
  ],
});

export const OneSimpleTransaction = createExample(TestedComponent, {
  transactions: [exampleData.withdraw],
  balances: [
    {
      available: "USD:10",
      pendingIncoming: "USD:0",
      pendingOutgoing: "USD:0",
      hasPendingTransactions: false,
      requiresUserInput: false,
    },
  ],
});

export const TwoTransactionsAndZeroBalance = createExample(TestedComponent, {
  transactions: [exampleData.withdraw, exampleData.deposit],
  balances: [
    {
      available: "USD:0",
      pendingIncoming: "USD:0",
      pendingOutgoing: "USD:0",
      hasPendingTransactions: false,
      requiresUserInput: false,
    },
  ],
});

export const OneTransactionPending = createExample(TestedComponent, {
  transactions: [
    {
      ...exampleData.withdraw,
      pending: true,
    },
  ],
  balances: [
    {
      available: "USD:10",
      pendingIncoming: "USD:0",
      pendingOutgoing: "USD:0",
      hasPendingTransactions: false,
      requiresUserInput: false,
    },
  ],
});

export const SomeTransactions = createExample(TestedComponent, {
  transactions: [
    exampleData.withdraw,
    exampleData.payment,
    exampleData.withdraw,
    exampleData.payment,
    {
      ...exampleData.payment,
      info: {
        ...exampleData.payment.info,
        summary:
          "this is a long summary that may be cropped because its too long",
      },
    },
    exampleData.refund,
    exampleData.tip,
    exampleData.deposit,
  ],
  balances: [
    {
      available: "USD:10",
      pendingIncoming: "USD:0",
      pendingOutgoing: "USD:0",
      hasPendingTransactions: false,
      requiresUserInput: false,
    },
  ],
});

export const SomeTransactionsWithTwoCurrencies = createExample(
  TestedComponent,
  {
    transactions: [
      exampleData.withdraw,
      exampleData.payment,
      exampleData.withdraw,
      exampleData.payment,
      exampleData.refresh,
      exampleData.refund,
      exampleData.tip,
      exampleData.deposit,
    ],
    balances: [
      {
        available: "USD:0",
        pendingIncoming: "USD:0",
        pendingOutgoing: "USD:0",
        hasPendingTransactions: false,
        requiresUserInput: false,
      },
      {
        available: "TESTKUDOS:10",
        pendingIncoming: "TESTKUDOS:0",
        pendingOutgoing: "TESTKUDOS:0",
        hasPendingTransactions: false,
        requiresUserInput: false,
      },
    ],
  },
);

export const FiveOfficialCurrencies = createExample(TestedComponent, {
  transactions: [exampleData.withdraw],
  balances: [
    {
      available: "USD:1000",
      pendingIncoming: "USD:0",
      pendingOutgoing: "USD:0",
      hasPendingTransactions: false,
      requiresUserInput: false,
    },
    {
      available: "EUR:881",
      pendingIncoming: "TESTKUDOS:0",
      pendingOutgoing: "TESTKUDOS:0",
      hasPendingTransactions: false,
      requiresUserInput: false,
    },
    {
      available: "COL:4043000.5",
      pendingIncoming: "TESTKUDOS:0",
      pendingOutgoing: "TESTKUDOS:0",
      hasPendingTransactions: false,
      requiresUserInput: false,
    },
    {
      available: "JPY:11564450.6",
      pendingIncoming: "TESTKUDOS:0",
      pendingOutgoing: "TESTKUDOS:0",
      hasPendingTransactions: false,
      requiresUserInput: false,
    },
    {
      available: "GBP:736",
      pendingIncoming: "TESTKUDOS:0",
      pendingOutgoing: "TESTKUDOS:0",
      hasPendingTransactions: false,
      requiresUserInput: false,
    },
  ],
});

export const FiveOfficialCurrenciesWithHighValue = createExample(
  TestedComponent,
  {
    transactions: [exampleData.withdraw],
    balances: [
      {
        available: "USD:881001321230000",
        pendingIncoming: "USD:0",
        pendingOutgoing: "USD:0",
        hasPendingTransactions: false,
        requiresUserInput: false,
      },
      {
        available: "EUR:10",
        pendingIncoming: "TESTKUDOS:0",
        pendingOutgoing: "TESTKUDOS:0",
        hasPendingTransactions: false,
        requiresUserInput: false,
      },
      {
        available: "COL:443000123123000.5123123",
        pendingIncoming: "TESTKUDOS:0",
        pendingOutgoing: "TESTKUDOS:0",
        hasPendingTransactions: false,
        requiresUserInput: false,
      },
      {
        available: "JPY:1564450000000.6123123",
        pendingIncoming: "TESTKUDOS:0",
        pendingOutgoing: "TESTKUDOS:0",
        hasPendingTransactions: false,
        requiresUserInput: false,
      },
      {
        available: "GBP:736001231231200.23123",
        pendingIncoming: "TESTKUDOS:0",
        pendingOutgoing: "TESTKUDOS:0",
        hasPendingTransactions: false,
        requiresUserInput: false,
      },
    ],
  },
);

export const PeerToPeer = createExample(TestedComponent, {
  transactions: [
    exampleData.pull_credit,
    exampleData.pull_debit,
    exampleData.push_credit,
    exampleData.push_debit,
  ],
  balances: [
    {
      available: "USD:10",
      pendingIncoming: "USD:0",
      pendingOutgoing: "USD:0",
      hasPendingTransactions: false,
      requiresUserInput: false,
    },
  ],
});
