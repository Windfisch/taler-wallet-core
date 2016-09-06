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
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */


import {Wallet, Offer, Badge, ConfirmReserveRequest, CreateReserveRequest} from "./wallet";
import {deleteDb, exportDb, openTalerDb} from "./db";
import {BrowserHttpLib} from "./http";
import {Checkable} from "./checkable";
import {AmountJson} from "./types";
import Port = chrome.runtime.Port;
import {Notifier} from "./types";
import {Contract} from "./types";
import MessageSender = chrome.runtime.MessageSender;

"use strict";

/**
 * Messaging for the WebExtensions wallet.  Should contain
 * parts that are specific for WebExtensions, but as little business
 * logic as possible.
 *
 * @author Florian Dold
 */


type Handler = (detail: any, sender: MessageSender) => Promise<any>;

function makeHandlers(db: IDBDatabase,
                      wallet: Wallet): {[msg: string]: Handler} {
  return {
    ["balances"]: function(detail, sender) {
      return wallet.getBalances();
    },
    ["dump-db"]: function(detail, sender) {
      return exportDb(db);
    },
    ["ping"]: function(detail, sender) {
      return Promise.resolve({});
    },
    ["reset"]: function(detail, sender) {
      if (db) {
        let tx = db.transaction(db.objectStoreNames, 'readwrite');
        for (let i = 0; i < db.objectStoreNames.length; i++) {
          tx.objectStore(db.objectStoreNames[i]).clear();
        }
      }
      deleteDb();

      chrome.browserAction.setBadgeText({text: ""});
      console.log("reset done");
      // Response is synchronous
      return Promise.resolve({});
    },
    ["create-reserve"]: function(detail, sender) {
      const d = {
        exchange: detail.exchange,
        amount: detail.amount,
      };
      const req = CreateReserveRequest.checked(d);
      return wallet.createReserve(req);
    },
    ["confirm-reserve"]: function(detail, sender) {
      // TODO: make it a checkable
      const d = {
        reservePub: detail.reservePub
      };
      const req = ConfirmReserveRequest.checked(d);
      return wallet.confirmReserve(req);
    },
    ["confirm-pay"]: function(detail, sender) {
      let offer;
      try {
        offer = Offer.checked(detail.offer);
      } catch (e) {
        if (e instanceof Checkable.SchemaError) {
          console.error("schema error:", e.message);
          return Promise.resolve({
                                   error: "invalid contract",
                                   hint: e.message,
                                   detail: detail
                                 });
        } else {
          throw e;
        }
      }

      return wallet.confirmPay(offer);
    },
    ["check-pay"]: function(detail, sender) {
      let offer;
      try {
        offer = Offer.checked(detail.offer);
      } catch (e) {
        if (e instanceof Checkable.SchemaError) {
          console.error("schema error:", e.message);
          return Promise.resolve({
                                   error: "invalid contract",
                                   hint: e.message,
                                   detail: detail
                                 });
        } else {
          throw e;
        }
      }
      return wallet.checkPay(offer);
    },
    ["execute-payment"]: function(detail, sender) {
      return wallet.executePayment(detail.H_contract);
    },
    ["exchange-info"]: function(detail) {
      if (!detail.baseUrl) {
        return Promise.resolve({error: "bad url"});
      }
      return wallet.updateExchangeFromUrl(detail.baseUrl);
    },
    ["reserve-creation-info"]: function(detail, sender) {
      if (!detail.baseUrl || typeof detail.baseUrl !== "string") {
        return Promise.resolve({error: "bad url"});
      }
      let amount = AmountJson.checked(detail.amount);
      return wallet.getReserveCreationInfo(detail.baseUrl, amount);
    },
    ["check-repurchase"]: function(detail, sender) {
      let contract = Contract.checked(detail.contract);
      return wallet.checkRepurchase(contract);
    },
    ["get-history"]: function(detail, sender) {
      // TODO: limit history length
      return wallet.getHistory();
    },
    ["payment-failed"]: function(detail, sender) {
      // For now we just update exchanges (maybe the exchange did something
      // wrong and the keys were messed up).
      // FIXME: in the future we should look at what actually went wrong.
      console.error("payment reported as failed");
      wallet.updateExchanges();
      return Promise.resolve();
    },
  };
}


class ChromeBadge implements Badge {
  setText(s: string) {
    chrome.browserAction.setBadgeText({text: s});
  }

  setColor(c: string) {
    chrome.browserAction.setBadgeBackgroundColor({color: c});
  }

  startBusy() {
    this.setColor("#00F");
    this.setText("...");
  }

  stopBusy() {
    this.setText("");
  }
}


function dispatch(handlers, req, sender, sendResponse) {
  if (req.type in handlers) {
    Promise
      .resolve()
      .then(() => {
        const p = handlers[req.type](req.detail, sender);

        return p.then((r) => {
          sendResponse(r);
        })
      })
      .catch((e) => {
        console.log(`exception during wallet handler for '${req.type}'`);
        console.log("request", req);
        console.error(e);
        sendResponse({
                       error: "exception",
                       hint: e.message,
                       stack: e.stack.toString()
                     });
      });
    // The sendResponse call is async
    return true;
  } else {
    console.error(`Request type ${JSON.stringify(req)} unknown, req ${req.type}`);
    sendResponse({error: "request unknown"});
    // The sendResponse call is sync
    return false;
  }
}

class ChromeNotifier implements Notifier {
  ports: Port[] = [];

  constructor() {
    chrome.runtime.onConnect.addListener((port) => {
      console.log("got connect!");
      this.ports.push(port);
      port.onDisconnect.addListener(() => {
        let i = this.ports.indexOf(port);
        if (i >= 0) {
          this.ports.splice(i, 1);
        } else {
          console.error("port already removed");
        }
      });
    });
  }

  notify() {
    console.log("notifying all ports");
    for (let p of this.ports) {
      p.postMessage({notify: true});
    }
  }
}

function executePayment(contractHash: string, payUrl: string, offerUrl: string) {

}

function offerContractFromUrl(contractUrl: string) {

}


function handleHttpPayment(headerList: chrome.webRequest.HttpHeader[], url) {
  const headers = {};
  for (let kv of headerList) {
    headers[kv.name.toLowerCase()] = kv.value;
  }

  const contractUrl = headers["x-taler-contract-url"];
  if (contractUrl !== undefined) {
    // The web shop is proposing a contract, we need to fetch it
    // and show it to the user
    offerContractFromUrl(contractUrl);
    return;
  }

  const contractHash = headers["x-taler-contract-hash"];

  if (contractHash !== undefined) {
    const payUrl = headers["x-taler-pay-url"];
    if (payUrl === undefined) {
      console.log("malformed 402, X-Taler-Pay-Url missing");
      return;
    }

    // Offer URL is optional
    const offerUrl = headers["x-taler-offer-url"];
    executePayment(contractHash, payUrl, offerUrl);
    return;
  }

  // looks like it's not a taler request, it might be
  // for a different payment system (or the shop is buggy)
  console.log("ignoring non-taler 402 response");

}


export function wxMain() {
  chrome.browserAction.setBadgeText({text: ""});

  chrome.tabs.query({}, function(tabs) {
    for (let tab of tabs) {
      if (!tab.url) {
        return;
      }
      let uri = URI(tab.url);
      if (uri.protocol() == "http" || uri.protocol() == "https") {
        console.log("injecting into existing tab", tab.id);
        chrome.tabs.executeScript(tab.id, {file: "content_scripts/notify.js"});
      }
    }
  });

  Promise.resolve()
         .then(() => {
           return openTalerDb();
         })
         .catch((e) => {
           console.error("could not open database");
           console.error(e);
         })
         .then((db) => {
           let http = new BrowserHttpLib();
           let badge = new ChromeBadge();
           let notifier = new ChromeNotifier();
           let wallet = new Wallet(db, http, badge, notifier);

           // Handlers for messages coming directly from the content
           // script on the page
           let handlers = makeHandlers(db, wallet);
           chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
             try {
               return dispatch(handlers, req, sender, sendResponse)
             } catch (e) {
               console.log(`exception during wallet handler (dispatch)`);
               console.log("request", req);
               console.error(e);
               sendResponse({
                              error: "exception",
                              hint: e.message,
                              stack: e.stack.toString()
                            });
               return false;
             }
           });

           // Handlers for catching HTTP requests
           chrome.webRequest.onHeadersReceived.addListener((details) => {
             if (details.statusCode != 402) {
               return;
             }
             return handleHttpPayment(details.responseHeaders, details.url);
             details.responseHeaders
           }, {urls: ["<all_urls>"]}, ["responseHeaders"]);


         })
         .catch((e) => {
           console.error("could not initialize wallet messaging");
           console.error(e);
         });
}