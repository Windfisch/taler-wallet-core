// Script that is injected into pages in order to allow merchants pages to
// query the availability of Taler.


// Listen to messages from the backend.
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    // do nothing, yet
});


document.addEventListener('taler-checkout-probe', function(e) {
  let evt = new Event('taler-wallet-present');
  document.dispatchEvent(evt);
});

console.log("Taler wallet: content page loaded");

