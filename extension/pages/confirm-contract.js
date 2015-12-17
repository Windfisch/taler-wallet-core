/// <reference path="../decl/handlebars/handlebars.d.ts" />
"use strict";
let url = URI(document.location.href);
let query = URI.parseQuery(url.query());
let $_ = (x) => document.getElementById(x);
function renderContract(contract) {
    let showAmount = document.getElementById("show-amount");
    $_('merchant-name').innerText = contract.merchant.name;
}
function clone(obj) {
    // This is faster than it looks ...
    return JSON.parse(JSON.stringify(obj));
}
Handlebars.registerHelper('prettyAmount', function (amount) {
    let v = amount.value + amount.fraction / 10e6;
    return v.toFixed(2) + " " + amount.currency;
});
document.addEventListener("DOMContentLoaded", (e) => {
    let offer = JSON.parse(query.offer);
    console.dir(offer);
    let source = $_("contract-template").innerHTML;
    let template = Handlebars.compile(source);
    let html = template(offer.contract);
    $_("render-contract").innerHTML = html;
    document.getElementById("confirm-pay").addEventListener("click", (e) => {
        let d = clone(query);
        chrome.runtime.sendMessage({ type: 'confirm-pay', detail: d }, (resp) => {
            if (resp.success === true) {
                document.location.href = resp.backlink;
            }
            else {
                document.body.innerHTML =
                    `Oops, something went wrong.
           Here is some more info:
           <pre>${resp.text}</pre>`;
            }
        });
    });
});
