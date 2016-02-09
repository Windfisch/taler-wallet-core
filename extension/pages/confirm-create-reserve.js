/*
 This file is part of TALER
 (C) 2015-2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
 */
System.register(["../lib/wallet/types", "../lib/web-common"], function(exports_1) {
    "use strict";
    var types_1, web_common_1, types_2;
    function main() {
        function updateAmount() {
            var showAmount = document.getElementById("show-amount");
            console.log("Query is " + JSON.stringify(query));
            var amount = types_1.AmountJson.checked(JSON.parse(query.amount));
            showAmount.textContent = web_common_1.amountToPretty(amount);
        }
        var url = URI(document.location.href);
        var query = URI.parseQuery(url.query());
        updateAmount();
        document.getElementById("confirm").addEventListener("click", function (e) {
            var d = {
                mint: document.getElementById('mint-url').value,
                amount: JSON.parse(query.amount)
            };
            if (!d.mint) {
                // FIXME: indicate error instead!
                throw Error("mint missing");
            }
            if (!d.amount) {
                // FIXME: indicate error instead!
                throw Error("amount missing");
            }
            var cb = function (rawResp) {
                if (!rawResp) {
                    throw Error("empty response");
                }
                if (!rawResp.error) {
                    var resp = types_2.CreateReserveResponse.checked(rawResp);
                    var q = {
                        mint: resp.mint,
                        reserve_pub: resp.reservePub,
                        amount: query.amount,
                    };
                    var url_1 = URI(query.callback_url).addQuery(q);
                    if (!url_1.is("absolute")) {
                        throw Error("callback url is not absolute");
                    }
                    document.location.href = url_1.href();
                }
                else {
                    document.body.innerHTML =
                        "Oops, something went wrong.  It looks like the bank could not\n            transfer funds to the mint.  Please go back to your bank's website\n            to check what happened.";
                }
            };
            chrome.runtime.sendMessage({ type: 'create-reserve', detail: d }, cb);
        });
    }
    exports_1("main", main);
    return {
        setters:[
            function (types_1_1) {
                types_1 = types_1_1;
                types_2 = types_1_1;
            },
            function (web_common_1_1) {
                web_common_1 = web_common_1_1;
            }],
        execute: function() {
            "use strict";
        }
    }
});
//# sourceMappingURL=confirm-create-reserve.js.map