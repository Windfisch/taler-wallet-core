/*
 This file is part of TALER
 (C) 2015-2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
 */

import {amountToPretty} from "../lib/web-common";
import {AmountJson, CreateReserveResponse} from "../lib/wallet/wallet";
"use strict";


export function main() {
  function updateAmount() {
    let showAmount = document.getElementById("show-amount");
    console.log("Query is " + JSON.stringify(query));
    let amount = AmountJson.checked(JSON.parse(query.amount));
    showAmount.textContent = amountToPretty(amount);
  }

  let url = URI(document.location.href);
  let query: any = URI.parseQuery(url.query());

  updateAmount();

  document.getElementById("confirm").addEventListener("click", (e) => {
    const d = {
      mint: (document.getElementById('mint-url') as HTMLInputElement).value,
      amount: JSON.parse(query.amount)
    };

    if (!d.mint) {
      // FIXME: indicate error instead!
      throw Error("mint missing");
    }

    if (!d.amount) {
      // FIXME: indicate error instead!
      throw Error("amount missing");
    }

    const cb = (rawResp) => {
      if (!rawResp) {
        throw Error("empty response");
      }
      if (!rawResp.error) {
        const resp = CreateReserveResponse.checked(rawResp);
        let q = {
          mint: resp.mint,
          reserve_pub: resp.reservePub,
          amount: query.amount,
        };
        let url = URI(query.callback_url).addQuery(q);
        if (!url.is("absolute")) {
          throw Error("callback url is not absolute");
        }
        document.location.href = url.href();
      } else {
        document.body.innerHTML =
          `Oops, something went wrong.  It looks like the bank could not
            transfer funds to the mint.  Please go back to your bank's website
            to check what happened.`;
      }
    };
    chrome.runtime.sendMessage({type: 'create-reserve', detail: d}, cb);
  });
}