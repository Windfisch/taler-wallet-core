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

let url = URI(document.location.href);
let query: any = URI.parseQuery(url.query());

let $_ = (x) => document.getElementById(x);

function renderContract(contract) {
  let showAmount = document.getElementById("show-amount");
  $_('merchant-name').innerText = contract.merchant.name;
}

function clone(obj) {
  // This is faster than it looks ...
  return JSON.parse(JSON.stringify(obj));
}


Handlebars.registerHelper('prettyAmount', function(amount) {
  let v = amount.value + amount.fraction / 10e6;
  return v.toFixed(2) + " " + amount.currency;
});


document.addEventListener("DOMContentLoaded", (e) => {
  let offer = JSON.parse(query.offer);
  console.dir(offer);

  let source = $_("contract-template").innerHTML;
  let template = Handlebars.compile(source);
  $_("render-contract").innerHTML = template(offer.contract);

  document.getElementById("confirm-pay").addEventListener("click", (e) => {
    console.log("Query:", JSON.stringify(query));
    let d = {
      offer: JSON.parse(query.offer),
      merchantPageUrl: query.merchantPageUrl
    };
    chrome.runtime.sendMessage({type:'confirm-pay', detail: d}, (resp) => {
      if (!resp.success) {
        let source = $_("error-template").innerHTML;
        let template = Handlebars.compile(source);
        $_("status").innerHTML = template(resp);
        return;
      }
      document.location.href = URI(d.offer.exec_url)
        .absoluteTo(query.merchantPageUrl)
        .addQuery({H_contract: d.offer.H_contract})
        .href();
    });
  });
});


