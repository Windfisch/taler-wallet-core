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

import {
  amountFractionalBase,
  amountFractionalLength,
  AmountJson,
  amountMaxValue,
  Amounts,
  Result,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AmountFieldHandler } from "../mui/handlers.js";
import { TextField } from "../mui/TextField.js";

const HIGH_DENOM_SYMBOL = ["", "K", "M", "G", "T", "P"];
const LOW_DENOM_SYMBOL = ["", "m", "mm", "n", "p", "f"];

export function AmountField({
  label,
  handler,
  lowestDenom = 1,
  highestDenom = 1,
  required,
}: {
  label: VNode;
  lowestDenom?: number;
  highestDenom?: number;
  required?: boolean;
  handler: AmountFieldHandler;
}): VNode {
  const [unit, setUnit] = useState(1);
  const [dotAtTheEnd, setDotAtTheEnd] = useState(false);
  const currency = handler.value.currency;

  let hd = Math.floor(Math.log10(highestDenom || 1) / 3);
  let ld = Math.ceil((-1 * Math.log10(lowestDenom || 1)) / 3);

  const currencyLabels: Array<{ name: string; unit: number }> = [
    {
      name: currency,
      unit: 1,
    },
  ];

  while (hd > 0) {
    currencyLabels.push({
      name: `${HIGH_DENOM_SYMBOL[hd]}${currency}`,
      unit: Math.pow(10, hd * 3),
    });
    hd--;
  }
  while (ld > 0) {
    currencyLabels.push({
      name: `${LOW_DENOM_SYMBOL[ld]}${currency}`,
      unit: Math.pow(10, -1 * ld * 3),
    });
    ld--;
  }

  const prev = Amounts.stringifyValue(handler.value);

  function positiveAmount(value: string): string {
    setDotAtTheEnd(value.endsWith("."));
    if (!value) {
      if (handler.onInput) {
        handler.onInput(Amounts.zeroOfCurrency(currency));
      }
      return "";
    }
    try {
      //remove all but last dot
      const parsed = value.replace(/(\.)(?=.*\1)/g, "");
      const real = parseValue(currency, parsed);

      if (!real || real.value < 0) {
        return prev;
      }

      const normal = normalize(real, unit);

      console.log(real, unit, normal);
      if (normal && handler.onInput) {
        handler.onInput(normal);
      }
      return parsed;
    } catch (e) {
      // do nothing
    }
    return prev;
  }

  const normal = denormalize(handler.value, unit) ?? handler.value;

  const textValue = Amounts.stringifyValue(normal) + (dotAtTheEnd ? "." : "");
  return (
    <Fragment>
      <TextField
        label={label}
        type="text"
        min="0"
        inputmode="decimal"
        step="0.1"
        variant="filled"
        error={handler.error}
        required={required}
        startAdornment={
          currencyLabels.length === 1 ? (
            <div
              style={{
                marginTop: 20,
                padding: "5px 12px 8px 12px",
              }}
            >
              {currency}
            </div>
          ) : (
            <select
              disabled={!handler.onInput}
              onChange={(e) => {
                const unit = Number.parseFloat(e.currentTarget.value);
                setUnit(unit);
              }}
              value={String(unit)}
              style={{
                marginTop: 20,
                padding: "5px 12px 8px 12px",
                background: "transparent",
                border: 0,
              }}
            >
              {currencyLabels.map((c) => (
                <option key={c} value={c.unit}>
                  <div>{c.name}</div>
                </option>
              ))}
            </select>
          )
        }
        value={textValue}
        disabled={!handler.onInput}
        onInput={positiveAmount}
      />
    </Fragment>
  );
}

function parseValue(currency: string, s: string): AmountJson | undefined {
  const [intPart, fractPart] = s.split(".");
  const tail = "." + (fractPart || "0");
  if (tail.length > amountFractionalLength + 1) {
    return undefined;
  }
  const value = Number.parseInt(intPart, 10);
  if (Number.isNaN(value) || value > amountMaxValue) {
    return undefined;
  }
  return {
    currency,
    fraction: Math.round(amountFractionalBase * Number.parseFloat(tail)),
    value,
  };
}

function normalize(amount: AmountJson, unit: number): AmountJson | undefined {
  if (unit === 1 || Amounts.isZero(amount)) return amount;
  const result =
    unit < 1
      ? Amounts.divide(amount, 1 / unit)
      : Amounts.mult(amount, unit).amount;
  return result;
}

function denormalize(amount: AmountJson, unit: number): AmountJson | undefined {
  if (unit === 1 || Amounts.isZero(amount)) return amount;
  const result =
    unit < 1
      ? Amounts.mult(amount, 1 / unit).amount
      : Amounts.divide(amount, unit);
  return result;
}
