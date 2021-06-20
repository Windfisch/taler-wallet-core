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

import {
  PaymentStatus,
  TransactionCommon, TransactionDeposit, TransactionPayment,
  TransactionRefresh, TransactionRefund, TransactionTip, TransactionType,
  TransactionWithdrawal,
  WithdrawalType
} from '@gnu-taler/taler-util';
import { FunctionalComponent } from 'preact';
import { TransactionView as TestedComponent } from './Transaction';

export default {
  title: 'popup/transaction/details',
  component: TestedComponent,
  decorators: [
    (Story: any) => <div>
      <link key="1" rel="stylesheet" type="text/css" href="/style/pure.css" />
      <link key="2" rel="stylesheet" type="text/css" href="/style/popup.css" />
      <link key="3" rel="stylesheet" type="text/css" href="/style/wallet.css" />
      <div style={{ margin: "1em", width: 400, display: 'flex', padding: '0.5em', height: 'calc(20rem - 34px)', border: 'black solid 1px' }}>
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
    amountEffective: 'USD:11',
    type: TransactionType.Payment,
    info: {
      contractTermsHash: 'ASDZXCASD',
      merchant: {
        name: 'the merchant',
      },
      orderId: '2021.167-03NPY6MCYMVGT',
      products: [],
      summary: 'the summary',
      fulfillmentMessage: '',
    },
    proposalId: '1EMJJH8EP1NX3XF7733NCYS2DBEJW4Q2KA5KEB37MCQJQ8Q5HMC0',
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
    refundedTransactionId: 'payment:1EMJJH8EP1NX3XF7733NCYS2DBEJW4Q2KA5KEB37MCQJQ8Q5HMC0',
    info: {
      contractTermsHash: 'ASDZXCASD',
      merchant: {
        name: 'the merchant',
      },
      orderId: '2021.167-03NPY6MCYMVGT',
      products: [],
      summary: 'the summary',
      fulfillmentMessage: '',
    },
  } as TransactionRefund,
}

function createExample<Props>(Component: FunctionalComponent<Props>, props: Partial<Props>) {
  const r = (args: any) => <Component {...args} />
  r.args = props
  return r
}

export const NotYetLoaded = createExample(TestedComponent, {});

export const Withdraw = createExample(TestedComponent, {
  transaction: exampleData.withdraw
});

export const WithdrawPending = createExample(TestedComponent, {
  transaction: { ...exampleData.withdraw, pending: true },
});


export const Payment = createExample(TestedComponent, {
  transaction: exampleData.payment
});

export const PaymentWithoutFee = createExample(TestedComponent, {
  transaction: {
    ...exampleData.payment,
    amountRaw: 'USD:11',

  }
});

export const PaymentPending = createExample(TestedComponent, {
  transaction: { ...exampleData.payment, pending: true },
});

export const PaymentWithProducts = createExample(TestedComponent, {
  transaction: {
    ...exampleData.payment,
    info: {
      ...exampleData.payment.info,
      summary: 'this order has 5 products',
      products: [{
        description: 't-shirt',
        unit: 'shirts',
        quantity: 1,
      }, {
        description: 't-shirt',
        unit: 'shirts',
        quantity: 1,
      }, {
        description: 'e-book',
      }, {
        description: 'beer',
        unit: 'pint',
        quantity: 15,
      }, {
        description: 'beer',
        unit: 'pint',
        quantity: 15,
      }]
    }
  } as TransactionPayment,
});

export const PaymentWithLongSummary = createExample(TestedComponent, {
  transaction: {
    ...exampleData.payment,
    info: {
      ...exampleData.payment.info,
      summary: 'this is a very long summary that will occupy severals lines, this is a very long summary that will occupy severals lines, this is a very long summary that will occupy severals lines, this is a very long summary that will occupy severals lines, ',
      products: [{
        description: 'an xl sized t-shirt with some drawings on it, color pink',
        unit: 'shirts',
        quantity: 1,
      }, {
        description: 'beer',
        unit: 'pint',
        quantity: 15,
      }]
    }
  } as TransactionPayment,
});


export const Deposit = createExample(TestedComponent, {
  transaction: exampleData.deposit
});

export const DepositPending = createExample(TestedComponent, {
  transaction: { ...exampleData.deposit, pending: true }
});

export const Refresh = createExample(TestedComponent, {
  transaction: exampleData.refresh
});

export const Tip = createExample(TestedComponent, {
  transaction: exampleData.tip
});

export const TipPending = createExample(TestedComponent, {
  transaction: { ...exampleData.tip, pending: true }
});

export const Refund = createExample(TestedComponent, {
  transaction: exampleData.refund
});

export const RefundPending = createExample(TestedComponent, {
  transaction: { ...exampleData.refund, pending: true }
});

export const RefundWithProducts = createExample(TestedComponent, {
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
