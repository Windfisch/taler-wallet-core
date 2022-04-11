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

import { createExample } from "../test-utils.js";
import { TermsState } from "../utils/index.js";
import { View as TestedComponent } from "./Withdraw.js";

export default {
  title: "cta/withdraw",
  component: TestedComponent,
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

const normalTosState = {
  terms: {
    status: "accepted",
    version: "",
  } as TermsState,
  onAccept: () => null,
  onReview: () => null,
  reviewed: false,
  reviewing: false,
};

export const TermsOfServiceNotYetLoaded = createExample(TestedComponent, {
  state: {
    hook: undefined,
    status: "success",
    cancelEditExchange: nullHandler,
    confirmEditExchange: nullHandler,
    chosenAmount: {
      currency: "USD",
      value: 2,
      fraction: 10000000,
    },
    doWithdrawal: nullHandler,
    editExchange: nullHandler,
    exchange: {
      list: exchangeList,
      value: "exchange.demo.taler.net",
      onChange: () => null,
    },
    showExchangeSelection: false,
    mustAcceptFirst: false,
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
  },
});

export const WithSomeFee = createExample(TestedComponent, {
  state: {
    hook: undefined,
    status: "success",
    cancelEditExchange: nullHandler,
    confirmEditExchange: nullHandler,
    chosenAmount: {
      currency: "USD",
      value: 2,
      fraction: 10000000,
    },
    doWithdrawal: nullHandler,
    editExchange: nullHandler,
    exchange: {
      list: exchangeList,
      value: "exchange.demo.taler.net",
      onChange: () => null,
    },
    showExchangeSelection: false,
    mustAcceptFirst: false,
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
    tosProps: normalTosState,
  },
});

export const WithoutFee = createExample(TestedComponent, {
  state: {
    hook: undefined,
    status: "success",
    cancelEditExchange: nullHandler,
    confirmEditExchange: nullHandler,
    chosenAmount: {
      currency: "USD",
      value: 2,
      fraction: 10000000,
    },
    doWithdrawal: nullHandler,
    editExchange: nullHandler,
    exchange: {
      list: exchangeList,
      value: "exchange.demo.taler.net",
      onChange: () => null,
    },
    showExchangeSelection: false,
    mustAcceptFirst: false,
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
    tosProps: normalTosState,
  },
});

export const EditExchangeUntouched = createExample(TestedComponent, {
  state: {
    hook: undefined,
    status: "success",
    cancelEditExchange: nullHandler,
    confirmEditExchange: nullHandler,
    chosenAmount: {
      currency: "USD",
      value: 2,
      fraction: 10000000,
    },
    doWithdrawal: nullHandler,
    editExchange: nullHandler,
    exchange: {
      list: exchangeList,
      value: "exchange.demo.taler.net",
      onChange: () => null,
    },
    showExchangeSelection: true,
    mustAcceptFirst: false,
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
    tosProps: normalTosState,
  },
});

export const EditExchangeModified = createExample(TestedComponent, {
  state: {
    hook: undefined,
    status: "success",
    cancelEditExchange: nullHandler,
    confirmEditExchange: nullHandler,
    chosenAmount: {
      currency: "USD",
      value: 2,
      fraction: 10000000,
    },
    doWithdrawal: nullHandler,
    editExchange: nullHandler,
    exchange: {
      list: exchangeList,
      isDirty: true,
      value: "exchange.test.taler.net",
      onChange: () => null,
    },
    showExchangeSelection: true,
    mustAcceptFirst: false,
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
    tosProps: normalTosState,
  },
});
