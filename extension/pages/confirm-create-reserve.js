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
"use strict";
var ConfirmCreateReserve;
(function (ConfirmCreateReserve) {
    var url = URI(document.location.href);
    var query = URI.parseQuery(url.query());
    function updateAmount() {
        var showAmount = document.getElementById("show-amount");
        console.log("Query is " + JSON.stringify(query));
        var s = query.amount_str;
        if (!s) {
            document.body.innerHTML = "Oops, something went wrong.";
            return;
        }
        showAmount.textContent = s;
    }
    function clone(obj) {
        // This is faster than it looks ...
        return JSON.parse(JSON.stringify(obj));
    }
    document.addEventListener("DOMContentLoaded", function (e) {
        updateAmount();
        document.getElementById("confirm").addEventListener("click", function (e) {
            var d = clone(query);
            d.mint = document.getElementById('mint-url').value;
            chrome.runtime.sendMessage({ type: 'confirm-reserve', detail: d }, function (resp) {
                if (resp.success === true) {
                    document.location.href = resp.backlink;
                }
                else {
                    document.body.innerHTML =
                        "\n              Oops, something went wrong.\n             The bank responded with HTTP status code " + resp.status + ".\n             Here is some more info:\n              <pre>" + resp.text + "</pre>\n            </div>";
                }
            });
        });
    });
})(ConfirmCreateReserve || (ConfirmCreateReserve = {}));
//# sourceMappingURL=confirm-create-reserve.js.map