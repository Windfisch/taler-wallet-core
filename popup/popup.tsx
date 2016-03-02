/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

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
 * Popup shown to the user when they click
 * the Taler browser action button.
 *
 * @author Florian Dold
 */


/// <reference path="../lib/decl/mithril.d.ts" />
/// <reference path="../lib/decl/lodash.d.ts" />

"use strict";

import {substituteFulfillmentUrl} from "../lib/wallet/helpers";

declare var m: any;
declare var i18n: any;


function onUpdateNotification(f) {
  let port = chrome.runtime.connect({name: "notifications"});
  port.onMessage.addListener((msg, port) => {
    f();
  });
}


export function main() {
  console.log("popup main");
  m.route.mode = "hash";
  m.route(document.getElementById("content"), "/balance", {
    "/balance": WalletBalance,
    "/history": WalletHistory,
    "/debug": WalletDebug,
  });
  m.mount(document.getElementById("nav"), WalletNavBar);
}

console.log("this is popup");


function makeTab(target, name) {
  let cssClass = "";
  if (target == m.route()) {
    cssClass = "active";
  }
  return m("a", {config: m.route, href: target, "class": cssClass}, name);
}

namespace WalletNavBar {
  export function view() {
    return m("div#header.nav", [
      makeTab("/balance", i18n`Balance`),
      makeTab("/history", i18n`History`),
      makeTab("/debug", i18n`Debug`),
    ]);
  }

  export function controller() {
    // empty
  }
}


function openInExtension(element, isInitialized) {
  element.addEventListener("click", (e) => {
    chrome.tabs.create({
                         "url": element.href
                       });
    e.preventDefault();
  });
}

namespace WalletBalance {
  export function controller() {
    return new Controller();
  }

  class Controller {
    myWallet;
    gotError = false;

    constructor() {
      this.updateBalance();

      onUpdateNotification(() => this.updateBalance());
    }

    updateBalance() {
      m.startComputation();
      chrome.runtime.sendMessage({type: "balances"}, (resp) => {
        if (resp.error) {
          this.gotError = true;
          console.error("could not retrieve balances", resp);
          m.endComputation();
          return;
        }
        this.gotError = false;
        console.log("got wallet", resp);
        this.myWallet = resp.balances;
        m.endComputation();
      });
    }
  }

  export function view(ctrl: Controller) {
    let wallet = ctrl.myWallet;
    if (ctrl.gotError) {
      return i18n`Error: could not retrieve balance information.`;
    }
    if (!wallet) {
      throw Error("Could not retrieve wallet");
    }
    let listing = _.map(wallet, x => m("p", formatAmount(x)));
    if (listing.length > 0) {
      return listing;
    }
    let link = m("a[href=https://demo.taler.net]",
                 {config: openInExtension},
                 i18n`free KUDOS`);

    return i18n.parts`You have no balance to show. Want to get some ${link}?`;
  }
}


function formatTimestamp(t) {
  let x = new Date(t);
  return x.toLocaleString();
}


function formatAmount(amount) {
  let v = amount.value + amount.fraction / 1e6;
  return `${v.toFixed(2)} ${amount.currency}`;
}


function abbrevKey(s: string) {
  return m("span.abbrev", {title: s}, (s.slice(0, 5) + ".."))
}


function retryPayment(url, contractHash) {
  return function() {
    chrome.tabs.create({
                         "url": substituteFulfillmentUrl(url,
                                                         {H_contract: contractHash})
                       });
  }
}


function formatHistoryItem(historyItem) {
  const d = historyItem.detail;
  const t = historyItem.timestamp;
  console.log("hist item", historyItem);
  switch (historyItem.type) {
    case "create-reserve":
      return m("p",
               i18n.parts`Created reserve (${abbrevKey(d.reservePub)}) of ${formatAmount(
                 d.requestedAmount)} at ${formatTimestamp(
                 t)}`);
    case "confirm-reserve":
      return m("p",
               i18n.parts`Bank confirmed reserve (${abbrevKey(d.reservePub)}) at ${formatTimestamp(
                 t)}`);
    case "withdraw":
      return m("p",
               i18n`Withdraw at ${formatTimestamp(t)}`);
    case "depleted-reserve":
      return m("p",
               i18n.parts`Wallet depleted reserve (${abbrevKey(d.reservePub)}) at ${formatTimestamp(t)}`);
    case "pay":
      let url = substituteFulfillmentUrl(d.fulfillmentUrl,
                                         {H_contract: d.contractHash});
      return m("p",
               [
                 i18n`Payment for ${formatAmount(d.amount)} to merchant ${d.merchantName}. `,
                 m(`a`,
                   {href: url, onclick: openTab(url)},
                   "Retry")
               ]);
    default:
      return m("p", i18n`Unknown event (${historyItem.type})`);
  }
}


namespace WalletHistory {
  export function controller() {
    return new Controller();
  }

  class Controller {
    myHistory;
    gotError = false;

    constructor() {
      this.update();
      onUpdateNotification(() => this.update());
    }

    update() {
      m.startComputation();
      chrome.runtime.sendMessage({type: "get-history"}, (resp) => {
        if (resp.error) {
          this.gotError = true;
          console.error("could not retrieve history", resp);
          m.endComputation();
          return;
        }
        this.gotError = false;
        console.log("got history", resp.history);
        this.myHistory = resp.history;
        m.endComputation();
      });
    }
  }

  export function view(ctrl: Controller) {
    let history = ctrl.myHistory;
    if (ctrl.gotError) {
      return i18n`Error: could not retrieve event history`;
    }
    if (!history) {
      throw Error("Could not retrieve history");
    }
    let listing = _.map(history, formatHistoryItem);
    if (listing.length > 0) {
      return m("div.container", listing);
    }
    return i18n`Your wallet has no events recorded.`;
  }
}


function reload() {
  try {
    chrome.runtime.reload();
    window.close();
  } catch (e) {
    // Functionality missing in firefox, ignore!
  }
}

function confirmReset() {
  if (confirm("Do you want to IRREVOCABLY DESTROY everything inside your" +
              " wallet and LOSE ALL YOUR COINS?")) {
    chrome.runtime.sendMessage({type: "reset"});
    window.close();
  }
}


var WalletDebug = {
  view() {
    return [
      m("button",
        {onclick: openExtensionPage("popup/popup.html")},
        "wallet tab"),
      m("button",
        {onclick: openExtensionPage("pages/show-db.html")},
        "show db"),
      m("br"),
      m("button", {onclick: confirmReset}, "reset"),
      m("button", {onclick: reload}, "reload chrome extension"),
    ]
  }
};


function openExtensionPage(page) {
  return function() {
    chrome.tabs.create({
                         "url": chrome.extension.getURL(page)
                       });
  }
}


function openTab(page) {
  return function() {
    chrome.tabs.create({
                         "url": page
                       });
  }
}
