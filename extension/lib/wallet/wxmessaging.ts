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

"use strict";

/**
 * Messaging for the WebExtensions wallet.  Should contain
 * parts that are specific for WebExtensions, but as little business
 * logic as possible.
 *
 * @author Florian Dold
 */


function makeHandlers(wallet: Wallet) {
  return {
    ["balances"]: function(db, detail, sendResponse) {
      wallet.getBalances()
            .then(sendResponse)
            .catch((e) => {
              console.log("exception during 'balances'");
              console.error(e.stack);
            });
      return true;
    },
    ["dump-db"]: function(db, detail, sendResponse) {
      exportDb(db).then(sendResponse);
      return true;
    },
    ["reset"]: function(db, detail, sendResponse) {
      let tx = db.transaction(db.objectStoreNames, 'readwrite');
      for (let i = 0; i < db.objectStoreNames.length; i++) {
        tx.objectStore(db.objectStoreNames[i]).clear();
      }
      deleteDb();

      chrome.browserAction.setBadgeText({text: ""});
      console.log("reset done");
      // Response is synchronous
      return false;
    },
    ["create-reserve"]: function(db, detail, sendResponse) {
      const d = {
        mint: detail.mint,
        amount: detail.amount,
      };
      const req = CreateReserveRequest.checked(d);
      wallet.createReserve(req)
            .then((resp) => {
              sendResponse(resp);
            })
            .catch((e) => {
              sendResponse({error: "exception"});
              console.error("exception during 'create-reserve'");
              console.error(e.stack);
            });
      return true;
    },
    ["confirm-reserve"]: function(db, detail, sendResponse) {
      // TODO: make it a checkable
      const d = {
        reservePub: detail.reservePub
      };
      const req = ConfirmReserveRequest.checked(d);
      wallet.confirmReserve(req)
            .then((resp) => {
              sendResponse(resp);
            })
            .catch((e) => {
              sendResponse({error: "exception"});
              console.error("exception during 'confirm-reserve'");
              console.error(e.stack);
            });
      return true;
    },
    ["confirm-pay"]: function(db, detail, sendResponse) {
      console.log("in confirm-pay handler");
      const offer = Offer.checked(detail.offer);
      wallet.confirmPay(offer)
            .then((r) => {
              sendResponse(r)
            })
            .catch((e) => {
              console.error("exception during 'confirm-pay'");
              console.error(e.stack);
              sendResponse({error: e.message});
            });
      return true;
    },
    ["execute-payment"]: function(db, detail, sendResponse) {
      wallet.executePayment(detail.H_contract)
            .then((r) => {
              sendResponse(r);
            })
            .catch((e) => {
              console.error("exception during 'execute-payment'");
              console.error(e.stack);
              sendResponse({error: e.message});
            });
      // async sendResponse
      return true;
    },
    ["get-history"]: function(db, detail, sendResponse) {
      // TODO: limit history length
      wallet.getHistory()
            .then((h) => {
              sendResponse(h);
            })
            .catch((e) => {
              console.error("exception during 'get-history'");
              console.error(e.stack);
            });
      return true;
    },
    ["error-fatal"]: function(db, detail, sendResponse) {
      console.log("fatal error from page", detail.url);
    }
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


export function wxMain() {
  chrome.browserAction.setBadgeText({text: ""});

  openTalerDb()
    .then((db) => {
      let http = new BrowserHttpLib();
      let badge = new ChromeBadge();
      let wallet = new Wallet(db, http, badge);
      let handlers = makeHandlers(wallet);
      chrome.runtime.onMessage.addListener(
        function(req, sender, onresponse) {
          if (req.type in handlers) {
            return handlers[req.type](db, req.detail, onresponse);
          }
          console.error(`Request type ${JSON.stringify(req)} unknown, req ${req.type}`);
          onresponse({error: "request unknown"});
          return false;
        });
    })
    .catch((e) => {
      console.error("could not open database:");
      console.error(e.stack);
    });
}