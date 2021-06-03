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

import { PaymentStatus, TransactionPayment, TransactionType, TransactionWithdrawal, TransactionDeposit, TransactionRefresh, TransactionTip, TransactionRefund, WithdrawalType, TransactionCommon } from '@gnu-taler/taler-util';
import { Fragment, h } from 'preact';
import { WalletTransactionView as Component } from './popup';

export default {
  title: 'popup/transaction details',
  component: Component,
  decorators: [
    (Story: any) => <div>
      <link key="1" rel="stylesheet" type="text/css" href="/style/pure.css" />
      <link key="2" rel="stylesheet" type="text/css" href="/style/popup.css" />
      <link key="3" rel="stylesheet" type="text/css" href="/style/wallet.css" />
      <div style={{ margin: "1em", width: 400 }}>
        <Story />
      </div>
    </div>
  ],
};

const commonTransaction = {
  amountRaw: 'USD:10',
  amountEffective: 'USD:9',
  pending: false,
  timestamp: {
    t_ms: new Date().getTime()
  },
  transactionId: '12',
} as TransactionCommon

const exampleData = {
  withdraw: {
    ...commonTransaction,
    type: TransactionType.Withdrawal,
    exchangeBaseUrl: 'http://exchange.taler',
    withdrawalDetails: {
      confirmed: false,
      exchangePaytoUris: ['payto://x-taler-bank/bank/account'],
      type: WithdrawalType.ManualTransfer,
    }
  } as TransactionWithdrawal,
  payment: {
    ...commonTransaction,
    type: TransactionType.Payment,
    info: {
      contractTermsHash: 'ASDZXCASD',
      merchant: {
        name: 'the merchant',
      },
      orderId: '#12345',
      products: [],
      summary: 'the summary',
      fulfillmentMessage: '',
    },
    proposalId: '#proposalId',
    status: PaymentStatus.Accepted,
  } as TransactionPayment,
  deposit: {
    ...commonTransaction,
    type: TransactionType.Deposit,
    depositGroupId: '#groupId',
    targetPaytoUri: 'payto://x-taler-bank/bank/account',
  } as TransactionDeposit,
  refresh: {
    ...commonTransaction,
    type: TransactionType.Refresh,
    exchangeBaseUrl: 'http://exchange.taler',
  } as TransactionRefresh,
  tip: {
    ...commonTransaction,
    type: TransactionType.Tip,
    merchantBaseUrl: 'http://merchant.taler',
  } as TransactionTip,
  refund: {
    ...commonTransaction,
    type: TransactionType.Refund,
    refundedTransactionId: '#refundId',
    info: {
      contractTermsHash: 'ASDZXCASD',
      merchant: {
        name: 'the merchant',
      },
      orderId: '#12345',
      products: [],
      summary: 'the summary',
      fulfillmentMessage: '',
    },
  } as TransactionRefund,
}

function dynamic<T>(props: any) {
  const r = (args: any) => <Component {...args} />
  r.args = props
  return r
}

export const NotYetLoaded = dynamic({});

export const Withdraw = dynamic({
  transaction: exampleData.withdraw
});

export const WithdrawPending = dynamic({
  transaction: { ...exampleData.withdraw, pending: true },
});


export const Payment = dynamic({
  transaction: exampleData.payment
});

export const PaymentPending = dynamic({
  transaction: { ...exampleData.payment, pending: true },
});

export const PaymentWithProducts = dynamic({
  transaction: {
    ...exampleData.payment,
    info: {
      ...exampleData.payment.info,
      products: [{
        description: 't-shirt',
      }, {
        description: 'beer',
      }]
    }
  } as TransactionPayment,
});


export const Deposit = dynamic({
  transaction: exampleData.deposit
});

export const DepositPending = dynamic({
  transaction: { ...exampleData.deposit, pending: true }
});

export const Refresh = dynamic({
  transaction: exampleData.refresh
});

export const Tip = dynamic({
  transaction: exampleData.tip
});

export const TipPending = dynamic({
  transaction: { ...exampleData.tip, pending: true }
});

export const Refund = dynamic({
  transaction: exampleData.refund
});

export const RefundPending = dynamic({
  transaction: { ...exampleData.refund , pending: true }
});

export const RefundWithProducts = dynamic({
  transaction: {
    ...exampleData.refund,
    info: {
      ...exampleData.refund.info,
      products: [{
        description: 't-shirt',
      }, {
        description: 'beer',
      }]
    }
  } as TransactionRefund,
});
