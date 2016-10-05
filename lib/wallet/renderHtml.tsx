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


import {AmountJson, Contract} from "./types";

export function prettyAmount(amount: AmountJson) {
  let v = amount.value + amount.fraction / 1e6;
  return `${v.toFixed(2)} ${amount.currency}`;
}

export function renderContract(contract: Contract): JSX.Element {
  let merchantName = m("strong", contract.merchant.name);
  let amount = m("strong", prettyAmount(contract.amount));

  return (
    <div>
      <p>{
        i18n.parts`${merchantName}
               wants to enter a contract over ${amount}
               with you.`}
      </p>
      <p>{i18n`You are about to purchase:`}</p>
      <ul>
        {contract.products.map(
          (p: any) => (<li>{`${p.description}: ${prettyAmount(p.price)}`}</li>))
        }
      </ul>
    </div>
  );
}