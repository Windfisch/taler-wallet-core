/*
 This file is part of GNU Taler
 (C) 2019 Taler Systems S.A.

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
 * Types and helper functions for dealing with Taler amounts.
 */

/**
 * Imports.
 */
import {
  buildCodecForObject,
  codecForString,
  codecForNumber,
  Codec,
} from "./codec.js";
import { AmountString } from "./taler-types.js";

/**
 * Number of fractional units that one value unit represents.
 */
export const amountFractionalBase = 1e8;

/**
 * How many digits behind the comma are required to represent the
 * fractional value in human readable decimal format?  Must match
 * lg(fractionalBase)
 */
export const amountFractionalLength = 8;

/**
 * Maximum allowed value field of an amount.
 */
export const amountMaxValue = 2 ** 52;

/**
 * Non-negative financial amount.  Fractional values are expressed as multiples
 * of 1e-8.
 */
export interface AmountJson {
  /**
   * Value, must be an integer.
   */
  readonly value: number;

  /**
   * Fraction, must be an integer.  Represent 1/1e8 of a unit.
   */
  readonly fraction: number;

  /**
   * Currency of the amount.
   */
  readonly currency: string;
}

export const codecForAmountJson = (): Codec<AmountJson> =>
  buildCodecForObject<AmountJson>()
    .property("currency", codecForString())
    .property("value", codecForNumber())
    .property("fraction", codecForNumber())
    .build("AmountJson");

export const codecForAmountString = (): Codec<AmountString> => codecForString();

/**
 * Result of a possibly overflowing operation.
 */
export interface Result {
  /**
   * Resulting, possibly saturated amount.
   */
  amount: AmountJson;
  /**
   * Was there an over-/underflow?
   */
  saturated: boolean;
}

/**
 * Type for things that are treated like amounts.
 */
export type AmountLike = AmountString | AmountJson;

/**
 * Helper class for dealing with amounts.
 */
export class Amounts {
  private constructor() {
    throw Error("not instantiable");
  }

  static currencyOf(amount: AmountLike) {
    const amt = Amounts.parseOrThrow(amount);
    return amt.currency;
  }

  static zeroOfAmount(amount: AmountLike): AmountJson {
    const amt = Amounts.parseOrThrow(amount);
    return {
      currency: amt.currency,
      fraction: 0,
      value: 0,
    };
  }

  /**
   * Get an amount that represents zero units of a currency.
   */
  static zeroOfCurrency(currency: string): AmountJson {
    return {
      currency,
      fraction: 0,
      value: 0,
    };
  }

  static jsonifyAmount(amt: AmountLike): AmountJson {
    if (typeof amt === "string") {
      return Amounts.parseOrThrow(amt);
    }
    return amt;
  }

  static sum(amounts: AmountLike[]): Result {
    if (amounts.length <= 0) {
      throw Error("can't sum zero amounts");
    }
    const jsonAmounts = amounts.map((x) => Amounts.jsonifyAmount(x));
    return Amounts.add(jsonAmounts[0], ...jsonAmounts.slice(1));
  }

  static sumOrZero(currency: string, amounts: AmountLike[]): Result {
    if (amounts.length <= 0) {
      return {
        amount: Amounts.zeroOfCurrency(currency),
        saturated: false,
      };
    }
    const jsonAmounts = amounts.map((x) => Amounts.jsonifyAmount(x));
    return Amounts.add(jsonAmounts[0], ...jsonAmounts.slice(1));
  }

  /**
   * Add two amounts.  Return the result and whether
   * the addition overflowed.  The overflow is always handled
   * by saturating and never by wrapping.
   *
   * Throws when currencies don't match.
   */
  static add(first: AmountLike, ...rest: AmountLike[]): Result {
    const firstJ = Amounts.jsonifyAmount(first);
    const currency = firstJ.currency;
    let value =
      firstJ.value + Math.floor(firstJ.fraction / amountFractionalBase);
    if (value > amountMaxValue) {
      return {
        amount: {
          currency,
          value: amountMaxValue,
          fraction: amountFractionalBase - 1,
        },
        saturated: true,
      };
    }
    let fraction = firstJ.fraction % amountFractionalBase;
    for (const x of rest) {
      const xJ = Amounts.jsonifyAmount(x);
      if (xJ.currency.toUpperCase() !== currency.toUpperCase()) {
        throw Error(`Mismatched currency: ${xJ.currency} and ${currency}`);
      }

      value =
        value +
        xJ.value +
        Math.floor((fraction + xJ.fraction) / amountFractionalBase);
      fraction = Math.floor((fraction + xJ.fraction) % amountFractionalBase);
      if (value > amountMaxValue) {
        return {
          amount: {
            currency,
            value: amountMaxValue,
            fraction: amountFractionalBase - 1,
          },
          saturated: true,
        };
      }
    }
    return { amount: { currency, value, fraction }, saturated: false };
  }

  /**
   * Subtract two amounts.  Return the result and whether
   * the subtraction overflowed.  The overflow is always handled
   * by saturating and never by wrapping.
   *
   * Throws when currencies don't match.
   */
  static sub(a: AmountLike, ...rest: AmountLike[]): Result {
    const aJ = Amounts.jsonifyAmount(a);
    const currency = aJ.currency;
    let value = aJ.value;
    let fraction = aJ.fraction;

    for (const b of rest) {
      const bJ = Amounts.jsonifyAmount(b);
      if (bJ.currency.toUpperCase() !== aJ.currency.toUpperCase()) {
        throw Error(`Mismatched currency: ${bJ.currency} and ${currency}`);
      }
      if (fraction < bJ.fraction) {
        if (value < 1) {
          return {
            amount: { currency, value: 0, fraction: 0 },
            saturated: true,
          };
        }
        value--;
        fraction += amountFractionalBase;
      }
      console.assert(fraction >= bJ.fraction);
      fraction -= bJ.fraction;
      if (value < bJ.value) {
        return { amount: { currency, value: 0, fraction: 0 }, saturated: true };
      }
      value -= bJ.value;
    }

    return { amount: { currency, value, fraction }, saturated: false };
  }

  /**
   * Compare two amounts.  Returns 0 when equal, -1 when a < b
   * and +1 when a > b.  Throws when currencies don't match.
   */
  static cmp(a: AmountLike, b: AmountLike): -1 | 0 | 1 {
    a = Amounts.jsonifyAmount(a);
    b = Amounts.jsonifyAmount(b);
    if (a.currency !== b.currency) {
      throw Error(`Mismatched currency: ${a.currency} and ${b.currency}`);
    }
    const av = a.value + Math.floor(a.fraction / amountFractionalBase);
    const af = a.fraction % amountFractionalBase;
    const bv = b.value + Math.floor(b.fraction / amountFractionalBase);
    const bf = b.fraction % amountFractionalBase;
    switch (true) {
      case av < bv:
        return -1;
      case av > bv:
        return 1;
      case af < bf:
        return -1;
      case af > bf:
        return 1;
      case af === bf:
        return 0;
      default:
        throw Error("assertion failed");
    }
  }

  /**
   * Create a copy of an amount.
   */
  static copy(a: AmountJson): AmountJson {
    return {
      currency: a.currency,
      fraction: a.fraction,
      value: a.value,
    };
  }

  /**
   * Divide an amount.  Throws on division by zero.
   */
  static divide(a: AmountJson, n: number): AmountJson {
    if (n === 0) {
      throw Error(`Division by 0`);
    }
    if (n === 1) {
      return { value: a.value, fraction: a.fraction, currency: a.currency };
    }
    const r = a.value % n;
    return {
      currency: a.currency,
      fraction: Math.floor((r * amountFractionalBase + a.fraction) / n),
      value: Math.floor(a.value / n),
    };
  }

  /**
   * Check if an amount is non-zero.
   */
  static isNonZero(a: AmountJson): boolean {
    return a.value > 0 || a.fraction > 0;
  }

  static isZero(a: AmountLike): boolean {
    a = Amounts.jsonifyAmount(a);
    return a.value === 0 && a.fraction === 0;
  }

  /**
   * Parse an amount like 'EUR:20.5' for 20 Euros and 50 ct.
   */
  static parse(s: string): AmountJson | undefined {
    const res = s.match(/^([a-zA-Z0-9_*-]+):([0-9]+)([.][0-9]+)?$/);
    if (!res) {
      return undefined;
    }
    const tail = res[3] || ".0";
    if (tail.length > amountFractionalLength + 1) {
      return undefined;
    }
    const value = Number.parseInt(res[2]);
    if (value > amountMaxValue) {
      return undefined;
    }
    return {
      currency: res[1].toUpperCase(),
      fraction: Math.round(amountFractionalBase * Number.parseFloat(tail)),
      value,
    };
  }

  /**
   * Parse amount in standard string form (like 'EUR:20.5'),
   * throw if the input is not a valid amount.
   */
  static parseOrThrow(s: AmountLike): AmountJson {
    if (typeof s === "object") {
      if (typeof s.currency !== "string") {
        throw Error("invalid amount object");
      }
      if (typeof s.value !== "number") {
        throw Error("invalid amount object");
      }
      if (typeof s.fraction !== "number") {
        throw Error("invalid amount object");
      }
      return { currency: s.currency, value: s.value, fraction: s.fraction };
    } else if (typeof s === "string") {
      const res = Amounts.parse(s);
      if (!res) {
        throw Error(`Can't parse amount: "${s}"`);
      }
      return res;
    } else {
      throw Error("invalid amount (illegal type)");
    }
  }

  /**
   * Convert a float to a Taler amount.
   * Loss of precision possible.
   */
  static fromFloat(floatVal: number, currency: string): AmountJson {
    return {
      currency,
      fraction: Math.floor(
        (floatVal - Math.floor(floatVal)) * amountFractionalBase,
      ),
      value: Math.floor(floatVal),
    };
  }

  static min(a: AmountLike, b: AmountLike): AmountJson {
    const cr = Amounts.cmp(a, b);
    if (cr >= 0) {
      return Amounts.jsonifyAmount(b);
    } else {
      return Amounts.jsonifyAmount(a);
    }
  }

  static max(a: AmountLike, b: AmountLike): AmountJson {
    const cr = Amounts.cmp(a, b);
    if (cr >= 0) {
      return Amounts.jsonifyAmount(a);
    } else {
      return Amounts.jsonifyAmount(b);
    }
  }

  static mult(a: AmountLike, n: number): Result {
    a = this.jsonifyAmount(a);
    if (!Number.isInteger(n)) {
      throw Error("amount can only be multipied by an integer");
    }
    if (n < 0) {
      throw Error("amount can only be multiplied by a positive integer");
    }
    if (n == 0) {
      return {
        amount: Amounts.zeroOfCurrency(a.currency),
        saturated: false,
      };
    }
    let x = a;
    let acc = Amounts.zeroOfCurrency(a.currency);
    while (n > 1) {
      if (n % 2 == 0) {
        n = n / 2;
      } else {
        n = (n - 1) / 2;
        const r2 = Amounts.add(acc, x);
        if (r2.saturated) {
          return r2;
        }
        acc = r2.amount;
      }
      const r2 = Amounts.add(x, x);
      if (r2.saturated) {
        return r2;
      }
      x = r2.amount;
    }
    return Amounts.add(acc, x);
  }

  /**
   * Check if the argument is a valid amount in string form.
   */
  static check(a: any): boolean {
    if (typeof a !== "string") {
      return false;
    }
    try {
      const parsedAmount = Amounts.parse(a);
      return !!parsedAmount;
    } catch {
      return false;
    }
  }

  /**
   * Convert to standard human-readable string representation that's
   * also used in JSON formats.
   */
  static stringify(a: AmountLike): string {
    a = Amounts.jsonifyAmount(a);
    const s = this.stringifyValue(a);

    return `${a.currency}:${s}`;
  }

  static isSameCurrency(a1: AmountLike, a2: AmountLike): boolean {
    const x1 = this.jsonifyAmount(a1);
    const x2 = this.jsonifyAmount(a2);
    return x1.currency.toUpperCase() === x2.currency.toUpperCase();
  }

  static stringifyValue(a: AmountLike, minFractional = 0): string {
    const aJ = Amounts.jsonifyAmount(a);
    const av = aJ.value + Math.floor(aJ.fraction / amountFractionalBase);
    const af = aJ.fraction % amountFractionalBase;
    let s = av.toString();

    if (af || minFractional) {
      s = s + ".";
      let n = af;
      for (let i = 0; i < amountFractionalLength; i++) {
        if (!n && i >= minFractional) {
          break;
        }
        s = s + Math.floor((n / amountFractionalBase) * 10).toString();
        n = (n * 10) % amountFractionalBase;
      }
    }

    return s;
  }

  /**
   * Number of fractional digits needed to fully represent the amount
   * @param a amount
   * @returns
   */
  static maxFractionalDigits(a: AmountJson): number {
    if (a.fraction === 0) return 0;
    if (a.fraction < 0) {
      console.error("amount fraction can not be negative", a);
      return 0;
    }
    let i = 0;
    let check = true;
    let rest = a.fraction;
    while (rest > 0 && check) {
      check = rest % 10 === 0;
      rest = rest / 10;
      i++;
    }
    return amountFractionalLength - i + 1;
  }
}
