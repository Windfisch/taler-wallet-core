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

chrome.runtime.onMessage.addListener(
  function (req, sender, onresponse) {
    console.log("Message: " + req.type +
                (sender.tab
                 ? " from a content script: "+ sender.tab.url
                 : " from the extension"));
    switch (req.type)
    {
      case "WALLET_GET":
        DB.wallet_get (onresponse);
        break;

      case "TRANSACTION_LIST":
        DB.transaction_list (onresponse);
        break;

      case "RESERVE_LIST":
        DB.reserve_list (onresponse);
        break;
    }
  });
