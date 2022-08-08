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
  TransactionRefresh,
  TransactionRefund,
  TransactionTip,
  TransactionType,
  TransactionWithdrawal,
  WithdrawalDetails,
  WithdrawalType,
} from "@gnu-taler/taler-util";
import { DevContextProviderForTesting } from "../context/devContext.js";
import {
  createExample,
  createExampleWithCustomContext as createExampleInCustomContext,
} from "../test-utils.js";
import { TransactionView as TestedComponent } from "./Transaction.js";

export default {
  title: "wallet/history/details",
  component: TestedComponent,
  argTypes: {
    onRetry: { action: "onRetry" },
    onDelete: { action: "onDelete" },
    onBack: { action: "onBack" },
  },
};

const commonTransaction = {
  amountRaw: "KUDOS:11",
  amountEffective: "KUDOS:9.2",
  pending: false,
  timestamp: TalerProtocolTimestamp.now(),
  transactionId: "12",
} as TransactionCommon;

import merchantIcon from "../../static-dev/merchant-icon.jpeg";

const exampleData = {
  withdraw: {
    ...commonTransaction,
    type: TransactionType.Withdrawal,
    exchangeBaseUrl: "http://exchange.taler",
    withdrawalDetails: {
      confirmed: false,
      reservePub: "A05AJGMFNSK4Q62NXR2FKNDB1J4EXTYQTE7VA4M9GZQ4TR06YBNG",
      exchangePaytoUris: ["payto://x-taler-bank/bank.demo.taler.net/Exchange"],
      type: WithdrawalType.ManualTransfer,
    },
  } as TransactionWithdrawal,
  payment: {
    ...commonTransaction,
    amountEffective: "KUDOS:12",
    type: TransactionType.Payment,
    info: {
      contractTermsHash: "ASDZXCASD",
      merchant: {
        name: "the merchant",
        logo: merchantIcon,
        website: "https://www.themerchant.taler",
        email: "contact@merchant.taler",
      },
      orderId: "2021.167-03NPY6MCYMVGT",
      products: [],
      summary: "Essay: Why the Devil's Advocate Doesn't Help Reach the Truth",
      fulfillmentMessage: "",
      // delivery_date: { t_s: 1 },
      // delivery_location: {
      //   address_lines: [""],
      // },
    },
    refunds: [],
    refundPending: undefined,
    totalRefundEffective: "KUDOS:0",
    totalRefundRaw: "KUDOS:0",
    proposalId: "1EMJJH8EP1NX3XF7733NCYS2DBEJW4Q2KA5KEB37MCQJQ8Q5HMC0",
    status: PaymentStatus.Accepted,
  } as TransactionPayment,
  deposit: {
    ...commonTransaction,
    type: TransactionType.Deposit,
    depositGroupId: "#groupId",
    targetPaytoUri: "payto://x-taler-bank/bank.demo.taler.net/Exchange",
  } as TransactionDeposit,
  refresh: {
    ...commonTransaction,
    type: TransactionType.Refresh,
    exchangeBaseUrl: "http://exchange.taler",
  } as TransactionRefresh,
  tip: {
    ...commonTransaction,
    type: TransactionType.Tip,
    // merchant: {
    //   name: "the merchant",
    //   logo: merchantIcon,
    //   website: "https://www.themerchant.taler",
    //   email: "contact@merchant.taler",
    // },
    merchantBaseUrl: "http://merchant.taler",
  } as TransactionTip,
  refund: {
    ...commonTransaction,
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
      summary: "Essay: Why the Devil's Advocate Doesn't Help Reach the Truth",
      fulfillmentMessage: "",
    },
    refundPending: undefined,
  } as TransactionRefund,
};

const transactionError = {
  code: 7005,
  details: {
    requestUrl:
      "http://merchant-backend.taler:9966/orders/2021.340-02AD5XCC97MQM/pay",
    httpStatusCode: 410,
    errorResponse: {
      code: 2161,
      hint: "The payment is too late, the offer has expired.",
    },
  },
  hint: "Error: WALLET_UNEXPECTED_REQUEST_ERROR",
  message: "Unexpected error code in response",
};

export const Withdraw = createExample(TestedComponent, {
  transaction: exampleData.withdraw,
});

export const WithdrawFiveMinutesAgo = createExample(TestedComponent, () => ({
  transaction: {
    ...exampleData.withdraw,
    timestamp: TalerProtocolTimestamp.fromSeconds(
      new Date().getTime() / 1000 - 60 * 5,
    ),
  },
}));

export const WithdrawFiveMinutesAgoAndPending = createExample(
  TestedComponent,
  () => ({
    transaction: {
      ...exampleData.withdraw,
      timestamp: TalerProtocolTimestamp.fromSeconds(
        new Date().getTime() / 1000 - 60 * 5,
      ),
      pending: true,
    },
  }),
);

export const WithdrawError = createExample(TestedComponent, {
  transaction: {
    ...exampleData.withdraw,
    error: transactionError,
  },
});

export const WithdrawErrorInDevMode = createExampleInCustomContext(
  TestedComponent,
  {
    transaction: {
      ...exampleData.withdraw,
      error: transactionError,
    },
  },
  DevContextProviderForTesting,
  { value: true },
);

export const WithdrawPendingManual = createExample(TestedComponent, () => ({
  transaction: {
    ...exampleData.withdraw,
    withdrawalDetails: {
      type: WithdrawalType.ManualTransfer,
      exchangePaytoUris: ["payto://iban/ES8877998399652238"],
      reservePub: "A05AJGMFNSK4Q62NXR2FKNDB1J4EXTYQTE7VA4M9GZQ4TR06YBNG",
    } as WithdrawalDetails,
    pending: true,
  },
}));

export const WithdrawPendingTalerBankUnconfirmed = createExample(
  TestedComponent,
  {
    transaction: {
      ...exampleData.withdraw,
      withdrawalDetails: {
        type: WithdrawalType.TalerBankIntegrationApi,
        confirmed: false,
        reservePub: "A05AJGMFNSK4Q62NXR2FKNDB1J4EXTYQTE7VA4M9GZQ4TR06YBNG",
        bankConfirmationUrl: "http://bank.demo.taler.net",
      },
      pending: true,
    },
  },
);

export const WithdrawPendingTalerBankConfirmed = createExample(
  TestedComponent,
  {
    transaction: {
      ...exampleData.withdraw,
      withdrawalDetails: {
        type: WithdrawalType.TalerBankIntegrationApi,
        confirmed: true,
        reservePub: "A05AJGMFNSK4Q62NXR2FKNDB1J4EXTYQTE7VA4M9GZQ4TR06YBNG",
      },
      pending: true,
    },
  },
);

export const Payment = createExample(TestedComponent, {
  transaction: exampleData.payment,
});

export const PaymentError = createExample(TestedComponent, {
  transaction: {
    ...exampleData.payment,
    error: transactionError,
  },
});

export const PaymentWithRefund = createExample(TestedComponent, {
  transaction: {
    ...exampleData.payment,
    amountRaw: "KUDOS:12",
    totalRefundEffective: "KUDOS:1",
    totalRefundRaw: "KUDOS:1",
    refunds: [
      {
        transactionId: "1123123",
        amountRaw: "KUDOS:1",
        amountEffective: "KUDOS:1",
        timestamp: TalerProtocolTimestamp.fromSeconds(1546546544),
      },
    ],
  },
});

export const PaymentWithDeliveryDate = createExample(TestedComponent, {
  transaction: {
    ...exampleData.payment,
    amountRaw: "KUDOS:12",
    info: {
      ...exampleData.payment.info,
      delivery_date: {
        t_s: new Date().getTime() / 1000,
      },
    },
  },
});

export const PaymentWithDeliveryAddr = createExample(TestedComponent, {
  transaction: {
    ...exampleData.payment,
    amountRaw: "KUDOS:12",
    info: {
      ...exampleData.payment.info,
      delivery_location: {
        country: "Argentina",
        street: "Elm Street",
        district: "CABA",
        post_code: "1101",
      },
    },
  },
});

export const PaymentWithDeliveryFull = createExample(TestedComponent, {
  transaction: {
    ...exampleData.payment,
    amountRaw: "KUDOS:12",
    info: {
      ...exampleData.payment.info,
      delivery_date: {
        t_s: new Date().getTime() / 1000,
      },
      delivery_location: {
        country: "Argentina",
        street: "Elm Street",
        district: "CABA",
        post_code: "1101",
      },
    },
  },
});

export const PaymentWithRefundPending = createExample(TestedComponent, {
  transaction: {
    ...exampleData.payment,
    amountRaw: "KUDOS:12",
    refundPending: "KUDOS:3",
    totalRefundEffective: "KUDOS:1",
    totalRefundRaw: "KUDOS:1",
  },
});

export const PaymentWithFeeAndRefund = createExample(TestedComponent, {
  transaction: {
    ...exampleData.payment,
    amountRaw: "KUDOS:11",
    totalRefundEffective: "KUDOS:1",
    totalRefundRaw: "KUDOS:1",
  },
});

export const PaymentWithFeeAndRefundFee = createExample(TestedComponent, {
  transaction: {
    ...exampleData.payment,
    amountRaw: "KUDOS:11",
    totalRefundEffective: "KUDOS:1",
    totalRefundRaw: "KUDOS:2",
  },
});

export const PaymentWithoutFee = createExample(TestedComponent, {
  transaction: {
    ...exampleData.payment,
    amountRaw: "KUDOS:12",
  },
});

export const PaymentPending = createExample(TestedComponent, {
  transaction: { ...exampleData.payment, pending: true },
});

import beer from "../../static-dev/beer.png";

export const PaymentWithProducts = createExample(TestedComponent, {
  transaction: {
    ...exampleData.payment,
    info: {
      ...exampleData.payment.info,
      summary: "summary of 5 products",
      products: [
        {
          description: "t-shirt",
          unit: "shirts",
          quantity: 1,
        },
        {
          description: "t-shirt",
          unit: "shirts",
          quantity: 1,
        },
        {
          description: "e-book",
        },
        {
          description: "beer",
          unit: "pint",
          quantity: 15,
          image: beer,
        },
        {
          description: "beer",
          unit: "pint",
          quantity: 15,
          image: beer,
        },
      ],
    },
  } as TransactionPayment,
});

export const PaymentWithLongSummary = createExample(TestedComponent, {
  transaction: {
    ...exampleData.payment,
    info: {
      ...exampleData.payment.info,
      summary:
        "this is a very long summary that will occupy severals lines, this is a very long summary that will occupy severals lines, this is a very long summary that will occupy severals lines, this is a very long summary that will occupy severals lines, ",
      products: [
        {
          description:
            "an xl sized t-shirt with some drawings on it, color pink",
          unit: "shirts",
          quantity: 1,
        },
        {
          description: "beer",
          unit: "pint",
          quantity: 15,
        },
      ],
    },
  } as TransactionPayment,
});

export const Deposit = createExample(TestedComponent, {
  transaction: exampleData.deposit,
});
export const DepositTalerBank = createExample(TestedComponent, {
  transaction: {
    ...exampleData.deposit,
    targetPaytoUri: "payto://x-taler-bank/bank.demo.taler.net/Exchange",
  },
});
export const DepositBitcoin = createExample(TestedComponent, {
  transaction: {
    ...exampleData.deposit,
    amountRaw: "BITCOINBTC:0.0000011",
    amountEffective: "BITCOINBTC:0.00000092",
    targetPaytoUri:
      "payto://bitcoin/bcrt1q6ps8qs6v8tkqrnru4xqqqa6rfwcx5ufpdfqht4?amount=BTC:0.1&subject=0ZSX8SH0M30KHX8K3Y1DAMVGDQV82XEF9DG1HC4QMQ3QWYT4AF00",
  },
});
export const DepositIBAN = createExample(TestedComponent, {
  transaction: {
    ...exampleData.deposit,
    targetPaytoUri: "payto://iban/ES8877998399652238",
  },
});

export const DepositError = createExample(TestedComponent, {
  transaction: {
    ...exampleData.deposit,
    error: transactionError,
  },
});

export const DepositPending = createExample(TestedComponent, {
  transaction: { ...exampleData.deposit, pending: true },
});

export const Refresh = createExample(TestedComponent, {
  transaction: exampleData.refresh,
});

export const RefreshError = createExample(TestedComponent, {
  transaction: {
    ...exampleData.refresh,
    error: transactionError,
  },
});

export const Tip = createExample(TestedComponent, {
  transaction: exampleData.tip,
});

export const TipError = createExample(TestedComponent, {
  transaction: {
    ...exampleData.tip,
    error: transactionError,
  },
});

export const TipPending = createExample(TestedComponent, {
  transaction: { ...exampleData.tip, pending: true },
});

export const Refund = createExample(TestedComponent, {
  transaction: exampleData.refund,
});

export const RefundError = createExample(TestedComponent, {
  transaction: {
    ...exampleData.refund,
    error: transactionError,
  },
});

export const RefundPending = createExample(TestedComponent, {
  transaction: { ...exampleData.refund, pending: true },
});
