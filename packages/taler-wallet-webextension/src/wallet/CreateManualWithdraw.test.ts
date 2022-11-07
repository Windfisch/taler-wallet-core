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

import { expect } from "chai";
import { SelectFieldHandler, TextFieldHandler } from "../mui/handlers.js";
import { mountHook } from "../test-utils.js";
import { useComponentState } from "./CreateManualWithdraw.js";

const exchangeListWithARSandUSD = {
  url1: "USD",
  url2: "ARS",
  url3: "ARS",
};

const exchangeListEmpty = {};

describe("CreateManualWithdraw states", () => {
  it("should set noExchangeFound when exchange list is empty", () => {
    const { pullLastResultOrThrow } = mountHook(() =>
      useComponentState(exchangeListEmpty, undefined, undefined),
    );

    const { noExchangeFound } = pullLastResultOrThrow();

    expect(noExchangeFound).equal(true);
  });

  it("should set noExchangeFound when exchange list doesn't include selected currency", () => {
    const { pullLastResultOrThrow } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "COL"),
    );

    const { noExchangeFound } = pullLastResultOrThrow();

    expect(noExchangeFound).equal(true);
  });

  it("should select the first exchange from the list", () => {
    const { pullLastResultOrThrow } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, undefined),
    );

    const { exchange } = pullLastResultOrThrow();

    expect(exchange.value).equal("url1");
  });

  it("should select the first exchange with the selected currency", () => {
    const { pullLastResultOrThrow } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    const { exchange } = pullLastResultOrThrow();

    expect(exchange.value).equal("url2");
  });

  it("should change the exchange when currency change", async () => {
    const { pullLastResultOrThrow, waitForStateUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    {
      const { exchange, currency } = pullLastResultOrThrow();

      expect(exchange.value).equal("url2");
      if (currency.onChange === undefined) expect.fail();
      currency.onChange("USD");
    }

    expect(await waitForStateUpdate()).true;

    {
      const { exchange } = pullLastResultOrThrow();
      expect(exchange.value).equal("url1");
    }
  });

  it("should change the currency when exchange change", async () => {
    const { pullLastResultOrThrow, waitForStateUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    {
      const { exchange, currency } = pullLastResultOrThrow();

      expect(exchange.value).equal("url2");
      expect(currency.value).equal("ARS");

      if (exchange.onChange === undefined) expect.fail();
      exchange.onChange("url1");
    }

    expect(await waitForStateUpdate()).true;

    {
      const { exchange, currency } = pullLastResultOrThrow();

      expect(exchange.value).equal("url1");
      expect(currency.value).equal("USD");
    }
  });

  it("should update parsed amount when amount change", async () => {
    const { pullLastResultOrThrow, waitForStateUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    {
      const { amount, parsedAmount } = pullLastResultOrThrow();

      expect(parsedAmount).equal(undefined);

      expect(amount.onInput).not.undefined;
      if (!amount.onInput) return;
      amount.onInput("12");
    }

    expect(await waitForStateUpdate()).true;

    {
      const { parsedAmount } = pullLastResultOrThrow();

      expect(parsedAmount).deep.equals({
        value: 12,
        fraction: 0,
        currency: "ARS",
      });
    }
  });

  it("should have an amount field", async () => {
    const { pullLastResultOrThrow, waitForStateUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    await defaultTestForInputText(
      waitForStateUpdate,
      () => pullLastResultOrThrow().amount,
    );
  });

  it("should have an exchange selector ", async () => {
    const { pullLastResultOrThrow, waitForStateUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    await defaultTestForInputSelect(
      waitForStateUpdate,
      () => pullLastResultOrThrow().exchange,
    );
  });

  it("should have a currency selector ", async () => {
    const { pullLastResultOrThrow, waitForStateUpdate } = mountHook(() =>
      useComponentState(exchangeListWithARSandUSD, undefined, "ARS"),
    );

    await defaultTestForInputSelect(
      waitForStateUpdate,
      () => pullLastResultOrThrow().currency,
    );
  });
});

async function defaultTestForInputText(
  awaiter: () => Promise<boolean>,
  getField: () => TextFieldHandler,
): Promise<void> {
  let nextValue = "";
  {
    const field = getField();
    const initialValue = field.value;
    nextValue = `${initialValue} something else`;
    expect(field.onInput).not.undefined;
    if (!field.onInput) return;
    field.onInput(nextValue);
  }

  expect(await awaiter()).true;

  {
    const field = getField();
    expect(field.value).equal(nextValue);
  }
}

async function defaultTestForInputSelect(
  awaiter: () => Promise<boolean>,
  getField: () => SelectFieldHandler,
): Promise<void> {
  let nextValue = "";

  {
    const field = getField();
    const initialValue = field.value;
    const keys = Object.keys(field.list);
    const nextIdx = keys.indexOf(initialValue) + 1;
    if (keys.length < nextIdx) {
      throw new Error("no enough values");
    }
    nextValue = keys[nextIdx];
    if (field.onChange === undefined) expect.fail();
    field.onChange(nextValue);
  }

  expect(await awaiter()).true;

  {
    const field = getField();

    expect(field.value).equal(nextValue);
  }
}
