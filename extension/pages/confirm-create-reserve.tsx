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

import {amountToPretty, canonicalizeBaseUrl} from "../lib/wallet/helpers";
import {AmountJson, CreateReserveResponse} from "../lib/wallet/types";

"use strict";

declare var m: any;


/**
 * Execute something after a delay, with the possibility
 * to reset the delay.
 */
class DelayTimer {
  ms: number;
  f;
  timerId: number = null;

  constructor(ms: number, f) {
    this.f = f;
    this.ms = ms;
  }

  bump() {
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
    }
    const handler = () => {
      this.f();
    };
    this.timerId = window.setTimeout(handler, this.ms);
  }
}


class Controller {
  url = null;
  errorString = null;
  isValidMint = false;
  private timer: DelayTimer;
  private request: XMLHttpRequest;

  constructor() {
    this.update();
    this.timer = new DelayTimer(800, () => this.update());
  }

  update() {
    const doUpdate = () => {
      if (!this.url) {
        this.errorString = i18n`Please enter a URL`;
        return;
      }
      this.errorString = null;
      let parsedUrl = URI(this.url);
      if (parsedUrl.is("relative")) {
        this.errorString = i18n`The URL you've entered is not valid (must be absolute)`;
        return;
      }

      const keysUrl = URI("/keys").absoluteTo(canonicalizeBaseUrl(this.url));

      console.log(`requesting keys from '${keysUrl}'`);

      this.request = new XMLHttpRequest();
      this.request.onreadystatechange = () => {
        if (this.request.readyState == XMLHttpRequest.DONE) {
          switch (this.request.status) {
            case 200:
              this.isValidMint = true;
              break;
            case 0:
              this.errorString = `unknown request error`;
              break;
            default:
              this.errorString = `request failed with status ${this.request.status}`;
              break;
          }
          m.redraw();
        }
      };
      this.request.open("get", keysUrl.href());
      this.request.send();
    };

    doUpdate();
    m.redraw();
    console.log("got update");
  }

  reset() {
    this.isValidMint = false;
    this.errorString = null;
    if (this.request) {
      this.request.abort();
      this.request = null;
    }
    m.redraw();
  }

  confirmReserve(mint: string, amount: AmountJson, callback_url: string) {
    const d = {mint, amount};
    const cb = (rawResp) => {
      if (!rawResp) {
        throw Error("empty response");
      }
      if (!rawResp.error) {
        const resp = CreateReserveResponse.checked(rawResp);
        let q = {
          mint: resp.mint,
          reserve_pub: resp.reservePub,
          amount_value: amount.value,
          amount_fraction: amount.fraction,
          amount_currency: amount.currency,
        };
        let url = URI(callback_url).addQuery(q);
        if (!url.is("absolute")) {
          throw Error("callback url is not absolute");
        }
        console.log("going to", url.href());
        document.location.href = url.href();
      } else {
        this.reset();
        this.errorString = (
        `Oops, something went wrong.` +
        `The wallet responded with error status (${rawResp.error}).`);
      }
    };
    chrome.runtime.sendMessage({type: 'create-reserve', detail: d}, cb);
  }

  onUrlChanged(url: string) {
    this.reset();
    this.url = url;
    this.timer.bump();
  }
}


export function main() {
  const url = URI(document.location.href);
  const query: any = URI.parseQuery(url.query());
  const amount = AmountJson.checked(JSON.parse(query.amount));
  const callback_url = query.callback_url;

  var MintSelection = {
    controller: () => new Controller(),
    view(ctrl: Controller) {
      let controls = [];
      let mx = (...args) => controls.push(m(...args));

      mx("p",
         i18n`The bank wants to create a reserve over ${amountToPretty(
           amount)}.`);
      mx("input.url",
         {
           type: "text",
           spellcheck: false,
           oninput: m.withAttr("value", ctrl.onUrlChanged.bind(ctrl)),
         });

      if (ctrl.isValidMint) {
        mx("button", {
             onclick: () => ctrl.confirmReserve(ctrl.url,
                                                amount,
                                                callback_url)
           },
           "Confirm mint selection");
      }

      if (ctrl.errorString) {
        mx("p", ctrl.errorString);
      }

      return m("div", controls);
    }
  };

  m.mount(document.getElementById("mint-selection"), MintSelection);
}