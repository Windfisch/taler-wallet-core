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

import { SelectFieldHandler, TextFieldHandler, useComponentState } from "./CreateManualWithdraw.js";
import { expect } from "chai";
import { mountHook } from "../test-utils.js";


const exchangeListWithARSandUSD = {
  "url1": "USD",
  "url2": "ARS",
  "url3": "ARS",
};

const exchangeListEmpty = {
};

describe("CreateManualWithdraw states", () => {
  it("should set noExchangeFound when exchange list is empty", () => {
    const { result } = mountHook(() =>
      useComponentState(exchangeListEmpty, undefined, undefined),
    );

    if (!result.current) {
      expect.fail("hook didn't render");
    }

    expect(result.current.noExchangeFound).equal(true)
  });

  it("should set noExchangeFound when exchange list doesn't include selected currency", () => {
    const { result } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "COL"),
    );

    if (!result.current) {
      expect.fail("hook didn't render");
    }

    expect(result.current.noExchangeFound).equal(true)
  });


  it("should select the first exchange from the list", () => {
    const { result } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, undefined),
    );

    if (!result.current) {
      expect.fail("hook didn't render");
    }

    expect(result.current.exchange.value).equal("url1")
  });

  it("should select the first exchange with the selected currency", () => {
    const { result } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    if (!result.current) {
      expect.fail("hook didn't render");
    }

    expect(result.current.exchange.value).equal("url2")
  });

  it("should change the exchange when currency change", async () => {
    const { result, waitNextUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    if (!result.current) {
      expect.fail("hook didn't render");
    }

    expect(result.current.exchange.value).equal("url2")

    result.current.currency.onChange("USD")

    await waitNextUpdate()

    expect(result.current.exchange.value).equal("url1")

  });

  it("should change the currency when exchange change", async () => {
    const { result, waitNextUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    if (!result.current) {
      expect.fail("hook didn't render");
    }

    expect(result.current.exchange.value).equal("url2")
    expect(result.current.currency.value).equal("ARS")

    result.current.exchange.onChange("url1")

    await waitNextUpdate()

    expect(result.current.exchange.value).equal("url1")
    expect(result.current.currency.value).equal("USD")
  });

  it("should update parsed amount when amount change", async () => {
    const { result, waitNextUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    if (!result.current) {
      expect.fail("hook didn't render");
    }

    expect(result.current.parsedAmount).equal(undefined)

    result.current.amount.onInput("12")

    await waitNextUpdate()

    expect(result.current.parsedAmount).deep.equals({
      value: 12, fraction: 0, currency: "ARS"
    })
  });

  it("should have an amount field", async () => {
    const { result, waitNextUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    if (!result.current) {
      expect.fail("hook didn't render");
    }

    await defaultTestForInputText(waitNextUpdate, () => result.current!.amount)
  })

  it("should have an exchange selector ", async () => {
    const { result, waitNextUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    if (!result.current) {
      expect.fail("hook didn't render");
    }

    await defaultTestForInputSelect(waitNextUpdate, () => result.current!.exchange)
  })

  it("should have a currency selector ", async () => {
    const { result, waitNextUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    if (!result.current) {
      expect.fail("hook didn't render");
    }

    await defaultTestForInputSelect(waitNextUpdate, () => result.current!.currency)
  })

});


async function defaultTestForInputText(awaiter: () => Promise<void>, getField: () => TextFieldHandler) {
  const initialValue = getField().value;
  const otherValue = `${initialValue} something else`
  getField().onInput(otherValue)

  await awaiter()

  expect(getField().value).equal(otherValue)
}


async function defaultTestForInputSelect(awaiter: () => Promise<void>, getField: () => SelectFieldHandler) {
  const initialValue = getField().value;
  const keys = Object.keys(getField().list)
  const nextIdx = keys.indexOf(initialValue) + 1
  if (keys.length < nextIdx) {
    throw new Error('no enough values')
  }
  const nextValue = keys[nextIdx]
  getField().onChange(nextValue)

  await awaiter()

  expect(getField().value).equal(nextValue)
}
