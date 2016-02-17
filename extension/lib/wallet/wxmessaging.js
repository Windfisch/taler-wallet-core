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
System.register(["./wallet", "./db", "./http", "./checkable"], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var wallet_1, db_1, http_1, checkable_1;
    var ChromeBadge;
    function makeHandlers(db, wallet) {
        return (_a = {},
            _a["balances"] = function (detail) {
                return wallet.getBalances();
            },
            _a["dump-db"] = function (detail) {
                return db_1.exportDb(db);
            },
            _a["reset"] = function (detail) {
                var tx = db.transaction(db.objectStoreNames, 'readwrite');
                for (var i = 0; i < db.objectStoreNames.length; i++) {
                    tx.objectStore(db.objectStoreNames[i]).clear();
                }
                db_1.deleteDb();
                chrome.browserAction.setBadgeText({ text: "" });
                console.log("reset done");
                // Response is synchronous
                return Promise.resolve({});
            },
            _a["create-reserve"] = function (detail) {
                var d = {
                    mint: detail.mint,
                    amount: detail.amount,
                };
                var req = wallet_1.CreateReserveRequest.checked(d);
                return wallet.createReserve(req);
            },
            _a["confirm-reserve"] = function (detail) {
                // TODO: make it a checkable
                var d = {
                    reservePub: detail.reservePub
                };
                var req = wallet_1.ConfirmReserveRequest.checked(d);
                return wallet.confirmReserve(req);
            },
            _a["confirm-pay"] = function (detail) {
                var offer;
                try {
                    offer = wallet_1.Offer.checked(detail.offer);
                }
                catch (e) {
                    if (e instanceof checkable_1.Checkable.SchemaError) {
                        console.error("schema error:", e.message);
                        return Promise.resolve({ error: "invalid contract", hint: e.message });
                    }
                    else {
                        throw e;
                    }
                }
                return wallet.confirmPay(offer);
            },
            _a["execute-payment"] = function (detail) {
                return wallet.executePayment(detail.H_contract);
            },
            _a["get-history"] = function (detail) {
                // TODO: limit history length
                return wallet.getHistory();
            },
            _a
        );
        var _a;
    }
    function dispatch(handlers, db, req, sendResponse) {
        if (req.type in handlers) {
            Promise
                .resolve()
                .then(function () {
                var p = handlers[req.type](db, req.detail);
                return p.then(function (r) {
                    sendResponse(r);
                });
            })
                .catch(function (e) {
                console.log("exception during wallet handler'");
                console.error(e.stack);
                sendResponse({
                    error: "exception",
                    hint: e.message,
                    stack: e.stack.toString()
                });
            });
            // The sendResponse call is async
            return true;
        }
        else {
            console.error("Request type " + JSON.stringify(req) + " unknown, req " + req.type);
            sendResponse({ error: "request unknown" });
            // The sendResponse call is sync
            return false;
        }
    }
    function wxMain() {
        chrome.browserAction.setBadgeText({ text: "" });
        Promise.resolve()
            .then(function () {
            return db_1.openTalerDb();
        })
            .catch(function (e) {
            console.error("could not open database");
            console.error(e);
        })
            .then(function (db) {
            var http = new http_1.BrowserHttpLib();
            var badge = new ChromeBadge();
            var wallet = new wallet_1.Wallet(db, http, badge);
            var handlers = makeHandlers(db, wallet);
            chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
                return dispatch(handlers, db, req, sendResponse);
            });
        })
            .catch(function (e) {
            console.error("could not initialize wallet messaging");
            console.error(e);
        });
    }
    exports_1("wxMain", wxMain);
    return {
        setters:[
            function (wallet_1_1) {
                wallet_1 = wallet_1_1;
            },
            function (db_1_1) {
                db_1 = db_1_1;
            },
            function (http_1_1) {
                http_1 = http_1_1;
            },
            function (checkable_1_1) {
                checkable_1 = checkable_1_1;
            }],
        execute: function() {
            "use strict";
            ChromeBadge = (function () {
                function ChromeBadge() {
                }
                ChromeBadge.prototype.setText = function (s) {
                    chrome.browserAction.setBadgeText({ text: s });
                };
                ChromeBadge.prototype.setColor = function (c) {
                    chrome.browserAction.setBadgeBackgroundColor({ color: c });
                };
                return ChromeBadge;
            }());
        }
    }
});
//# sourceMappingURL=wxmessaging.js.map