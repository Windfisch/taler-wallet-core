/*
 This file is part of TALER
 (C) 2016 INRIA

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
 * Helpers functions to render Taler-related data structures to HTML.
 *
 * @author Florian Dold
 */


import {AmountJson, Contract, Amounts} from "./types";

export function prettyAmount(amount: AmountJson) {
  let v = amount.value + amount.fraction / Amounts.fractionalBase;
  return `${v.toFixed(2)} ${amount.currency}`;
}

export function renderContract(contract: Contract): JSX.Element {
  let merchantName = <strong>{contract.merchant.name}</strong>;
  let amount = <strong>{prettyAmount(contract.amount)}</strong>;

  return (
    <div>
      <p>
        The merchant {merchantName}
        wants to enter a contract over {amount}{" "}
        with you.
      </p>
      <p>{i18n`You are about to purchase:`}</p>
      <ul>
        {contract.products.map(
          (p: any, i: number) => (<li key={i}>{`${p.description}: ${prettyAmount(p.price)}`}</li>))
        }
      </ul>
    </div>
  );
}


export function abbrev(s: string, n: number = 5) {
  let sAbbrev = s;
  if (s.length > n) {
    sAbbrev = s.slice(0, n) + "..";
  }
  return (
    <span className="abbrev" title={s}>
      {sAbbrev}
    </span>
  );
}
