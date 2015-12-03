// Script that is injected into pages in order to allow merchants pages to
// query the availability of Taler.

'use strict';

// Listen to messages from the backend.
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    // do nothing, yet
});

if (document && document.body)
{
  document.body.addEventListener('taler-checkout-probe', function(e) {
    let evt = new Event('taler-wallet-present');
    document.body.dispatchEvent(evt);
  });
}

console.log("Taler wallet: content page loaded");
