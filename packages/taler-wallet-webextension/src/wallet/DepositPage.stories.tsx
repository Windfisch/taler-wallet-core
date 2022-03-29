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

import { Amounts, Balance, parsePaytoUri } from "@gnu-taler/taler-util";
import { DepositFee } from "@gnu-taler/taler-wallet-core/src/operations/deposits";
import { createExample } from "../test-utils.js";
import { View as TestedComponent } from "./DepositPage.js";

export default {
  title: "wallet/deposit",
  component: TestedComponent,
  argTypes: {},
};

async function alwaysReturnFeeToOne(): Promise<DepositFee> {
  const fee = {
    currency: "EUR",
    value: 1,
    fraction: 0,
  };
  return { coin: fee, refresh: fee, wire: fee };
}

export const WithEmptyAccountList = createExample(TestedComponent, {
  accounts: [],
  balances: [
    {
      available: "USD:10",
    } as Balance,
  ],
  onCalculateFee: alwaysReturnFeeToOne,
});

export const WithSomeBankAccounts = createExample(TestedComponent, {
  accounts: [parsePaytoUri("payto://iban/ES8877998399652238")!],
  balances: [
    {
      available: "USD:10",
    } as Balance,
  ],
  onCalculateFee: alwaysReturnFeeToOne,
});
