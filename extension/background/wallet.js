'use strict';

//chrome.browserAction.setBadgeBackgroundColor({color: "#000"})
chrome.browserAction.setBadgeText({text: "42"})
chrome.browserAction.setTitle({title: "Taler: 42 EUR"})

function test_emscripten ()
{
  var cur_time = TWRALLgetCurrentTime();
  var fancy_time = TWRgetFancyTime(cur_time);
  console.log('current time: '+ fancy_time);
}

test_emscripten();

DB.open(function () {
  console.log ("DB: ready");
});

let DONE = 4;

chrome.runtime.onMessage.addListener(
  function (req, sender, onresponse) {
    console.log("Message: " + req.type +
                (sender.tab
                 ? " from a content script: "+ sender.tab.url
                 : " from the extension"));
    switch (req.type)
    {
      case "db-get-wallet":
        DB.wallet_get (onresponse);
        break;

      case "db-list-transactions":
        DB.transaction_list (onresponse);
        break;

      case "db-list-reserves":
        DB.reserve_list (onresponse);
        break;
      case "confirm-reserve":
        console.log('detail: ' + JSON.stringify(req.detail));
        let keypair = createEddsaKeyPair();
        let form = new FormData();
        form.append(req.detail.field_amount, req.detail.amount_str);
        form.append(req.detail.field_reserve_pub, keypair.pub);
        form.append(req.detail.field_mint, req.detail.mint);
        // XXX: set bank-specified fields.
        let myRequest = new XMLHttpRequest();
        console.log("making request to " + req.detail.post_url);
        myRequest.open('post', req.detail.post_url);
        myRequest.send(form);
        myRequest.addEventListener('readystatechange', (e) => {
          if (myRequest.readyState == DONE) {
            let resp = {};
            resp.status = myRequest.status;
            resp.text = myRequest.responseText;
            switch (myRequest.status) {
              case 200:
                resp.success = true;
                // We can't show the page directly, so
                // we show some generic page from the wallet.
                resp.backlink = chrome.extension.getURL("pages/reserve-success.html");
                break;
              default:
                resp.success = false;
            }
            onresponse(resp);
          }
        });
        // Allow async response
        return true;
        break;
    }
  });
