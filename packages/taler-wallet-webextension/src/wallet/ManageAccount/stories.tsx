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

import { createExample } from "../../test-utils.js";
import { ReadyView } from "./views.js";

export default {
  title: "wallet/manage account",
};

const nullFunction = async () => {
  null;
};

export const JustTwoBitcoinAccounts = createExample(ReadyView, {
  status: "ready",
  currency: "ARS",
  accountType: {
    list: {
      "": "Choose one account type",
      iban: "IBAN",
      // bitcoin: "Bitcoin",
      // "x-taler-bank": "Taler Bank",
    },
    value: "",
  },
  alias: {
    value: "",
    onInput: nullFunction,
  },
  uri: {
    value: "",
    onInput: nullFunction,
  },
  accountByType: {
    iban: [],
    "x-taler-bank": [],
    bitcoin: [
      {
        alias: "my bitcoin addr",
        currency: "BTC",
        kyc_completed: false,
        uri: {
          targetType: "bitcoin",
          segwitAddrs: [],
          isKnown: true,
          targetPath: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          params: {},
        },
      },
      {
        alias: "my other addr",
        currency: "BTC",
        kyc_completed: true,
        uri: {
          targetType: "bitcoin",
          segwitAddrs: [],
          isKnown: true,
          targetPath: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          params: {},
        },
      },
    ],
  },
  onAccountAdded: {},
  onCancel: {},
});

export const WithAllTypeOfAccounts = createExample(ReadyView, {
  status: "ready",
  currency: "ARS",
  accountType: {
    list: {
      "": "Choose one account type",
      iban: "IBAN",
      // bitcoin: "Bitcoin",
      // "x-taler-bank": "Taler Bank",
    },
    value: "",
  },
  alias: {
    value: "",
    onInput: nullFunction,
  },
  uri: {
    value: "",
    onInput: nullFunction,
  },
  accountByType: {
    iban: [
      {
        alias: "my bank",
        currency: "ARS",
        kyc_completed: true,
        uri: {
          targetType: "iban",
          iban: "ASDQWEQWE",
          isKnown: true,
          targetPath: "/ASDQWEQWE",
          params: {},
        },
      },
    ],
    "x-taler-bank": [
      {
        alias: "my xtaler bank",
        currency: "ARS",
        kyc_completed: true,
        uri: {
          targetType: "x-taler-bank",
          host: "localhost",
          account: "123",
          isKnown: true,
          targetPath: "localhost/123",
          params: {},
        },
      },
    ],
    bitcoin: [
      {
        alias: "my bitcoin addr",
        currency: "BTC",
        kyc_completed: false,
        uri: {
          targetType: "bitcoin",
          segwitAddrs: [],
          isKnown: true,
          targetPath: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          params: {},
        },
      },
      {
        alias: "my other addr",
        currency: "BTC",
        kyc_completed: true,
        uri: {
          targetType: "bitcoin",
          segwitAddrs: [],
          isKnown: true,
          targetPath: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          params: {},
        },
      },
    ],
  },
  onAccountAdded: {},
  onCancel: {},
});

export const AddingIbanAccount = createExample(ReadyView, {
  status: "ready",
  currency: "ARS",
  accountType: {
    list: {
      "": "Choose one account type",
      iban: "IBAN",
      // bitcoin: "Bitcoin",
      // "x-taler-bank": "Taler Bank",
    },
    value: "iban",
  },
  alias: {
    value: "",
    onInput: nullFunction,
  },
  uri: {
    value: "",
    onInput: nullFunction,
  },
  accountByType: {
    iban: [
      {
        alias: "my bank",
        currency: "ARS",
        kyc_completed: true,
        uri: {
          targetType: "iban",
          iban: "ASDQWEQWE",
          isKnown: true,
          targetPath: "/ASDQWEQWE",
          params: {},
        },
      },
    ],
    "x-taler-bank": [],
    bitcoin: [],
  },
  onAccountAdded: {},
  onCancel: {},
});
