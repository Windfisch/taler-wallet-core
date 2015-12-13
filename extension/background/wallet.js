'use strict';

const DB_NAME = "taler";
const DB_VERSION = 1;


/**
 * Return a promise that resolves
 * to the taler wallet db.
 */
function openTalerDb(cont) {
  return new Promise((resolve, reject) => {
    let req = indexedDB.open(DB_NAME, DB_VERSION);
    req.addEventListener("error", (e) => {
      reject(e);
    });
    req.addEventListener("success", (e) => {
      resolve(e.target.result);
    });
    req.addEventListener("upgradeneeded", (e) => {
      let db = e.target.result;
      console.log ("DB: upgrade needed: oldVersion = " + event.oldVersion);
      db = event.target.result;
      switch (event.oldVersion) {
        case 0: // DB does not exist yet
          db.createObjectStore("mints", { keyPath: "baseUrl" });
          db.createObjectStore("reserves", { keyPath: "reserve_pub"});
          db.createObjectStore("denoms", { keyPath: "denom_pub" });
          db.createObjectStore("coins", { keyPath: "coin_pub" });
          db.createObjectStore("withdrawals", { keyPath: "id", autoIncrement: true });
          db.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
          break;
      }
    });
  });
}


function canonicalizeBaseUrl(url) {
  let x = new URI(url);
  if (!x.protocol()) {
    x.protocol("https");
  }
  x.path(x.path() + "/").normalizePath();
  x.fragment();
  x.query();
  return x.href()
}


function confirmReserve(db, detail, sendResponse) {
  console.log('detail: ' + JSON.stringify(detail));
  let keypair = createEddsaKeyPair();
  let form = new FormData();
  let now = (new Date()).toString();
  form.append(detail.field_amount, detail.amount_str);
  form.append(detail.field_reserve_pub, keypair.pub);
  form.append(detail.field_mint, detail.mint);
  // XXX: set bank-specified fields.
  let myRequest = new XMLHttpRequest();
  console.log("making request to " + detail.post_url);
  myRequest.open('post', detail.post_url);
  myRequest.send(form);
  let mintBaseUrl = canonicalizeBaseUrl(detail.mint);
  myRequest.addEventListener('readystatechange', (e) => {
    if (myRequest.readyState == XMLHttpRequest.DONE) {
      let resp = {};
      resp.status = myRequest.status;
      resp.text = myRequest.responseText;
      let reserveRecord = {
        reserve_pub: keypair.pub,
        reserve_priv: keypair.priv,
        mint_base_url: mintBaseUrl,
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
            var mint;
            updateMintFromUrl(db, reserveRecord.mint_base_url)
                .then((m) => { mint = m; return updateReserve(db, keypair.pub, mint); })
                .then((reserve) => depleteReserve(db, reserve, mint));
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


function sumAmounts() {
  let v = 0;
  let f = 0;
  let c;
  let xs = arguments;
  if (xs.length == 0) {
    throw "no arguments given";
  }
  for (let x of xs) {
    v = (v + x.value) + Math.floor((f + x.value) / 10e6);
    f = (f + x.fraction) % 10e6;
    c = x.currency;
  }
  return {value: v, fraction:f, currency: c};
}

function subtractAmount(a1, a2) {
  if (compareAmount(a1, a2) < 0) {
    throw "negative result";
  }
  let r = {
    currency: a1.currency,
    value: a1.value,
    fraction: a1.fraction
  };
  if (a2.fraction > a1.fraction) {
    r.value--;
    r.fraction += 1000000;
  }
  r.value -= a2.value;
  r.fraction -= a2.fraction;
  return r;
}


function compareAmount(a1, a2) {
  if (a1.currency !== a2.currency) {
    throw "can't compare different currencies";
  }
  let v1 = [a1.value + Math.floor(a1.fraction / 10e6), a1.fraction % 10e6];
  let v2 = [a2.value + Math.floor(a2.fraction / 10e6), a2.fraction % 10e6];
  for (let i in v1) {
    if (v1[i] < v2[i]) {
      return -1;
    }
    if (v1[i] > v2[i]) {
      return 1;
    }
  }
  return 0;
}

function copy(o) {
  return JSON.parse(JSON.stringify(o));
}


function rankDenom(o1, o2) {
  return (-1) * compareAmount(o1.value, o2.value);
}


function withdraw(denom, reserve, mint) {
  let wd = {};
  wd.denom_pub = denom.denom_pub;
  wd.reserve_pub = reserve.reserve_pub;
  let coin_key = createEddsaKeyPair();
  // create RSA blinding key
  // blind coin
  // generate signature
}


/**
 * Withdraw coins from a reserve until it is empty.
 */
function depleteReserve(db, reserve, mint) {
  let denoms = copy(mint.keys.denoms);
  let remaining = copy(reserve.current_amount);
  denoms.sort(rankDenom);
  for (let i = 0; i < 1000; i++) {
    let found = false;
    for (let d of denoms) {
      let cost = sumAmounts(d.value, d.fee_withdraw);
      if (compareAmount (remaining, cost) < 0) {
        continue;
      }
      found = true;
      remaining = subtractAmount(remaining, cost);
      withdraw(d, reserve, mint);
    }
    if (!found) {
      break;
    }
  }

}


function updateReserve(db, reservePub, mint) {
  let reserve;
  return new Promise((resolve, reject) => {
    let tx = db.transaction(['reserves']);
    tx.objectStore('reserves').get(reservePub).onsuccess = (e) => {
      let reserve = e.target.result;
      let reqUrl = URI("reserve/status").absoluteTo(mint.baseUrl);
      reqUrl.query({'reserve_pub': reservePub});
      let myRequest = new XMLHttpRequest();
      console.log("making request to " + reqUrl.href());
      myRequest.open('get', reqUrl.href());
      myRequest.send();
      myRequest.addEventListener('readystatechange', (e) => {
        if (myRequest.readyState == XMLHttpRequest.DONE) {
          if (myRequest.status != 200) {
            reject();
            return;
          }
          let reserveInfo = JSON.parse(myRequest.responseText);
          console.log("got response " + JSON.stringify(reserveInfo));
          reserve.current_amount = reserveInfo.balance;
          let tx = db.transaction(['reserves'], 'readwrite');
          console.log("putting updated reserve " + JSON.stringify(reserve));
          tx.objectStore('reserves').put(reserve);
          tx.oncomplete = (e) => {
            resolve(reserve);
          };
        }
      });
    };
  });

}


/**
 * Update or add mint DB entry by fetching the /keys information.
 * Optionally link the reserve entry to the new or existing
 * mint entry in then DB.
 */
function updateMintFromUrl(db, baseUrl) {
  console.log("base url is " + baseUrl);
  let reqUrl = URI("keys").absoluteTo(baseUrl);
  let myRequest = new XMLHttpRequest();
  myRequest.open('get', reqUrl.href());
  myRequest.send();
  return new Promise((resolve, reject) => {
    myRequest.addEventListener('readystatechange', (e) => {
      console.log("state change to " + myRequest.readyState);
      if (myRequest.readyState == XMLHttpRequest.DONE) {
        if (myRequest.status == 200) {
          console.log("got /keys");
          let mintKeysJson = JSON.parse(myRequest.responseText);
          if (!mintKeysJson) {
            console.log("keys invalid");
            reject();
          } else {
            let mint = {};
            mint.baseUrl = baseUrl;
            mint.keys = mintKeysJson;
            let tx = db.transaction(['mints'], 'readwrite');
            tx.objectStore('mints').put(mint);
            tx.oncomplete = (e) => {
              resolve(mint);
            };
          }
        } else {
          console.log("/keys request failed with status " + myRequest.status);
          // XXX: also write last error to DB to show in the UI
          reject();
        }
      }
    });
  });
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


openTalerDb().then((db) => {
  console.log("db loaded");
  chrome.runtime.onMessage.addListener(
    function (req, sender, onresponse) {
      let dispatch = {
        "confirm-reserve": confirmReserve,
        "dump-db": dumpDb
      }
      return dispatch[req.type](db, req.detail, onresponse);
    });
});

