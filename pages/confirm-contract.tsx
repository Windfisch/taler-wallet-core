/*
 This file is part of TALER
 (C) 2015 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Page shown to the user to confirm entering
 * a contract.
 *
 * @author Florian Dold
 */

/// <reference path="../lib/decl/handlebars/handlebars.d.ts" />
"use strict";

import {substituteFulfillmentUrl} from "../lib/wallet/helpers";

declare var m: any;

function prettyAmount(amount) {
  let v = amount.value + amount.fraction / 1e6;
  return `${v.toFixed(2)} ${amount.currency}`;
}


export function main() {
  let url = URI(document.location.href);
  let query: any = URI.parseQuery(url.query());
  let offer = JSON.parse(query.offer);
  console.dir(offer);
  let contract = offer.contract;
  let error = null;

  var Contract = {
    view(ctrl) {
      return [
        m("p",
          i18n.parts`${m("strong", contract.merchant.name)}
               wants to enter a contract over ${m("strong",
                                                  prettyAmount(contract.amount))}
               with you.`),
        m("p",
          i18n`You are about to purchase:`),
        m('ul',
          _.map(contract.products,
                (p: any) => m("li",
                              `${p.description}: ${prettyAmount(p.price)}`))),
        m("button.confirm-pay", {onclick: doPayment}, i18n`Confirm Payment`),
        m("p", error ? error : []),
      ];
    }
  };

  m.mount(document.getElementById("contract"), Contract);

  function doPayment() {
    let d = {offer};
    chrome.runtime.sendMessage({type: 'confirm-pay', detail: d}, (resp) => {
      if (resp.error) {
        console.log("confirm-pay error", JSON.stringify(resp));
        switch (resp.error) {
          case "coins-insufficient":
            error = "You do not have enough coins of the requested currency.";
            break;
          default:
            error = `Error: ${resp.error}`;
            break;
        }
        m.redraw();
        return;
      }
      let c = d.offer.contract;
      console.log("contract", c);
      document.location.href = substituteFulfillmentUrl(c.fulfillment_url,
                                                        offer);
    });
  }
}
