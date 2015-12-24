// Script that is injected into pages in order to allow merchants pages to
// query the availability of Taler.
"use strict";
document.addEventListener("taler-checkout-probe", function (e) {
    let evt = new Event("taler-wallet-present");
    document.dispatchEvent(evt);
    console.log("merchant handshake done");
});
document.addEventListener("taler-wire-probe", function (e) {
    let evt = new Event("taler-wallet-present");
    document.dispatchEvent(evt);
    console.log("bank handshake done");
});
document.addEventListener("taler-checkout-probe", function (e) {
    let evt = new Event("taler-wallet-present");
    document.dispatchEvent(evt);
    console.log("merchant handshake done");
});
document.addEventListener("taler-create-reserve", function (e) {
    let $ = (x) => document.getElementById(x);
    console.log("taler-create-reserve with " + JSON.stringify(e.detail));
    let form_uri = $(e.detail.form_id).action;
    // TODO: validate event fields
    // TODO: also send extra bank-defined form fields
    let params = {
        post_url: URI(form_uri).absoluteTo(document.location.href).href(),
        // TODO: This should change in the future, we should not deal with the
        // amount as a bank-specific string here.
        amount_str: $(e.detail.input_amount).value,
        // TODO:  This double indirection is way too much ...
        field_amount: $(e.detail.input_amount).name,
        field_reserve_pub: $(e.detail.input_pub).name,
        field_mint: $(e.detail.mint_rcv).name,
    };
    let uri = URI(chrome.extension.getURL("pages/confirm-create-reserve.html"));
    document.location.href = uri.query(params).href();
});
document.addEventListener('taler-contract', function (e) {
    // XXX: the merchant should just give us the parsed data ...
    let offer = JSON.parse(e.detail);
    let uri = URI(chrome.extension.getURL("pages/confirm-contract.html"));
    let params = {
        offer: JSON.stringify(offer),
        merchantPageUrl: document.location.href,
        cookie: document.cookie,
    };
    document.location.href = uri.query(params).href();
});
document.addEventListener('taler-execute-payment', function (e) {
    console.log("got taler-execute-payment in content page");
    let msg = {
        type: "execute-payment",
        detail: {
            H_contract: e.detail.H_contract
        },
    };
    chrome.runtime.sendMessage(msg, (resp) => {
        if (!resp.success) {
            console.log("failure!");
            return;
        }
        console.log("Making request to ", resp.payUrl);
        let r = new XMLHttpRequest();
        r.open('post', resp.payUrl);
        r.send(JSON.stringify(resp.payReq));
        let detail = {};
        r.onload = (e) => {
            switch (r.status) {
                case 200:
                    detail.success = true;
                    break;
                case 301:
                    detail.success = true;
                    console.log("Headers:", r.getAllResponseHeaders());
                    detail.fulfillmentUrl = r.getResponseHeader('Location');
                    break;
                default:
                    detail.success = false;
                    break;
            }
            console.log("status was:", r.status);
            console.log("detail:", JSON.stringify(detail));
            document.dispatchEvent(new CustomEvent("taler-payment-result", { detail: detail }));
        };
    });
});
