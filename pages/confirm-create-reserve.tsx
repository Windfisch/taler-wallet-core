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


/**
 * Page shown to the user to confirm creation
 * of a reserve, usually requested by the bank.
 *
 * @author Florian Dold
 */

/// <reference path="../lib/decl/mithril.d.ts" />

import {amountToPretty, canonicalizeBaseUrl} from "../lib/wallet/helpers";
import {AmountJson, CreateReserveResponse} from "../lib/wallet/types";
import m from "mithril";
import {IExchangeInfo} from "../lib/wallet/types";
import {ReserveCreationInfo, Amounts} from "../lib/wallet/types";
import MithrilComponent = _mithril.MithrilComponent;
import {Denomination} from "../lib/wallet/types";
import {getReserveCreationInfo} from "../lib/wallet/wxApi";

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
  isValidExchange = false;
  reserveCreationInfo: ReserveCreationInfo = null;
  private timer: DelayTimer;
  private request: XMLHttpRequest;
  amount: AmountJson;
  callbackUrl: string;
  wtTypes: string[];
  detailCollapsed = m.prop<boolean>(true);
  suggestedExchangeUrl: string;
  complexViewRequested = false;
  urlOkay = false;

  constructor(suggestedExchangeUrl: string,
              amount: AmountJson,
              callbackUrl: string,
              wt_types: string[]) {
    console.log("creating main controller");
    this.suggestedExchangeUrl = suggestedExchangeUrl;
    this.amount = amount;
    this.callbackUrl = callbackUrl;
    this.wtTypes = wt_types;
    this.timer = new DelayTimer(800, () => this.update());
    this.url(suggestedExchangeUrl);
    this.update();
  }

  private update() {
    this.timer.stop();
    const doUpdate = () => {
      this.reserveCreationInfo = null;
      if (!this.url()) {
        this.statusString = i18n`Error: URL is empty`;
        m.redraw(true);
        return;
      }
      this.statusString = null;
      let parsedUrl = URI(this.url());
      if (parsedUrl.is("relative")) {
        this.statusString = i18n`Error: URL may not be relative`;
        m.redraw(true);
        return;
      }

      m.redraw(true);

      console.log("doing get exchange info");

      getReserveCreationInfo(this.url(), this.amount)
        .then((r: ReserveCreationInfo) => {
          console.log("get exchange info resolved");
          this.isValidExchange = true;
          this.reserveCreationInfo = r;
          console.dir(r);
          m.endComputation();
        })
        .catch((e) => {
          console.log("get exchange info rejected");
          if (e.hasOwnProperty("httpStatus")) {
            this.statusString = `Error: request failed with status ${this.request.status}`;
          } else if (e.hasOwnProperty("errorResponse")) {
            let resp = e.errorResponse;
            this.statusString = `Error: ${resp.error} (${resp.hint})`;
          }
          m.endComputation();
        });
    };

    doUpdate();

    console.log("got update", this.url());
  }

  reset() {
    this.isValidExchange = false;
    this.statusString = null;
    this.reserveCreationInfo = null;
    if (this.request) {
      this.request.abort();
      this.request = null;
    }
  }

  confirmReserve(rci: ReserveCreationInfo,
                 exchange: string,
                 amount: AmountJson,
                 callback_url: string) {
    const d = {exchange, amount};
    const cb = (rawResp) => {
      if (!rawResp) {
        throw Error("empty response");
      }
      // FIXME: filter out types that bank/exchange don't have in common
      let wire_details = rci.wireInfo;
      if (!rawResp.error) {
        const resp = CreateReserveResponse.checked(rawResp);
        let q: {[name: string]: string|number} = {
          wire_details: JSON.stringify(wire_details),
          exchange: resp.exchange,
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

function view(ctrl: Controller): any {
  let controls = [];
  let mx = (x, ...args) => controls.push(m(x, ...args));

  mx("p",
     i18n.parts`You are about to withdraw ${m("strong", amountToPretty(
       ctrl.amount))} from your bank account into your wallet.`);

  if (ctrl.complexViewRequested || !ctrl.suggestedExchangeUrl) {
    return controls.concat(viewComplex(ctrl));
  }

  return controls.concat(viewSimple(ctrl));
}

function viewSimple(ctrl: Controller) {
  let controls = [];
  let mx = (x, ...args) => controls.push(m(x, ...args));

  if (ctrl.statusString) {
    mx("p", "Error: ", ctrl.statusString);
    mx("button.linky", {
      onclick: () => {
        ctrl.complexViewRequested = true;
      }
    }, "advanced options");
  }
  else if (ctrl.reserveCreationInfo) {
    mx("button.accept", {
         onclick: () => ctrl.confirmReserve(ctrl.reserveCreationInfo,
                                            ctrl.url(),
                                            ctrl.amount,
                                            ctrl.callbackUrl),
         disabled: !ctrl.isValidExchange
       },
       "Accept fees and withdraw");
    mx("span.spacer");
    mx("button.linky", {
      onclick: () => {
        ctrl.complexViewRequested = true;
      }
    }, "advanced options");
    let totalCost = Amounts.add(ctrl.reserveCreationInfo.overhead,
                                ctrl.reserveCreationInfo.withdrawFee).amount;
    mx("p", `Withdraw cost: ${amountToPretty(totalCost)}`);
  } else {
    mx("p", "Please wait ...");
  }


  return controls;
}


function viewComplex(ctrl: Controller) {
  let controls = [];
  let mx = (x, ...args) => controls.push(m(x, ...args));

  mx("button.accept", {
       onclick: () => ctrl.confirmReserve(ctrl.reserveCreationInfo,
                                          ctrl.url(),
                                          ctrl.amount,
                                          ctrl.callbackUrl),
       disabled: !ctrl.isValidExchange
     },
     "Accept fees and withdraw");
  mx("span.spacer");
  mx("button.linky", {
    onclick: () => {
      ctrl.complexViewRequested = false;
    }
  }, "back to simple view");

  mx("br");


  mx("input",
     {
       className: "url",
       type: "text",
       spellcheck: false,
       value: ctrl.url(),
       oninput: m.withAttr("value", ctrl.onUrlChanged.bind(ctrl)),
     });

  mx("br");

  if (ctrl.statusString) {
    mx("p", ctrl.statusString);
  } else if (!ctrl.reserveCreationInfo) {
    mx("p", "Checking URL, please wait ...");
  }

  if (ctrl.reserveCreationInfo) {
    let totalCost = Amounts.add(ctrl.reserveCreationInfo.overhead,
                                ctrl.reserveCreationInfo.withdrawFee).amount;
    mx("p", `Withdraw cost: ${amountToPretty(totalCost)}`);
    if (ctrl.detailCollapsed()) {
      mx("button.linky", {
        onclick: () => {
          ctrl.detailCollapsed(false);
        }
      }, "show more details");
    } else {
      mx("button.linky", {
        onclick: () => {
          ctrl.detailCollapsed(true);
        }
      }, "hide details");
      mx("div", {}, renderReserveCreationDetails(ctrl.reserveCreationInfo))
    }
  }

  return m("div", controls);
}


function renderReserveCreationDetails(rci: ReserveCreationInfo) {
  let denoms = rci.selectedDenoms;

  let countByPub = {};
  let uniq = [];

  denoms.forEach((x: Denomination) => {
    let c = countByPub[x.denom_pub] || 0;
    if (c == 0) {
      uniq.push(x);
    }
    c += 1;
    countByPub[x.denom_pub] = c;
  });

  function row(denom: Denomination) {
    return m("tr", [
      m("td", countByPub[denom.denom_pub] + "x"),
      m("td", amountToPretty(denom.value)),
      m("td", amountToPretty(denom.fee_withdraw)),
      m("td", amountToPretty(denom.fee_refresh)),
      m("td", amountToPretty(denom.fee_deposit)),
    ]);
  }

  let withdrawFeeStr = amountToPretty(rci.withdrawFee);
  let overheadStr = amountToPretty(rci.overhead);
  return [
    m("p", `Fee for withdrawal: ${withdrawFeeStr}`),
    m("p", `Overhead: ${overheadStr}`),
    m("table", [
      m("tr", [
        m("th", "Count"),
        m("th", "Value"),
        m("th", "Withdraw Fee"),
        m("th", "Refresh Fee"),
        m("th", "Deposit Fee"),
      ]),
      uniq.map(row)
    ])
  ];
}


function getSuggestedExchange(currency: string): Promise<string> {
  // TODO: make this request go to the wallet backend
  // Right now, this is a stub.
  const defaultExchange = {
    "KUDOS": "https://exchange.demo.taler.net",
    "PUDOS": "https://exchange.test.taler.net",
  };

  let exchange = defaultExchange[currency];

  if (!exchange) {
    exchange = ""
  }

  return Promise.resolve(exchange);
}


export function main() {
  const url = URI(document.location.href);
  const query: any = URI.parseQuery(url.query());
  const amount = AmountJson.checked(JSON.parse(query.amount));
  const callback_url = query.callback_url;
  const bank_url = query.bank_url;
  const wt_types = JSON.parse(query.wt_types);

  getSuggestedExchange(amount.currency)
    .then((suggestedExchangeUrl) => {
      const controller = () => new Controller(suggestedExchangeUrl, amount, callback_url, wt_types);
      var ExchangeSelection = {controller, view};
      m.mount(document.getElementById("exchange-selection"), ExchangeSelection);
    })
    .catch((e) => {
      // TODO: provide more context information, maybe factor it out into a
      // TODO:generic error reporting function or component.
      document.body.innerText = `Fatal error: "${e.message}".`;
      console.error(`got backend error "${e.message}"`);
    });
}
