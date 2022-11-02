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

import { Amounts, DepositGroupFees } from "@gnu-taler/taler-util";
import { createExample } from "../../test-utils.js";
import { labelForAccountType } from "./state.js";
import { ReadyView } from "./views.js";

export default {
  title: "wallet/deposit",
};

// const ac = parsePaytoUri("payto://iban/ES8877998399652238")!;
// const accountMap = createLabelsForBankAccount([ac]);

export const WithNoAccountForIBAN = createExample(ReadyView, {
  status: "ready",
  account: {
    list: {},
    value: "",
    onChange: async () => {
      null;
    },
  },
  currentAccount: {
    isKnown: true,
    targetType: "iban",
    iban: "ABCD1234",
    params: {},
    targetPath: "/ABCD1234",
  },
  currency: "USD",
  amount: {
    onInput: async () => {
      null;
    },
    value: "10:USD",
  },
  onAddAccount: {},
  cancelHandler: {},
  depositHandler: {
    onClick: async () => {
      return;
    },
  },
  totalFee: Amounts.zeroOfCurrency("USD"),
  totalToDeposit: Amounts.parseOrThrow("USD:10"),
  // onCalculateFee: alwaysReturnFeeToOne,
});

export const WithIBANAccountTypeSelected = createExample(ReadyView, {
  status: "ready",
  account: {
    list: { asdlkajsdlk: "asdlkajsdlk", qwerqwer: "qwerqwer" },
    value: "asdlkajsdlk",
    onChange: async () => {
      null;
    },
  },
  currentAccount: {
    isKnown: true,
    targetType: "iban",
    iban: "ABCD1234",
    params: {},
    targetPath: "/ABCD1234",
  },
  currency: "USD",
  amount: {
    onInput: async () => {
      null;
    },
    value: "10:USD",
  },
  onAddAccount: {},
  cancelHandler: {},
  depositHandler: {
    onClick: async () => {
      return;
    },
  },
  totalFee: Amounts.zeroOfCurrency("USD"),
  totalToDeposit: Amounts.parseOrThrow("USD:10"),
  // onCalculateFee: alwaysReturnFeeToOne,
});

export const NewBitcoinAccountTypeSelected = createExample(ReadyView, {
  status: "ready",
  account: {
    list: {},
    value: "asdlkajsdlk",
    onChange: async () => {
      null;
    },
  },
  currentAccount: {
    isKnown: true,
    targetType: "iban",
    iban: "ABCD1234",
    params: {},
    targetPath: "/ABCD1234",
  },
  onAddAccount: {},
  currency: "USD",
  amount: {
    onInput: async () => {
      null;
    },
    value: "10:USD",
  },
  cancelHandler: {},
  depositHandler: {
    onClick: async () => {
      return;
    },
  },
  totalFee: Amounts.zeroOfCurrency("USD"),
  totalToDeposit: Amounts.parseOrThrow("USD:10"),
  // onCalculateFee: alwaysReturnFeeToOne,
});
