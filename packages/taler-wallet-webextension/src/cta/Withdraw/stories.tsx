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

import { ExchangeListItem } from "@gnu-taler/taler-util";
import { createExample } from "../../test-utils.js";
// import { TermsState } from "../../utils/index.js";
import { SuccessView } from "./views.js";

export default {
  title: "cta/withdraw",
};

const exchangeList = {
  "exchange.demo.taler.net": "http://exchange.demo.taler.net (USD)",
  "exchange.test.taler.net": "http://exchange.test.taler.net (KUDOS)",
};

const nullHandler = {
  onClick: async (): Promise<void> => {
    null;
  },
};

// const normalTosState = {
//   terms: {
//     status: "accepted",
//     version: "",
//   } as TermsState,
//   onAccept: () => null,
//   onReview: () => null,
//   reviewed: false,
//   reviewing: false,
// };

const ageRestrictionOptions: Record<string, string> = "6:12:18"
  .split(":")
  .reduce((p, c) => ({ ...p, [c]: `under ${c}` }), {});

ageRestrictionOptions["0"] = "Not restricted";

const ageRestrictionSelectField = {
  list: ageRestrictionOptions,
  value: "0",
};

export const TermsOfServiceNotYetLoaded = createExample(SuccessView, {
  error: undefined,
  status: "success",
  chosenAmount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },
  doWithdrawal: nullHandler,
  currentExchange: {
    exchangeBaseUrl: "https://exchange.demo.taler.net",
    tos: {},
  } as Partial<ExchangeListItem> as any,
  withdrawalFee: {
    currency: "USD",
    fraction: 10000000,
    value: 1,
  },
  doSelectExchange: {},
  toBeReceived: {
    currency: "USD",
    fraction: 0,
    value: 1,
  },
});

export const WithSomeFee = createExample(SuccessView, {
  error: undefined,
  status: "success",
  chosenAmount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },
  doWithdrawal: nullHandler,
  currentExchange: {
    exchangeBaseUrl: "https://exchange.demo.taler.net",
    tos: {},
  } as Partial<ExchangeListItem> as any,
  withdrawalFee: {
    currency: "USD",
    fraction: 10000000,
    value: 1,
  },
  toBeReceived: {
    currency: "USD",
    fraction: 0,
    value: 1,
  },
  doSelectExchange: {},
});

export const WithoutFee = createExample(SuccessView, {
  error: undefined,
  status: "success",
  chosenAmount: {
    currency: "USD",
    value: 2,
    fraction: 0,
  },
  doWithdrawal: nullHandler,
  currentExchange: {
    exchangeBaseUrl: "https://exchange.demo.taler.net",
    tos: {},
  } as Partial<ExchangeListItem> as any,
  withdrawalFee: {
    currency: "USD",
    fraction: 0,
    value: 0,
  },
  doSelectExchange: {},
  toBeReceived: {
    currency: "USD",
    fraction: 0,
    value: 2,
  },
});

export const EditExchangeUntouched = createExample(SuccessView, {
  error: undefined,
  status: "success",
  chosenAmount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },
  doWithdrawal: nullHandler,
  currentExchange: {
    exchangeBaseUrl: "https://exchange.demo.taler.net",
    tos: {},
  } as Partial<ExchangeListItem> as any,
  withdrawalFee: {
    currency: "USD",
    fraction: 0,
    value: 0,
  },
  doSelectExchange: {},
  toBeReceived: {
    currency: "USD",
    fraction: 0,
    value: 2,
  },
});

export const EditExchangeModified = createExample(SuccessView, {
  error: undefined,
  status: "success",
  chosenAmount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },
  doWithdrawal: nullHandler,
  currentExchange: {
    exchangeBaseUrl: "https://exchange.demo.taler.net",
    tos: {},
  } as Partial<ExchangeListItem> as any,
  withdrawalFee: {
    currency: "USD",
    fraction: 0,
    value: 0,
  },
  doSelectExchange: {},
  toBeReceived: {
    currency: "USD",
    fraction: 0,
    value: 2,
  },
});

export const WithAgeRestriction = createExample(SuccessView, {
  error: undefined,
  status: "success",
  ageRestriction: ageRestrictionSelectField,
  chosenAmount: {
    currency: "USD",
    value: 2,
    fraction: 10000000,
  },
  doSelectExchange: {},
  doWithdrawal: nullHandler,
  currentExchange: {
    exchangeBaseUrl: "https://exchange.demo.taler.net",
    tos: {},
  } as Partial<ExchangeListItem> as any,
  withdrawalFee: {
    currency: "USD",
    fraction: 0,
    value: 0,
  },
  toBeReceived: {
    currency: "USD",
    fraction: 0,
    value: 2,
  },
});
