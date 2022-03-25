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

import { useComponentState } from "./DepositPage";
import { expect } from "chai";
import { mountHook } from "../test-utils";
import { Amounts, Balance } from "@gnu-taler/taler-util";


const currency = "EUR"
const feeCalculator = async () => ({
  coin: Amounts.parseOrThrow(`${currency}:1`),
  wire: Amounts.parseOrThrow(`${currency}:1`),
  refresh: Amounts.parseOrThrow(`${currency}:1`)
})

const someBalance = [{
  available: 'EUR:10'
} as Balance]

describe("DepositPage states", () => {
  it("should have status 'no-balance' when balance is empty", () => {
    const { result } = mountHook(() =>
      useComponentState(currency, [], [], feeCalculator),
    );

    if (!result.current) {
      expect.fail("hook didn't render");
    }

    expect(result.current.status).equal("no-balance")
  });

  it("should have status 'no-accounts' when balance is not empty and accounts is empty", () => {
    const { result } = mountHook(() =>
      useComponentState(currency, [], someBalance, feeCalculator),
    );

    if (!result.current) {
      expect.fail("hook didn't render");
    }

    expect(result.current.status).equal("no-accounts")
  });
});