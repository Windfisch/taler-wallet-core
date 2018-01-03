/*
 This file is part of TALER
 (C) 2018 GNUnet e.V. and INRIA

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */


/**
 * Types and helper functions for dealing with Taler amounts.
 */

/**
 * Imports.
 */
import { Checkable } from "./checkable";

/**
 * Number of fractional units that one value unit represents.
 */
export const fractionalBase = 1e8;

/**
 * Non-negative financial amount.  Fractional values are expressed as multiples
 * of 1e-8.
 */
@Checkable.Class()
export class AmountJson {
  /**
   * Value, must be an integer.
   */
  @Checkable.Number
  readonly value: number;

  /**
   * Fraction, must be an integer.  Represent 1/1e8 of a unit.
   */
  @Checkable.Number
  readonly fraction: number;

  /**
   * Currency of the amount.
   */
  @Checkable.String
  readonly currency: string;

  /**
   * Verify that a value matches the schema of this class and convert it into a
   * member.
   */
  static checked: (obj: any) => AmountJson;
}

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
 * Get the largest amount that is safely representable.
 */
export function getMaxAmount(currency: string): AmountJson {
  return {
    currency,
    fraction: 2 ** 32,
    value: Number.MAX_SAFE_INTEGER,
  };
}

/**
 * Get an amount that represents zero units of a currency.
 */
export function getZero(currency: string): AmountJson {
  return {
    currency,
    fraction: 0,
    value: 0,
  };
}

/**
 * Add two amounts.  Return the result and whether
 * the addition overflowed.  The overflow is always handled
 * by saturating and never by wrapping.
 *
 * Throws when currencies don't match.
 */
export function add(first: AmountJson, ...rest: AmountJson[]): Result {
  const currency = first.currency;
  let value = first.value + Math.floor(first.fraction / fractionalBase);
  if (value > Number.MAX_SAFE_INTEGER) {
    return { amount: getMaxAmount(currency), saturated: true };
  }
  let fraction = first.fraction % fractionalBase;
  for (const x of rest) {
    if (x.currency !== currency) {
      throw Error(`Mismatched currency: ${x.currency} and ${currency}`);
    }

    value = value + x.value + Math.floor((fraction + x.fraction) / fractionalBase);
    fraction = Math.floor((fraction + x.fraction) % fractionalBase);
    if (value > Number.MAX_SAFE_INTEGER) {
      return { amount: getMaxAmount(currency), saturated: true };
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
export function sub(a: AmountJson, ...rest: AmountJson[]): Result {
  const currency = a.currency;
  let value = a.value;
  let fraction = a.fraction;

  for (const b of rest) {
    if (b.currency !== currency) {
      throw Error(`Mismatched currency: ${b.currency} and ${currency}`);
    }
    if (fraction < b.fraction) {
      if (value < 1) {
        return { amount: { currency, value: 0, fraction: 0 }, saturated: true };
      }
      value--;
      fraction += fractionalBase;
    }
    console.assert(fraction >= b.fraction);
    fraction -= b.fraction;
    if (value < b.value) {
      return { amount: { currency, value: 0, fraction: 0 }, saturated: true };
    }
    value -= b.value;
  }

  return { amount: { currency, value, fraction }, saturated: false };
}

/**
 * Compare two amounts.  Returns 0 when equal, -1 when a < b
 * and +1 when a > b.  Throws when currencies don't match.
 */
export function cmp(a: AmountJson, b: AmountJson): number {
  if (a.currency !== b.currency) {
    throw Error(`Mismatched currency: ${a.currency} and ${b.currency}`);
  }
  const av = a.value + Math.floor(a.fraction / fractionalBase);
  const af = a.fraction % fractionalBase;
  const bv = b.value + Math.floor(b.fraction / fractionalBase);
  const bf = b.fraction % fractionalBase;
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
export function copy(a: AmountJson): AmountJson {
  return {
    currency: a.currency,
    fraction: a.fraction,
    value: a.value,
  };
}

/**
 * Divide an amount.  Throws on division by zero.
 */
export function divide(a: AmountJson, n: number): AmountJson {
  if (n === 0) {
    throw Error(`Division by 0`);
  }
  if (n === 1) {
    return {value: a.value, fraction: a.fraction, currency: a.currency};
  }
  const r = a.value % n;
  return {
    currency: a.currency,
    fraction: Math.floor(((r * fractionalBase) + a.fraction) / n),
    value: Math.floor(a.value / n),
  };
}

/**
 * Check if an amount is non-zero.
 */
export function isNonZero(a: AmountJson): boolean {
  return a.value > 0 || a.fraction > 0;
}

/**
 * Parse an amount like 'EUR:20.5' for 20 Euros and 50 ct.
 */
export function parse(s: string): AmountJson|undefined {
  const res = s.match(/([a-zA-Z0-9_*-]+):([0-9])+([.][0-9]+)?/);
  if (!res) {
    return undefined;
  }
  return {
    currency: res[1],
    fraction: Math.round(fractionalBase * Number.parseFloat(res[3] || "0")),
    value: Number.parseInt(res[2]),
  };
}

/**
 * Convert the amount to a float.
 */
export function toFloat(a: AmountJson): number {
  return a.value + (a.fraction / fractionalBase);
}

/**
 * Convert a float to a Taler amount.
 * Loss of precision possible.
 */
export function fromFloat(floatVal: number, currency: string) {
  return {
    currency,
    fraction: Math.floor((floatVal - Math.floor(floatVal)) * fractionalBase),
    value: Math.floor(floatVal),
  };
}
