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
System.register(["./wallet", "./db", "./http"], function(exports_1) {
    "use strict";
    var wallet_1, db_1, db_2, db_3, http_1;
    var ChromeBadge;
    function makeHandlers(wallet) {
        return (_a = {},
            _a["balances"] = function (db, detail, sendResponse) {
                wallet.getBalances().then(sendResponse);
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
                db_2.deleteDb();
                chrome.browserAction.setBadgeText({ text: "" });
                console.log("reset done");
                // Response is synchronous
                return false;
            },
            _a["confirm-reserve"] = function (db, detail, sendResponse) {
                // TODO: make it a checkable
                var req = {
                    field_amount: detail.field_amount,
                    field_mint: detail.field_mint,
                    field_reserve_pub: detail.field_reserve_pub,
                    post_url: detail.post_url,
                    mint: detail.mint,
                    amount_str: detail.amount_str
                };
                wallet.confirmReserve(req)
                    .then(function (resp) {
                    if (resp.success) {
                        resp.backlink = chrome.extension.getURL("pages/reserve-success.html");
                    }
                    sendResponse(resp);
                });
                return true;
            },
            _a["confirm-pay"] = function (db, detail, sendResponse) {
                wallet.confirmPay(detail.offer, detail.merchantPageUrl)
                    .then(function () {
                    sendResponse({ success: true });
                })
                    .catch(function (e) {
                    sendResponse({ error: e.message });
                });
                return true;
            },
            _a["execute-payment"] = function (db, detail, sendResponse) {
                wallet.doPayment(detail.H_contract)
                    .then(function (r) {
                    sendResponse({
                        success: true,
                        payUrl: r.payUrl,
                        payReq: r.payReq
                    });
                })
                    .catch(function (e) {
                    sendResponse({ success: false, error: e.message });
                });
                // async sendResponse
                return true;
            },
            _a
        );
        var _a;
    }
    function wxMain() {
        chrome.browserAction.setBadgeText({ text: "" });
        db_3.openTalerDb().then(function (db) {
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
                db_2 = db_1_1;
                db_3 = db_1_1;
            },
            function (http_1_1) {
                http_1 = http_1_1;
            }],
        execute: function() {
            /**
             * Messaging for the WebExtensions wallet.  Should contain
             * parts that are specific for WebExtensions, but as little business
             * logic as possible.
             * @module Messaging
             * @author Florian Dold
             */
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
            wxMain();
        }
    }
});
//# sourceMappingURL=wxmessaging.js.map