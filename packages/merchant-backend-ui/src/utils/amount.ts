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
import { amountFractionalBase, AmountJson, Amounts } from "@gnu-taler/taler-util";
import { MerchantBackend } from "../declaration";

/**
 * sums two prices, 
 * @param one 
 * @param two 
 * @returns 
 */
const sumPrices = (one: string, two: string) => {
  const [currency, valueOne] = one.split(':')
  const [, valueTwo] = two.split(':')
  return `${currency}:${parseInt(valueOne, 10) + parseInt(valueTwo, 10)}`
}

/**
 * merge refund with the same description and a difference less than one minute
 * @param prev list of refunds that will hold the merged refunds 
 * @param cur new refund to add to the list
 * @returns list with the new refund, may be merged with the last
 */
export function mergeRefunds(prev: MerchantBackend.Orders.RefundDetails[], cur: MerchantBackend.Orders.RefundDetails) {
  let tail;

  if (prev.length === 0 ||  //empty list
    cur.timestamp.t_s === 'never' || //current doesnt have timestamp
    (tail = prev[prev.length - 1]).timestamp.t_s === 'never' || // last doesnt have timestamp
    cur.reason !== tail.reason || //different reason
    Math.abs(cur.timestamp.t_s - tail.timestamp.t_s) > 1000 * 60) {//more than 1 minute difference

    prev.push(cur)
    return prev
  }

  prev[prev.length - 1] = {
    ...tail,
    amount: sumPrices(tail.amount, cur.amount)
  }

  return prev
}

export const rate = (one: string, two: string) => {
  const a = Amounts.parseOrThrow(one)
  const b = Amounts.parseOrThrow(two)
  const af = toFloat(a)
  const bf = toFloat(b)
  if (bf === 0) return 0
  return af / bf
}

function toFloat(amount: AmountJson) {
  return amount.value + (amount.fraction / amountFractionalBase);
}
