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
System.register(["./wallet", "./db", "./http"], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var wallet_1, db_1, http_1;
    var ChromeBadge;
    /**
     * Messaging for the WebExtensions wallet.  Should contain
     * parts that are specific for WebExtensions, but as little business
     * logic as possible.
     *
     * @author Florian Dold
     */
    function makeHandlers(wallet) {
        return (_a = {},
            _a["balances"] = function (db, detail, sendResponse) {
                wallet.getBalances()
                    .then(sendResponse)
                    .catch(function (e) {
                    console.log("exception during 'balances'");
                    console.error(e.stack);
                });
                return true;
            },
            _a["dump-db"] = function (db, detail, sendResponse) {
                db_1.exportDb(db).then(sendResponse);
                return true;
            },
            _a["reset"] = function (db, detail, sendResponse) {
                var tx = db.transaction(db.objectStoreNames, 'readwrite');
                for (var i = 0; i < db.objectStoreNames.length; i++) {
                    tx.objectStore(db.objectStoreNames[i]).clear();
                }
                db_1.deleteDb();
                chrome.browserAction.setBadgeText({ text: "" });
                console.log("reset done");
                // Response is synchronous
                return false;
            },
            _a["create-reserve"] = function (db, detail, sendResponse) {
                var d = {
                    mint: detail.mint,
                    amount: detail.amount,
                };
                var req = wallet_1.CreateReserveRequest.checked(d);
                wallet.createReserve(req)
                    .then(function (resp) {
                    sendResponse(resp);
                })
                    .catch(function (e) {
                    sendResponse({ error: "exception" });
                    console.error("exception during 'create-reserve'");
                    console.error(e.stack);
                });
                return true;
            },
            _a["confirm-reserve"] = function (db, detail, sendResponse) {
                // TODO: make it a checkable
                var d = {
                    reservePub: detail.reservePub
                };
                var req = wallet_1.ConfirmReserveRequest.checked(d);
                wallet.confirmReserve(req)
                    .then(function (resp) {
                    sendResponse(resp);
                })
                    .catch(function (e) {
                    sendResponse({ error: "exception" });
                    console.error("exception during 'confirm-reserve'");
                    console.error(e.stack);
                });
                return true;
            },
            _a["confirm-pay"] = function (db, detail, sendResponse) {
                var offer = wallet_1.Offer.checked(detail.offer);
                wallet.confirmPay(offer)
                    .then(function () {
                    sendResponse({});
                })
                    .catch(function (e) {
                    console.error("exception during 'confirm-pay'");
                    console.error(e.stack);
                    sendResponse({ error: e.message });
                });
                return true;
            },
            _a["execute-payment"] = function (db, detail, sendResponse) {
                wallet.executePayment(detail.H_contract)
                    .then(function (r) {
                    sendResponse(r);
                })
                    .catch(function (e) {
                    console.error("exception during 'execute-payment'");
                    console.error(e.stack);
                    sendResponse({ error: e.message });
                });
                // async sendResponse
                return true;
            },
            _a["get-history"] = function (db, detail, sendResponse) {
                // TODO: limit history length
                wallet.getHistory()
                    .then(function (h) {
                    sendResponse(h);
                })
                    .catch(function (e) {
                    console.error("exception during 'get-history'");
                    console.error(e.stack);
                });
                return true;
            },
            _a["error-fatal"] = function (db, detail, sendResponse) {
                console.log("fatal error from page", detail.url);
            },
            _a
        );
        var _a;
    }
    function wxMain() {
        chrome.browserAction.setBadgeText({ text: "" });
        db_1.openTalerDb()
            .then(function (db) {
            var http = new http_1.BrowserHttpLib();
            var badge = new ChromeBadge();
            var wallet = new wallet_1.Wallet(db, http, badge);
            var handlers = makeHandlers(wallet);
            wallet.updateBadge();
            chrome.runtime.onMessage.addListener(function (req, sender, onresponse) {
                if (req.type in handlers) {
                    return handlers[req.type](db, req.detail, onresponse);
                }
                console.error("Request type " + JSON.stringify(req) + " unknown, req " + req.type);
                return false;
            });
        })
            .catch(function (e) {
            console.error("could not open database:");
            console.error(e.stack);
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