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


/**
 * Imports.
 */
import { amountToPretty } from "../helpers";
import * as i18n from "../i18n";
import {
  Contract,
} from "../types";

import * as React from "react";

/**
 * Render contract terms for the end user to view.
 */
export function renderContract(contract: Contract): JSX.Element {
  let merchantName;
  if (contract.merchant && contract.merchant.name) {
    merchantName = <strong>{contract.merchant.name}</strong>;
  } else {
    merchantName = <strong>(pub: {contract.merchant_pub})</strong>;
  }
  const amount = <strong>{amountToPretty(contract.amount)}</strong>;

  return (
    <div>
      <i18n.Translate wrap="p">
        The merchant <span>{merchantName}</span>
        wants to enter a contract over <span>{amount}</span>{" "}
        with you.
      </i18n.Translate>
      <p>{i18n.str`You are about to purchase:`}</p>
      <ul>
        {contract.products.map(
          (p: any, i: number) => (<li key={i}>{`${p.description}: ${amountToPretty(p.price)}`}</li>))
        }
      </ul>
    </div>
  );
}


/**
 * Abbreviate a string to a given length, and show the full
 * string on hover as a tooltip.
 */
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
