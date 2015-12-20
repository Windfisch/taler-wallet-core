// Script that is injected into pages in order to allow merchants pages to
// query the availability of Taler.

"use strict";

document.addEventListener("taler-checkout-probe", function(e) {
  let evt = new Event("taler-wallet-present");
  document.dispatchEvent(evt);
  console.log("merchant handshake done");
});

document.addEventListener("taler-wire-probe", function(e) {
  let evt = new Event("taler-wallet-present");
  document.dispatchEvent(evt);
  console.log("bank handshake done");
});

document.addEventListener("taler-checkout-probe", function(e) {
  let evt = new Event("taler-wallet-present");
  document.dispatchEvent(evt);
  console.log("merchant handshake done");
});

document.addEventListener("taler-create-reserve", function(e: CustomEvent) {
  let $ = (x) => document.getElementById(x);
  console.log("taler-create-reserve with " + JSON.stringify(e.detail));
  let form_uri = (<HTMLFormElement>$(e.detail.form_id)).action;
  // TODO: validate event fields
  // TODO: also send extra bank-defined form fields
  let params = {
    post_url: URI(form_uri).absoluteTo(document.location.href).href(),
    // TODO: This should change in the future, we should not deal with the
    // amount as a bank-specific string here.
    amount_str: (<HTMLInputElement>$(e.detail.input_amount)).value,
    // TODO:  This double indirection is way too much ...
    field_amount: (<HTMLInputElement>$(e.detail.input_amount)).name,
    field_reserve_pub: (<HTMLInputElement>$(e.detail.input_pub)).name,
    field_mint: (<HTMLInputElement>$(e.detail.mint_rcv)).name,
  };
  let uri = URI(chrome.extension.getURL("pages/confirm-create-reserve.html"));
  document.location.href = uri.query(params).href();
});

document.addEventListener('taler-contract', function(e: CustomEvent) {
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


document.addEventListener('taler-execute-payment', function(e: CustomEvent) {
  console.log("got taler-execute-payment in content page");
  let msg = {
    type: "execute-payment",
    detail: {
      H_contract: e.detail.H_contract
    },
  };
  chrome.runtime.sendMessage(msg, (resp) => {
    console.log("got backend response to execute-payment:", JSON.stringify(resp));
    if (!resp.success) {
      console.log("failure!");
      return;
    }
    let r = new XMLHttpRequest();
    r.open('post', resp.payUrl);
    r.send(JSON.stringify(resp.payReq));
    let evt;
    r.onload = (e) => {
      if (r.status != 200) {
        console.log("non-200 error");
        console.log(r.responseText);
        alert("merchant returned HTTP status " + r.status);
      } else {
        evt = new CustomEvent("taler-payment-result", {detail: resp});
      }
      document.dispatchEvent(evt);
    };
  });
});