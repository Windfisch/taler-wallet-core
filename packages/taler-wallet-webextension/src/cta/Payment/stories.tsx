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
  Amounts,
  ConfirmPayResultType,
  ContractTerms,
  PreparePayResultType,
} from "@gnu-taler/taler-util";
import merchantIcon from "../../../static-dev/merchant-icon.jpeg";
import { createExample } from "../../test-utils.js";
import { BaseView } from "./views.js";
import beer from "../../../static-dev/beer.png";

export default {
  title: "cta/payment",
  component: BaseView,
  argTypes: {},
};

export const NoBalance = createExample(BaseView, {
  status: "no-balance-for-currency",
  error: undefined,
  amount: Amounts.parseOrThrow("USD:10"),
  balance: undefined,

  uri: "",
  payStatus: {
    status: PreparePayResultType.InsufficientBalance,
    noncePriv: "",
    proposalId: "96YY92RQZGF3V7TJSPN4SF9549QX7BRF88Q5PYFCSBNQ0YK4RPK0",
    contractTerms: {
      merchant: {
        name: "the merchant",
        logo: merchantIcon,
        website: "https://www.themerchant.taler",
        email: "contact@merchant.taler",
      },
      summary: "some beers",
      amount: "USD:10",
    } as Partial<ContractTerms> as any,
    amountRaw: "USD:10",
  },
});

export const NoEnoughBalance = createExample(BaseView, {
  status: "no-enough-balance",
  error: undefined,
  amount: Amounts.parseOrThrow("USD:10"),
  balance: {
    currency: "USD",
    fraction: 40000000,
    value: 9,
  },

  uri: "",
  payStatus: {
    status: PreparePayResultType.InsufficientBalance,
    noncePriv: "",
    proposalId: "96YY92RQZGF3V7TJSPN4SF9549QX7BRF88Q5PYFCSBNQ0YK4RPK0",
    contractTerms: {
      merchant: {
        name: "the merchant",
        logo: merchantIcon,
        website: "https://www.themerchant.taler",
        email: "contact@merchant.taler",
      },
      summary: "some beers",
      amount: "USD:10",
    } as Partial<ContractTerms> as any,
    amountRaw: "USD:10",
  },
});

export const EnoughBalanceButRestricted = createExample(BaseView, {
  status: "no-enough-balance",
  error: undefined,
  amount: Amounts.parseOrThrow("USD:10"),
  balance: {
    currency: "USD",
    fraction: 40000000,
    value: 19,
  },

  uri: "",
  payStatus: {
    status: PreparePayResultType.InsufficientBalance,
    noncePriv: "",
    proposalId: "96YY92RQZGF3V7TJSPN4SF9549QX7BRF88Q5PYFCSBNQ0YK4RPK0",
    contractTerms: {
      merchant: {
        name: "the merchant",
        logo: merchantIcon,
        website: "https://www.themerchant.taler",
        email: "contact@merchant.taler",
      },
      summary: "some beers",
      amount: "USD:10",
    } as Partial<ContractTerms> as any,
    amountRaw: "USD:10",
  },
});

export const PaymentPossible = createExample(BaseView, {
  status: "ready",
  error: undefined,
  amount: Amounts.parseOrThrow("USD:10"),
  balance: {
    currency: "USD",
    fraction: 40000000,
    value: 11,
  },
  payHandler: {
    onClick: async () => {
      null;
    },
  },

  uri: "taler://pay/merchant-backend.taler/2021.242-01G2X4275RBWG/?c=66BE594PDZR24744J6EQK52XM0",
  payStatus: {
    status: PreparePayResultType.PaymentPossible,
    amountEffective: "USD:10",
    amountRaw: "USD:10",
    noncePriv: "",
    contractTerms: {
      nonce: "123213123",
      merchant: {
        name: "the merchant",
        logo: merchantIcon,
        website: "https://www.themerchant.taler",
        email: "contact@merchant.taler",
      },
      pay_deadline: {
        t_s: new Date().getTime() / 1000 + 60 * 60 * 3,
      },
      amount: "USD:10",
      summary: "some beers",
    } as Partial<ContractTerms> as any,
    contractTermsHash: "123456",
    proposalId: "96YY92RQZGF3V7TJSPN4SF9549QX7BRF88Q5PYFCSBNQ0YK4RPK0",
  },
});

export const PaymentPossibleWithFee = createExample(BaseView, {
  status: "ready",
  error: undefined,
  amount: Amounts.parseOrThrow("USD:10"),
  balance: {
    currency: "USD",
    fraction: 40000000,
    value: 11,
  },
  payHandler: {
    onClick: async () => {
      null;
    },
  },

  uri: "taler://pay/merchant-backend.taler/2021.242-01G2X4275RBWG/?c=66BE594PDZR24744J6EQK52XM0",
  payStatus: {
    status: PreparePayResultType.PaymentPossible,
    amountEffective: "USD:10.20",
    amountRaw: "USD:10",
    noncePriv: "",
    contractTerms: {
      nonce: "123213123",
      merchant: {
        name: "the merchant",
        logo: merchantIcon,
        website: "https://www.themerchant.taler",
        email: "contact@merchant.taler",
      },
      amount: "USD:10",
      summary: "some beers",
    } as Partial<ContractTerms> as any,
    contractTermsHash: "123456",
    proposalId: "96YY92RQZGF3V7TJSPN4SF9549QX7BRF88Q5PYFCSBNQ0YK4RPK0",
  },
});

export const TicketWithAProductList = createExample(BaseView, {
  status: "ready",
  error: undefined,
  amount: Amounts.parseOrThrow("USD:10"),
  balance: {
    currency: "USD",
    fraction: 40000000,
    value: 11,
  },
  payHandler: {
    onClick: async () => {
      null;
    },
  },

  uri: "taler://pay/merchant-backend.taler/2021.242-01G2X4275RBWG/?c=66BE594PDZR24744J6EQK52XM0",
  payStatus: {
    status: PreparePayResultType.PaymentPossible,
    amountEffective: "USD:10.20",
    amountRaw: "USD:10",
    noncePriv: "",
    contractTerms: {
      nonce: "123213123",
      merchant: {
        name: "the merchant",
        logo: merchantIcon,
        website: "https://www.themerchant.taler",
        email: "contact@merchant.taler",
      },
      amount: "USD:10",
      summary: "some beers",
      products: [
        {
          description: "ten beers",
          price: "USD:1",
          quantity: 10,
          image: beer,
        },
        {
          description: "beer without image",
          price: "USD:1",
          quantity: 10,
        },
        {
          description: "one brown beer",
          price: "USD:2",
          quantity: 1,
          image: beer,
        },
      ],
    } as Partial<ContractTerms> as any,
    contractTermsHash: "123456",
    proposalId: "96YY92RQZGF3V7TJSPN4SF9549QX7BRF88Q5PYFCSBNQ0YK4RPK0",
  },
});

export const TicketWithShipping = createExample(BaseView, {
  status: "ready",
  error: undefined,
  amount: Amounts.parseOrThrow("USD:10"),
  balance: {
    currency: "USD",
    fraction: 40000000,
    value: 11,
  },
  payHandler: {
    onClick: async () => {
      null;
    },
  },

  uri: "taler://pay/merchant-backend.taler/2021.242-01G2X4275RBWG/?c=66BE594PDZR24744J6EQK52XM0",
  payStatus: {
    status: PreparePayResultType.PaymentPossible,
    amountEffective: "USD:10.20",
    amountRaw: "USD:10",
    noncePriv: "",
    contractTerms: {
      nonce: "123213123",
      merchant: {
        name: "the merchant",
        logo: merchantIcon,
        website: "https://www.themerchant.taler",
        email: "contact@merchant.taler",
      },
      amount: "USD:10",
      summary: "banana pi set",
      products: [
        {
          description: "banana pi",
          price: "USD:2",
          quantity: 1,
        },
      ],
      delivery_date: {
        t_s: new Date().getTime() / 1000 + 30 * 24 * 60 * 60,
      },
      delivery_location: {
        town: "Liverpool",
        street: "Down st 1234",
      },
    } as Partial<ContractTerms> as any,
    contractTermsHash: "123456",
    proposalId: "96YY92RQZGF3V7TJSPN4SF9549QX7BRF88Q5PYFCSBNQ0YK4RPK0",
  },
});

export const AlreadyConfirmedByOther = createExample(BaseView, {
  status: "confirmed",
  error: undefined,
  amount: Amounts.parseOrThrow("USD:10"),
  balance: {
    currency: "USD",
    fraction: 40000000,
    value: 11,
  },

  uri: "taler://pay/merchant-backend.taler/2021.242-01G2X4275RBWG/?c=66BE594PDZR24744J6EQK52XM0",
  payStatus: {
    status: PreparePayResultType.AlreadyConfirmed,
    amountEffective: "USD:10",
    amountRaw: "USD:10",
    contractTerms: {
      merchant: {
        name: "the merchant",
        logo: merchantIcon,
        website: "https://www.themerchant.taler",
        email: "contact@merchant.taler",
      },
      summary: "some beers",
      amount: "USD:10",
    } as Partial<ContractTerms> as any,
    contractTermsHash: "123456",
    proposalId: "96YY92RQZGF3V7TJSPN4SF9549QX7BRF88Q5PYFCSBNQ0YK4RPK0",
    paid: false,
  },
});
