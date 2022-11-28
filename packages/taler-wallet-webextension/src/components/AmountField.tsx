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
  const [decimalPlaces, setDecimalPlaces] = useState<number | undefined>(
    undefined,
  );
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

  const previousValue = Amounts.stringifyValue(handler.value, decimalPlaces);

  const normal = denormalize(handler.value, unit) ?? handler.value;

  let textValue = Amounts.stringifyValue(normal, decimalPlaces);
  if (decimalPlaces === 0) {
    textValue += ".";
  }

  function positiveAmount(value: string): string {
    // setDotAtTheEnd(value.endsWith("."));
    // const dotAtTheEnd = value.endsWith(".");
    if (!value) {
      if (handler.onInput) {
        handler.onInput(Amounts.zeroOfCurrency(currency));
      }
      return "";
    }
    try {
      //remove all but last dot
      const parsed = value.replace(/(\.)(?=.*\1)/g, "");
      const parts = parsed.split(".");
      setDecimalPlaces(parts.length === 1 ? undefined : parts[1].length);

      //FIXME: should normalize before parsing
      //parsing first add some restriction on the rage of the values
      const real = parseValue(currency, parsed);

      if (!real || real.value < 0) {
        return previousValue;
      }

      const realNormalized = normalize(real, unit);

      // console.log(real, unit, normal);
      if (realNormalized && handler.onInput) {
        handler.onInput(realNormalized);
      }
      return parsed;
    } catch (e) {
      // do nothing
    }
    return previousValue;
  }

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
  const tailPart = !fractPart
    ? "0"
    : fractPart.substring(0, amountFractionalLength);

  const value = Number.parseInt(intPart, 10);
  const parsedTail = Number.parseFloat(`.${tailPart}`);
  if (Number.isNaN(value) || Number.isNaN(parsedTail)) {
    return undefined;
  }
  if (value > amountMaxValue) {
    return undefined;
  }

  const fraction = Math.round(amountFractionalBase * parsedTail);
  return { currency, fraction, value };
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
