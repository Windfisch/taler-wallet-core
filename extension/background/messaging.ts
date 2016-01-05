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
 * Messaging for the WebExtensions wallet.  Should contain
 * parts that are specific for WebExtensions, but as little business
 * logic as possible.
 * @module Messaging
 * @author Florian Dold
 */

"use strict";

let handlers = {
  ["balances"]: function(db, detail, sendResponse) {
    getBalances(db).then(sendResponse);
    return true;
  },
  ["dump-db"]: function(db, detail, sendResponse) {
    exportDb(db).then(sendResponse);
    return true;
  },
  ["reset-db"]: function(db, detail, sendResponse) {
    let tx = db.transaction(db.objectStoreNames, 'readwrite');
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      tx.objectStore(db.objectStoreNames[i]).clear();
    }
    indexedDB.deleteDatabase(DB_NAME);
    chrome.browserAction.setBadgeText({text: ""});
    console.log("reset done");
    // Response is synchronous
    return false;
  },
  ["confirm-reserve"]: function(db, detail, sendResponse) {
    return confirmReserveHandler(db, detail, sendResponse);
  }
};


function wxMain() {
  chrome.browserAction.setBadgeText({text: ""});

  openTalerDb().then((db) => {
    updateBadge(db);
    chrome.runtime.onMessage.addListener(
      function(req, sender, onresponse) {
        if (req.type in handlers) {
          return handlers[req.type](db, req.detail, onresponse);
        }
        console.error(format("Request type {1} unknown, req {0}",
                             JSON.stringify(req),
                             req.type));
        return false;
      });
  });
}

wxMain();