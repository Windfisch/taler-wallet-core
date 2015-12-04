"use strict";

var DB = function () {
  let DB = {}; // returned object with exported functions

  let DB_NAME = "taler";
  let DB_VERSION = 1;

  let db = null;
  let is_ready = null;

  DB.open = function (onsuccess, onerror)
  {
    is_ready = false;

    let req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = onerror;
    req.onsuccess = function (event)
    {
      db = event.target.result;
      is_ready = true;
      if (onsuccess)
        onsuccess();
    };

    req.onupgradeneeded = function (event)
    {
      console.log ("DB: upgrade needed: oldVersion = "+ event.oldVersion);

      db = event.target.result;
      db.onerror = onerror;

      switch (event.oldVersion)
      {
        case 0: // DB does not exist yet
        {
          let example = {};

          let mints = db.createObjectStore("mints", { keyPath: "mint_pub" });
          mints.createIndex("name", "name", { unique: true });

          example.mint = {
            mint_pub: "<mint's master pub key>",	// length: 32
            name: "Mint One",
            url: "https://mint.one/",
          };

          let denoms = db.createObjectStore("denoms", { keyPath: "denom_pub" });

          example.denom = {
            denom_pub: "<denom pub key>",		// length: 32
            mint_pub: "<mint's master pub key>",	// length: 32
            mint_sig: "<mint's sig>",		// length: 64
            withdraw_expiry_time: 1234567890,
            deposit_expiry_time: 1234567890,
            start_time: 1234567890,
            value: {
              value: 1,
              fraction: 230000, // 0..999999
              currency: "EUR",
            },
            fee: {
              withdraw: {
                value: 0,
                fraction: 100000,
                currency: "EUR",
              },
              deposit: {
                value: 0,
                fraction: 100000,
                currency: "EUR",
              },
              refresh: {
                value: 0,
                fraction: 100000,
                currency: "EUR",
              },
            },
          };

          let reserves = db.createObjectStore("reserves", { keyPath: "reserve_pub"});
          example.reserve = {
            reserve_pub: "<pub key>",
            reserve_priv: "<priv key>",
            mint_pub: "<mint's master pub key>",
            initial: {
              value: 1,
              fraction: 230000,
              currency: "EUR",
            },
            current: {
              value: 1,
              fraction: 230000,
              currency: "EUR",
              blind_session_pub: "<pub key>",
              status_sig: "<sig>",
            },
          };

          let withdrawals = db.createObjectStore("withdrawals", { keyPath: "id", autoIncrement: true });
          example.withdrawal = {
            id: 1, // generated
            reserve_pub: "<pub key>",
            reserve_sig: "<sig>",
            denom_pub: "<pub key",
            blind_session_pub: "<pub key>",
            blind_priv: "<priv key>",
            coin_pub: "<pub key>",
            coin_priv: "<priv key>",
            coin_ev: "",
          };

          let coins = db.createObjectStore("coins", { keyPath: "coin_pub" });
          example.coin = {
            // coin either has a withdraw_id or refresh_id
            // or it is imported in which case both are null
            withdraw_id: 1,		// can be null
            refresh_id: null,	// can be null
            is_refreshed: false,
            denom_pub: "<pub key>",
            coin_pub: "<pub key>",
            coin_priv: "<priv key>",
            denom_sig: "<sig>",
            spent: {
              value: 1,
              fraction: 230000,
            },
            transactions: [ 123, 456 ],	// list of transaction IDs where this coin was used
          };

          let transactions = db.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
          example.transaction = {
            id: 1, // generated
            wire_hash: "<hash>",
            value: {
              value: 1,
              fraction: 230000,
              currency: "EUR",
            },
            contract: "<JSON>",
            is_checkout_done: true,
            is_confirmed: true,
            fulfillment_url: "https://some.shop/transaction/completed",
          };

          let refresh = db.createObjectStore("refresh");
          example.refresh = {
            // TODO
          };
        }
      }

      is_ready = true;
      if (onsuccess)
        onsuccess();
    }
  };


  DB.close = function ()
  {
    db.close();
  };


  DB.wallet_get = function (onresult, onerror)
  {
    let wallet = { };

    let tr = db.transaction([ "coins", "denoms" ], "readonly");
    let coins = tr.objectStore("coins");
    let denoms = tr.objectStore("denoms");

    let coins_cur = coins.openCursor();
    coins_cur.onerror = onerror;
    coins_cur.onsuccess = function ()
    {
      let cur = event.target.result;
      if (cur) {
        let denom_get = denoms.get(cur.valcue.denom_pub);
        denom_get.onerror = onerror;
        denom_get.onsuccess = function (event)
        {
          let denom = event.target.result;
          if (denom.currency in wallet)
          {
            let w = wallet[denom.currency];
            w.value += denom.value;
            w.fraction = (w.fraction + denom.fraction) % 1000000;
            if (1000000 <= w.fraction + denom.fraction)
              w.value++;
          }
          else
          {
            wallet[denom.currency] = denom;
          }
          cur.continue();
        }
      }
      else // no more entries
      {
        onresult(wallet);
      }
    };
  };


  DB.transaction_list = function (onresult, onerror)
  {
    // TODO
  };


  DB.reserve_list = function (onresult, onerror)
  {
    // TODO
  };

  return DB;
}();
