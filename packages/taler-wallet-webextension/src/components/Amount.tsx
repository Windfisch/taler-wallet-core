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
  Amounts,
  AmountString,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";

export function Amount({
  value,
  maxFracSize,
  negative,
  hideCurrency,
  signType = "standard",
  signDisplay = "auto",
}: {
  negative?: boolean;
  value: AmountJson | AmountString;
  maxFracSize?: number;
  hideCurrency?: boolean;
  signType?: "accounting" | "standard";
  signDisplay?: "auto" | "always" | "never" | "exceptZero";
}): VNode {
  const aj = Amounts.jsonifyAmount(value);
  const minFractional =
    maxFracSize !== undefined && maxFracSize < 2 ? maxFracSize : 2;
  const af = aj.fraction % amountFractionalBase;
  let s = "";
  if ((af && maxFracSize) || minFractional > 0) {
    s += ".";
    let n = af;
    for (
      let i = 0;
      (maxFracSize === undefined || i < maxFracSize) &&
      i < amountFractionalLength;
      i++
    ) {
      if (!n && i >= minFractional) {
        break;
      }
      s = s + Math.floor((n / amountFractionalBase) * 10).toString();
      n = (n * 10) % amountFractionalBase;
    }
  }
  const fontSize = 18;
  const letterSpacing = 0;
  const mult = 0.7;
  return (
    <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
      <span
        style={{
          display: "inline-block",
          fontFamily: "monospace",
          fontSize,
        }}
      >
        {negative ? (signType === "accounting" ? "(" : "-") : ""}
        <span
          style={{
            display: "inline-block",
            textAlign: "right",
            fontFamily: "monospace",
            fontSize,
            letterSpacing,
          }}
        >
          {aj.value}
        </span>
        <span
          style={{
            display: "inline-block",
            width: !maxFracSize ? undefined : `${(maxFracSize + 1) * mult}em`,
            textAlign: "left",
            fontFamily: "monospace",
            fontSize,
            letterSpacing,
          }}
        >
          {s}
          {negative && signType === "accounting" ? ")" : ""}
        </span>
      </span>
      {hideCurrency ? undefined : (
        <Fragment>
          &nbsp;
          <span>{aj.currency}</span>
        </Fragment>
      )}
    </span>
  );
}
