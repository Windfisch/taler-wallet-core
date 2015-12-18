// Script that is injected into pages in order to allow merchants pages to
// query the availability of Taler.

'use strict';

// Install our handshake handlers only once the
// document is loaded
// TODO: change the spec to do it on the body
document.addEventListener("DOMContentLoaded", function(e) {
  console.log("DOM fully loaded and parsed");
  document.body.addEventListener('taler-checkout-probe', function(e) {
    let evt = new Event('taler-wallet-present');
    document.body.dispatchEvent(evt);
    console.log("merchant handshake done");
  });
  document.body.addEventListener('taler-wire-probe', function(e) {
    let evt = new Event('taler-wallet-present');
    document.body.dispatchEvent(evt);
    console.log("bank handshake done");
  });
  document.body.addEventListener('taler-checkout-probe', function(e) {
    let evt = new Event('taler-wallet-present');
    document.body.dispatchEvent(evt);
    console.log("merchant handshake done");
  });
  document.body.addEventListener('taler-create-reserve', function(e) {
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
  document.body.addEventListener('taler-contract', function(e) {
    // XXX: the merchant should just give us the parsed data ...
    let offer = JSON.parse(e.detail);
    let uri = URI(chrome.extension.getURL("pages/confirm-contract.html"));
    let params = {
      offer: JSON.stringify(offer),
      merchantPageUrl: document.location.href
    };
    document.location.href = uri.query(params).href();
  });
});

console.log("Taler wallet: content page loaded");
