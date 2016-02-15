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
System.register(["../lib/wallet/helpers"], function(exports_1, context_1) {
    /// <reference path="../lib/decl/handlebars/handlebars.d.ts" />
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var helpers_1;
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
                    m("p", (_a = ["", "\n               wants to enter a contract over ", "\n               with you."], _a.raw = ["", "\n               wants to enter a contract over ", "\n               with you."], i18n.parts(_a, m("strong", contract.merchant.name), m("strong", prettyAmount(contract.amount))))),
                    m("p", (_b = ["You are about to purchase:"], _b.raw = ["You are about to purchase:"], i18n(_b))),
                    m('ul', _.map(contract.products, function (p) { return m("li", p.description + ": " + prettyAmount(p.price)); })),
                    m("button.confirm-pay", { onclick: doPayment }, (_c = ["Confirm Payment"], _c.raw = ["Confirm Payment"], i18n(_c))),
                    m("p", error ? error : []),
                ];
                var _a, _b, _c;
            }
        };
        m.mount(document.getElementById("contract"), Contract);
        function doPayment() {
            var d = { offer: offer };
            chrome.runtime.sendMessage({ type: 'confirm-pay', detail: d }, function (resp) {
                if (resp.error) {
                    console.log("confirm-pay error", JSON.stringify(resp));
                    switch (resp.error) {
                        case "coins-insufficient":
                            error = "You do not have enough coins of the requested currency.";
                            break;
                        default:
                            error = "Error: " + resp.error;
                            break;
                    }
                    m.redraw();
                    return;
                }
                var c = d.offer.contract;
                console.log("contract", c);
                document.location.href = helpers_1.substituteFulfillmentUrl(c.fulfillment_url, offer);
            });
        }
    }
    exports_1("main", main);
    return {
        setters:[
            function (helpers_1_1) {
                helpers_1 = helpers_1_1;
            }],
        execute: function() {
        }
    }
});
//# sourceMappingURL=confirm-contract.js.map