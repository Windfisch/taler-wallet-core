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


import {Wallet, Offer, Badge, ConfirmReserveRequest, CreateReserveRequest} from "./wallet";
import {deleteDb, exportDb, openTalerDb} from "./db";
import {BrowserHttpLib} from "./http";
import {Checkable} from "./checkable";
import {AmountJson} from "./types";
import Port = chrome.runtime.Port;
import {Notifier} from "./types";

"use strict";

/**
 * Messaging for the WebExtensions wallet.  Should contain
 * parts that are specific for WebExtensions, but as little business
 * logic as possible.
 *
 * @author Florian Dold
 */


type Handler = (detail: any) => Promise<any>;

function makeHandlers(db: IDBDatabase,
                      wallet: Wallet): {[msg: string]: Handler} {
  return {
    ["balances"]: function(detail) {
      return wallet.getBalances();
    },
    ["dump-db"]: function(detail) {
      return exportDb(db);
    },
    ["reset"]: function(detail) {
      let tx = db.transaction(db.objectStoreNames, 'readwrite');
      for (let i = 0; i < db.objectStoreNames.length; i++) {
        tx.objectStore(db.objectStoreNames[i]).clear();
      }
      deleteDb();

      chrome.browserAction.setBadgeText({text: ""});
      console.log("reset done");
      // Response is synchronous
      return Promise.resolve({});
    },
    ["create-reserve"]: function(detail) {
      const d = {
        mint: detail.mint,
        amount: detail.amount,
      };
      const req = CreateReserveRequest.checked(d);
      return wallet.createReserve(req);
    },
    ["confirm-reserve"]: function(detail) {
      // TODO: make it a checkable
      const d = {
        reservePub: detail.reservePub
      };
      const req = ConfirmReserveRequest.checked(d);
      return wallet.confirmReserve(req);
    },
    ["confirm-pay"]: function(detail) {
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
    ["execute-payment"]: function(detail) {
      return wallet.executePayment(detail.H_contract);
    },
    ["mint-info"]: function(detail) {
      if (!detail.baseUrl) {
        return Promise.resolve({error: "bad url"});
      }
      return wallet.updateMintFromUrl(detail.baseUrl);
    },
    ["reserve-creation-info"]: function(detail) {
      if (!detail.baseUrl || typeof detail.baseUrl !== "string") {
        return Promise.resolve({error: "bad url"});
      }
      let amount = AmountJson.checked(detail.amount);
      return wallet.getReserveCreationInfo(detail.baseUrl, amount);
    },
    ["get-history"]: function(detail) {
      // TODO: limit history length
      return wallet.getHistory();
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
}


function dispatch(handlers, req, sendResponse) {
  if (req.type in handlers) {
    Promise
      .resolve()
      .then(() => {
        const p = handlers[req.type](req.detail);

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


export function wxMain() {
  chrome.browserAction.setBadgeText({text: ""});

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
           let handlers = makeHandlers(db, wallet);
           chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
             try {
               return dispatch(handlers, req, sendResponse)
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
         })
         .catch((e) => {
           console.error("could not initialize wallet messaging");
           console.error(e);
         });
}