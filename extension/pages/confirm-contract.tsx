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

/// <reference path="../lib/decl/handlebars/handlebars.d.ts" />
"use strict";

import {substituteFulfillmentUrl} from "../lib/web-common";

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

  var Contract = {
    view(ctrl) {
      return [
        m("p",
          i18n`Hello, this is the wallet.  The merchant "${contract.merchant.name}"
               wants to enter a contract over ${prettyAmount(contract.amount)}
               with you.`),
        m("p",
          i18n`The contract contains the following products:`),
        m('ul',
          _.map(contract.products,
                (p: any) => m("li",
                              `${p.description}: ${prettyAmount(p.price)}`))),
        m("button", {onclick: doPayment}, i18n`Confirm Payment`)
      ];
    }
  };

  m.mount(document.getElementById("contract"), Contract);


  function doPayment() {
    let d = {
      offer
    };
    chrome.runtime.sendMessage({type: 'confirm-pay', detail: d}, (resp) => {
      if (!resp.success) {
        console.log("confirm-pay error", JSON.stringify(resp));
        return;
      }
      let c = d.offer.contract;
      console.log("contract", c);
      document.location.href = substituteFulfillmentUrl(c.fulfillment_url, offer);
    });
  }
}
