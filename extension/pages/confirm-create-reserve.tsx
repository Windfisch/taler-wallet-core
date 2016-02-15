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

/// <reference path="../lib/decl/mithril.d.ts" />

import {amountToPretty, canonicalizeBaseUrl} from "../lib/wallet/helpers";
import {AmountJson, CreateReserveResponse} from "../lib/wallet/types";
import m from "mithril";

"use strict";

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
    this.stop();
    const handler = () => {
      this.f();
    };
    this.timerId = window.setTimeout(handler, this.ms);
  }

  stop() {
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
    }
  }
}


class Controller {
  url = m.prop<string>();
  statusString = null;
  isValidMint = false;
  private timer: DelayTimer;
  private request: XMLHttpRequest;
  amount: AmountJson;
  callbackUrl: string;

  constructor(initialMintUrl: string, amount: AmountJson, callbackUrl: string) {
    this.amount = amount;
    this.callbackUrl = callbackUrl;
    this.timer = new DelayTimer(800, () => this.update());
    this.url(initialMintUrl);
    this.update();
  }

  private update() {
    this.timer.stop();
    const doUpdate = () => {
      if (!this.url()) {
        this.statusString = i18n`Please enter a URL`;
        m.endComputation();
        return;
      }
      this.statusString = null;
      let parsedUrl = URI(this.url());
      if (parsedUrl.is("relative")) {
        this.statusString = i18n`The URL you've entered is not valid (must be absolute)`;
        m.endComputation();
        return;
      }

      const keysUrl = URI("/keys").absoluteTo(canonicalizeBaseUrl(this.url()));

      console.log(`requesting keys from '${keysUrl}'`);

      this.request = new XMLHttpRequest();
      this.request.onreadystatechange = () => {
        if (this.request.readyState == XMLHttpRequest.DONE) {
          switch (this.request.status) {
            case 200:
              this.isValidMint = true;
              this.statusString = "The mint base URL is valid!";
              break;
            case 0:
              this.statusString = `unknown request error`;
              break;
            default:
              this.statusString = `request failed with status ${this.request.status}`;
              break;
          }
        }
        m.endComputation();
      };
      this.request.open("get", keysUrl.href());
      this.request.send();
    };

    m.startComputation();
    doUpdate();


    console.log("got update");
  }

  reset() {
    this.isValidMint = false;
    this.statusString = null;
    if (this.request) {
      this.request.abort();
      this.request = null;
    }
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
        this.statusString = (
        `Oops, something went wrong.` +
        `The wallet responded with error status (${rawResp.error}).`);
      }
    };
    chrome.runtime.sendMessage({type: 'create-reserve', detail: d}, cb);
  }

  onUrlChanged(url: string) {
    this.reset();
    this.url(url);
    this.timer.bump();
  }
}


function view(ctrl: Controller) {
  let controls = [];
  let mx = (x: string, ...args) => controls.push(m(x, ...args));

  mx("p",
     i18n`The bank wants to create a reserve over ${amountToPretty(
       ctrl.amount)}.`);
  mx("input",
     {
       className: "url",
       type: "text",
       spellcheck: false,
       value: ctrl.url(),
       oninput: m.withAttr("value", ctrl.onUrlChanged.bind(ctrl)),
     });

  mx("button", {
       onclick: () => ctrl.confirmReserve(ctrl.url(),
                                          ctrl.amount,
                                          ctrl.callbackUrl),
       disabled: !ctrl.isValidMint
     },
     "Confirm mint selection");

  if (ctrl.statusString) {
    mx("p", ctrl.statusString);
  } else {
    mx("p", "Checking URL, please wait ...");
  }

  return m("div", controls);
}


function getSuggestedMint(currency: string): Promise<string> {
  // TODO: make this request go to the wallet backend
  // Right now, this is a stub.
  const defaultMint = {
    "KUDOS": "http://mint.demo.taler.net",
    "PUDOS": "http://mint.test.taler.net",
  };

  let mint = defaultMint[currency];

  if (!mint) {
    mint = ""
  }

  return Promise.resolve(mint);
}


export function main() {
  const url = URI(document.location.href);
  const query: any = URI.parseQuery(url.query());
  const amount = AmountJson.checked(JSON.parse(query.amount));
  const callback_url = query.callback_url;
  const bank_url = query.bank_url;

  getSuggestedMint(amount.currency)
    .then((suggestedMintUrl) => {
      const controller = () => new Controller(suggestedMintUrl, amount, callback_url);
      var MintSelection = {controller, view};
      m.mount(document.getElementById("mint-selection"), MintSelection);
    })
    .catch((e) => {
      // TODO: provide more context information, maybe factor it out into a
      // TODO:generic error reporting function or component.
      document.body.innerText = `Fatal error: "${e.message}".`;
      console.error(`got backend error "${e.message}"`);
    });
}