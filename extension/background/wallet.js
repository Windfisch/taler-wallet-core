'use strict';

const DONE = 4;
const DB_NAME = "taler";
const DB_VERSION = 1;

// Shown in the UI.
let backendFailed = false;

/**
 * Run a function with the opened taler DB.
 */
function withTalerDb(f) {
  let req = indexedDB.open(DB_NAME, DB_VERSION);
  req.addEventListener("error", (e) => {
    // XXX: more details
    backendFailed = true;
  });
  req.addEventListener("success", (e) => {
    var db = e.target.result;
    f(db);
  });
  req.addEventListener("upgradeneeded", (e) => {
    console.log ("DB: upgrade needed: oldVersion = "+ event.oldVersion);
    db = event.target.result;
    switch (event.oldVersion) {
      case 0: // DB does not exist yet
        db.createObjectStore("mints", { keyPath: "mint_pub" });
        db.createObjectStore("reserves", { keyPath: "reserve_pub"});
        db.createObjectStore("denoms", { keyPath: "denom_pub" });
        db.createObjectStore("coins", { keyPath: "coin_pub" });
        db.createObjectStore("withdrawals", { keyPath: "id", autoIncrement: true });
        db.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
        break;
    }
  });
}


function confirmReserve(db, detail, sendResponse) {
  console.log('detail: ' + JSON.stringify(detail));
  let keypair = createEddsaKeyPair();
  let form = new FormData();
  let now = new Date();
  form.append(detail.field_amount, detail.amount_str);
  form.append(detail.field_reserve_pub, keypair.pub);
  form.append(detail.field_mint, detail.mint);
  // XXX: set bank-specified fields.
  let myRequest = new XMLHttpRequest();
  console.log("making request to " + detail.post_url);
  myRequest.open('post', detail.post_url);
  myRequest.send(form);
  myRequest.addEventListener('readystatechange', (e) => {
    if (myRequest.readyState == DONE) {
      let resp = {};
      resp.status = myRequest.status;
      resp.text = myRequest.responseText;
      let reserveRecord = {
        reserve_pub: keypair.pub,
        reserve_priv: keypair.priv,
        mint_base_url: detail.mint,
        created: now,
        last_query: null,
        current_amount: null,
        // XXX: set to actual amount
        initial_amount: null
      };
      // XXX: insert into db.
      switch (myRequest.status) {
        case 200:
          resp.success = true;
          // We can't show the page directly, so
          // we show some generic page from the wallet.
          resp.backlink = chrome.extension.getURL("pages/reserve-success.html");
          let tx = db.transaction(['reserves'], 'readwrite');
          tx.objectStore('reserves').add(reserveRecord);
          tx.addEventListener('complete', (e) => {
            console.log('tx complete, pk was ' + reserveRecord.reserve_pub);
            sendResponse(resp);
            updateReserveMints(db);
            // We have to update the mints now ...
          });
          break;
        default:
          resp.success = false;
          sendResponse(resp);
      }
    }
  });
  // Allow async response
  return true;
}


/**
 * Fetch information for mints that
 * are referenced in a reserve and that were not
 * updated recently.
 */
function updateReserveMints(db) {

}


function dumpDb(db, detail, sendResponse) {
  let dump = {};
  dump.name = db.name;
  dump.version = db.version;
  dump.stores = {};
  console.log("stores: " + JSON.stringify(db.objectStoreNames));
  let tx = db.transaction(db.objectStoreNames);
  tx.addEventListener('complete', (e) => {
      sendResponse(dump);
  });
  for (let i = 0; i < db.objectStoreNames.length; i++) {
    let name = db.objectStoreNames[i];
    let storeDump = {};
    dump.stores[name] = storeDump;
    let store = tx.objectStore(name).openCursor().addEventListener('success', (e) => {
      let cursor = event.target.result;
      if (cursor) {
        storeDump[cursor.key] = cursor.value;
        cursor.continue();
      }
    });
  }
  return true;
}

withTalerDb((db) => {
  console.log("db loaded");
  chrome.runtime.onMessage.addListener(
    function (req, sender, onresponse) {
      // XXX: use assoc. instead of switch?
      switch (req.type)
      {
        case "confirm-reserve":
          return confirmReserve(db, req.detail, onresponse)
          break;
        case "dump-db":
          console.log('dumping db');
          return dumpDb(db, req.detail, onresponse);
      }
    });
});

