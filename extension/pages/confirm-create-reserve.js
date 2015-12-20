"use strict";
var ConfirmCreateReserve;
(function (ConfirmCreateReserve) {
    let url = URI(document.location.href);
    let query = URI.parseQuery(url.query());
    function updateAmount() {
        let showAmount = document.getElementById("show-amount");
        console.log("Query is " + JSON.stringify(query));
        let s = query.amount_str;
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
    document.addEventListener("DOMContentLoaded", (e) => {
        updateAmount();
        document.getElementById("confirm").addEventListener("click", (e) => {
            let d = clone(query);
            d.mint = document.getElementById('mint-url').value;
            chrome.runtime.sendMessage({ type: 'confirm-reserve', detail: d }, (resp) => {
                if (resp.success === true) {
                    document.location.href = resp.backlink;
                }
                else {
                    document.body.innerHTML =
                        React.createElement("div", null, "Oops, something went wrong." + ' ' + "The bank responded with HTTP status code $", resp.status, "." + ' ' + "Here is some more info:", React.createElement("pre", null, resp.text), "`");
                }
            });
        });
    });
})(ConfirmCreateReserve || (ConfirmCreateReserve = {}));
