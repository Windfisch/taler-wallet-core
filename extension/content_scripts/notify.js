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
  document.body.addEventListener('taler-create-reserve', function(e) {
    console.log("reserve creation " + JSON.stringify(e.detail));
    chrome.runtime.sendMessage({action:'new-reserve-request', detail:e.detail}, function(resp) {
      console.log("got response");
      document.location.href = resp.url;
    });
  });
});

console.log("Taler wallet: content page loaded");
