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


/// <reference path="../lib/mithril.d.ts" />
/// <reference path="../lib/decl/lodash.d.ts" />

"use strict";


declare var m: any;
declare var i18n: any;

document.addEventListener("DOMContentLoaded", function(event) {
  m.route.mode = "hash";
  m.route(document.getElementById("content"), "/balance", {
    "/balance": WalletBalance,
    "/history": WalletHistory,
    "/debug": WalletDebug,
  });
  m.mount(document.getElementById("nav"), WalletNavBar);
});


function makeTab(target, name) {
  let cssClass = "";
  if (target == m.route()) {
    cssClass = "active";
  }
  return m("a", {config: m.route, href: target, "class": cssClass}, name);
}

var WalletNavBar = {
  view() {
    return m("div#header.nav", [
      makeTab("/balance", i18n`Balance`),
      makeTab("/history", i18n`History`),
      makeTab("/debug", i18n`Debug`),
    ]);
  }
};


function openInExtension(element, isInitialized) {
  element.addEventListener("click", (e) => {
    chrome.tabs.create({
                         "url": element.href
                       });
    e.preventDefault();
  });
}

var WalletBalance = {
  controller() {
    var myWallet;
    m.startComputation();
    chrome.runtime.sendMessage({type: "balances"}, (wallet) => {
      console.log("got wallet", wallet);
      myWallet = wallet;
      m.endComputation();
    });
    return () => myWallet;
  },

  view(getWallet) {
    let wallet = getWallet();
    if (!wallet) {
      throw Error("Could not retrieve wallet");
    }
    let listing = _.map(wallet, x => m("p", formatAmount(x)));
    if (listing.length > 0) {
      return listing;
    }
    let link = m("a[href=https://demo.taler.net]", {config: openInExtension}, i18n`free KUDOS`);
    return i18n.parts`You have no balance to show. Want to get some ${link}?`;
  }
};


function formatTimestamp(t) {
  let x = new Date(t);
  return x.toLocaleString();
}


function formatAmount(amount) {
  let v = amount.value + amount.fraction / 1e6;
  return `${v.toFixed(2)} ${amount.currency}`;
}

function formatHistoryItem(historyItem) {
  const d = historyItem.detail;
  const t = historyItem.timestamp;
  switch (historyItem.type) {
    case "create-reserve":
      return m("p",
               i18n`Created reserve of ${formatAmount(d.requestedAmount)} at ${formatTimestamp(
                 t)}`);
    case "withdraw":
      return m("p",
               i18n`Withdraw at ${formatTimestamp(t)}`);
    case "pay":
      return m("p",
               [
                 i18n`Payment for ${formatAmount(d.amount)} to merchant ${d.merchantName}. `,
                 m("a[href=javascript:;]", "Retry")
               ]);
    default:
      return m("p", i18n`Unknown event (${historyItem.type})`);
  }
}


var WalletHistory = {
  controller() {
    var myHistory;
    m.startComputation();
    chrome.runtime.sendMessage({type: "get-history"}, (wallet) => {
      console.log("got history", history);
      myHistory = wallet;
      m.endComputation();
    });
    return () => myHistory;
  },

  view(getHistory) {
    let history = getHistory();
    if (!history) {
      throw Error("Could not retrieve history");
    }
    let listing = _.map(history, formatHistoryItem);
    if (listing.length > 0) {
      return listing;
    }
    return i18n`Your wallet has no events recorded.`;
  }
};


function confirmReset() {
  if (confirm("Do you want to IRREVOCABLY DESTROY everything inside your" +
              " wallet and LOSE ALL YOUR COINS?")) {
    chrome.runtime.sendMessage({type: "reset"});
    window.close();
    try {
      chrome.runtime.reload();
    } catch (e) {
      // Functionality missing in firefox, ignore!
    }

  }
}


var WalletDebug = {
  view() {
    return [
      m("button", {onclick: openWalletAsTab}, "wallet tab"),
      m("button", {onclick: confirmReset}, "reset")
    ]
  }
};


function openWalletAsTab() {
  chrome.tabs.create({
                       "url": chrome.extension.getURL("popup/popup.html")
                     });
}
