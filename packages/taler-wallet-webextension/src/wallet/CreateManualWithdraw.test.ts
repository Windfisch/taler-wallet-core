/* eslint-disable @typescript-eslint/no-non-null-assertion */
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

import { expect } from "chai";
import { mountHook } from "../test-utils.js";
import { SelectFieldHandler, TextFieldHandler, useComponentState } from "./CreateManualWithdraw.js";


const exchangeListWithARSandUSD = {
  "url1": "USD",
  "url2": "ARS",
  "url3": "ARS",
};

const exchangeListEmpty = {
};

describe("CreateManualWithdraw states", () => {
  it("should set noExchangeFound when exchange list is empty", () => {
    const { getLastResultOrThrow } = mountHook(() =>
      useComponentState(exchangeListEmpty, undefined, undefined),
    );

    const { noExchangeFound } = getLastResultOrThrow()

    expect(noExchangeFound).equal(true)
  });

  it("should set noExchangeFound when exchange list doesn't include selected currency", () => {
    const { getLastResultOrThrow } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "COL"),
    );

    const { noExchangeFound } = getLastResultOrThrow()

    expect(noExchangeFound).equal(true)
  });


  it("should select the first exchange from the list", () => {
    const { getLastResultOrThrow } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, undefined),
    );

    const { exchange } = getLastResultOrThrow()

    expect(exchange.value).equal("url1")
  });

  it("should select the first exchange with the selected currency", () => {
    const { getLastResultOrThrow } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    const { exchange } = getLastResultOrThrow()

    expect(exchange.value).equal("url2")
  });

  it("should change the exchange when currency change", async () => {
    const { getLastResultOrThrow, waitNextUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );


    {
      const { exchange, currency } = getLastResultOrThrow()

      expect(exchange.value).equal("url2")

      currency.onChange("USD")
    }

    await waitNextUpdate()

    {
      const { exchange } = getLastResultOrThrow()
      expect(exchange.value).equal("url1")
    }

  });

  it("should change the currency when exchange change", async () => {
    const { getLastResultOrThrow, waitNextUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    {
      const { exchange, currency } = getLastResultOrThrow()

      expect(exchange.value).equal("url2")
      expect(currency.value).equal("ARS")

      exchange.onChange("url1")
    }

    await waitNextUpdate()

    {
      const { exchange, currency } = getLastResultOrThrow()

      expect(exchange.value).equal("url1")
      expect(currency.value).equal("USD")
    }
  });

  it("should update parsed amount when amount change", async () => {
    const { getLastResultOrThrow, waitNextUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    {
      const { amount, parsedAmount } = getLastResultOrThrow()

      expect(parsedAmount).equal(undefined)

      amount.onInput("12")
    }

    await waitNextUpdate()

    {
      const { parsedAmount } = getLastResultOrThrow()

      expect(parsedAmount).deep.equals({
        value: 12, fraction: 0, currency: "ARS"
      })
    }
  });

  it("should have an amount field", async () => {
    const { getLastResultOrThrow, waitNextUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    await defaultTestForInputText(waitNextUpdate, () => getLastResultOrThrow().amount)
  })

  it("should have an exchange selector ", async () => {
    const { getLastResultOrThrow, waitNextUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    await defaultTestForInputSelect(waitNextUpdate, () => getLastResultOrThrow().exchange)
  })

  it("should have a currency selector ", async () => {
    const { getLastResultOrThrow, waitNextUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    await defaultTestForInputSelect(waitNextUpdate, () => getLastResultOrThrow().currency)
  })

});


async function defaultTestForInputText(awaiter: () => Promise<void>, getField: () => TextFieldHandler): Promise<void> {
  let nextValue = ''
  {
    const field = getField()
    const initialValue = field.value;
    nextValue = `${initialValue} something else`
    field.onInput(nextValue)
  }

  await awaiter()

  {
    const field = getField()
    expect(field.value).equal(nextValue)
  }
}


async function defaultTestForInputSelect(awaiter: () => Promise<void>, getField: () => SelectFieldHandler): Promise<void> {
  let nextValue = ''

  {
    const field = getField();
    const initialValue = field.value;
    const keys = Object.keys(field.list)
    const nextIdx = keys.indexOf(initialValue) + 1
    if (keys.length < nextIdx) {
      throw new Error('no enough values')
    }
    nextValue = keys[nextIdx]
    field.onChange(nextValue)
  }

  await awaiter()

  {
    const field = getField();

    expect(field.value).equal(nextValue)
  }
}
