/*
 This file is part of TALER
 (C) 2015 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
 */
System.register(["../lib/web-common"], function(exports_1, context_1) {
    /// <reference path="../lib/decl/handlebars/handlebars.d.ts" />
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var web_common_1;
    function prettyAmount(amount) {
        var v = amount.value + amount.fraction / 1e6;
        return v.toFixed(2) + " " + amount.currency;
    }
    function main() {
        var url = URI(document.location.href);
        var query = URI.parseQuery(url.query());
        var offer = JSON.parse(query.offer);
        console.dir(offer);
        var contract = offer.contract;
        var error = null;
        var Contract = {
            view: function (ctrl) {
                return [
                    m("p", (_a = ["Hello, this is the wallet.  The merchant \"", "\"\n               wants to enter a contract over ", "\n               with you."], _a.raw = ["Hello, this is the wallet.  The merchant \"", "\"\n               wants to enter a contract over ", "\n               with you."], i18n(_a, contract.merchant.name, prettyAmount(contract.amount)))),
                    m("p", (_b = ["The contract contains the following products:"], _b.raw = ["The contract contains the following products:"], i18n(_b))),
                    m('ul', _.map(contract.products, function (p) { return m("li", p.description + ": " + prettyAmount(p.price)); })),
                    m("button", { onclick: doPayment }, (_c = ["Confirm Payment"], _c.raw = ["Confirm Payment"], i18n(_c))),
                    m("p", error ? error : []),
                ];
                var _a, _b, _c;
            }
        };
        m.mount(document.getElementById("contract"), Contract);
        function doPayment() {
            var d = {
                offer: offer
            };
            chrome.runtime.sendMessage({ type: 'confirm-pay', detail: d }, function (resp) {
                if (!resp.success) {
                    console.log("confirm-pay error", JSON.stringify(resp));
                    error = resp.message;
                    m.redraw();
                    return;
                }
                var c = d.offer.contract;
                console.log("contract", c);
                document.location.href = web_common_1.substituteFulfillmentUrl(c.fulfillment_url, offer);
            });
        }
    }
    exports_1("main", main);
    return {
        setters:[
            function (web_common_1_1) {
                web_common_1 = web_common_1_1;
            }],
        execute: function() {
        }
    }
});
//# sourceMappingURL=confirm-contract.js.map