/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Messaging for the WebExtensions wallet.  Should contain
 * parts that are specific for WebExtensions, but as little business
 * logic as possible.
 */


/**
 * Imports.
 */
import {
  Badge,
  ConfirmReserveRequest,
  CreateReserveRequest,
  OfferRecord,
  Stores,
  Wallet,
} from "./wallet";
import {
  AmountJson,
  Contract,
  Notifier,
} from "./types";
import MessageSender = chrome.runtime.MessageSender;
import { ChromeBadge } from "./chromeBadge";
import * as logging from "./logging";
import { Store, Index } from "./query";
import { BrowserHttpLib } from "./http";
import { Checkable } from "./checkable";
import Port = chrome.runtime.Port;
import URI = require("urijs");


const DB_NAME = "taler";

/**
 * Current database version, should be incremented
 * each time we do incompatible schema changes on the database.
 * In the future we might consider adding migration functions for
 * each version increment.
 */
const DB_VERSION = 17;

type Handler = (detail: any, sender: MessageSender) => Promise<any>;

function makeHandlers(db: IDBDatabase,
  wallet: Wallet): { [msg: string]: Handler } {
  return {
    ["balances"]: function (detail, sender) {
      return wallet.getBalances();
    },
    ["dump-db"]: function (detail, sender) {
      return exportDb(db);
    },
    ["import-db"]: function (detail, sender) {
      return importDb(db, detail.dump);
    },
    ["get-tab-cookie"]: function (detail, sender) {
      if (!sender || !sender.tab || !sender.tab.id) {
        return Promise.resolve();
      }
      let id: number = sender.tab.id;
      let info: any = <any>paymentRequestCookies[id];
      delete paymentRequestCookies[id];
      return Promise.resolve(info);
    },
    ["ping"]: function (detail, sender) {
      return Promise.resolve();
    },
    ["reset"]: function (detail, sender) {
      if (db) {
        let tx = db.transaction(Array.from(db.objectStoreNames), 'readwrite');
        for (let i = 0; i < db.objectStoreNames.length; i++) {
          tx.objectStore(db.objectStoreNames[i]).clear();
        }
      }
      deleteDb();

      chrome.browserAction.setBadgeText({ text: "" });
      console.log("reset done");
      // Response is synchronous
      return Promise.resolve({});
    },
    ["create-reserve"]: function (detail, sender) {
      const d = {
        exchange: detail.exchange,
        amount: detail.amount,
      };
      const req = CreateReserveRequest.checked(d);
      return wallet.createReserve(req);
    },
    ["confirm-reserve"]: function (detail, sender) {
      // TODO: make it a checkable
      const d = {
        reservePub: detail.reservePub
      };
      const req = ConfirmReserveRequest.checked(d);
      return wallet.confirmReserve(req);
    },
    ["generate-nonce"]: function (detail, sender) {
      return wallet.generateNonce();
    },
    ["confirm-pay"]: function (detail, sender) {
      let offer: OfferRecord;
      try {
        offer = OfferRecord.checked(detail.offer);
      } catch (e) {
        if (e instanceof Checkable.SchemaError) {
          console.error("schema error:", e.message);
          return Promise.resolve({
            error: "invalid contract",
            hint: e.message,
            detail: detail
          });
        } else {
          throw e;
        }
      }

      return wallet.confirmPay(offer);
    },
    ["check-pay"]: function (detail, sender) {
      let offer: OfferRecord;
      try {
        offer = OfferRecord.checked(detail.offer);
      } catch (e) {
        if (e instanceof Checkable.SchemaError) {
          console.error("schema error:", e.message);
          return Promise.resolve({
            error: "invalid contract",
            hint: e.message,
            detail: detail
          });
        } else {
          throw e;
        }
      }
      return wallet.checkPay(offer);
    },
    ["query-payment"]: function (detail: any, sender: MessageSender) {
      if (sender.tab && sender.tab.id) {
        rateLimitCache[sender.tab.id]++;
        if (rateLimitCache[sender.tab.id] > 10) {
          console.warn("rate limit for query-payment exceeded");
          let msg = {
            error: "rate limit exceeded for query-payment",
            rateLimitExceeded: true,
            hint: "Check for redirect loops",
          };
          return Promise.resolve(msg);
        }
      }
      return wallet.queryPayment(detail.url);
    },
    ["exchange-info"]: function (detail) {
      if (!detail.baseUrl) {
        return Promise.resolve({ error: "bad url" });
      }
      return wallet.updateExchangeFromUrl(detail.baseUrl);
    },
    ["currency-info"]: function (detail) {
      if (!detail.name) {
        return Promise.resolve({ error: "name missing" });
      }
      return wallet.getCurrencyRecord(detail.name);
    },
    ["hash-contract"]: function (detail) {
      if (!detail.contract) {
        return Promise.resolve({ error: "contract missing" });
      }
      return wallet.hashContract(detail.contract).then((hash) => {
        return { hash };
      });
    },
    ["put-history-entry"]: function (detail: any) {
      if (!detail.historyEntry) {
        return Promise.resolve({ error: "historyEntry missing" });
      }
      return wallet.putHistory(detail.historyEntry);
    },
    ["save-offer"]: function (detail: any) {
      let offer = detail.offer;
      if (!offer) {
        return Promise.resolve({ error: "offer missing" });
      }
      console.log("handling safe-offer", detail);
      // FIXME:  fully migrate to new terminology
      let checkedOffer = OfferRecord.checked(offer);
      return wallet.saveOffer(checkedOffer);
    },
    ["reserve-creation-info"]: function (detail, sender) {
      if (!detail.baseUrl || typeof detail.baseUrl !== "string") {
        return Promise.resolve({ error: "bad url" });
      }
      let amount = AmountJson.checked(detail.amount);
      return wallet.getReserveCreationInfo(detail.baseUrl, amount);
    },
    ["get-history"]: function (detail, sender) {
      // TODO: limit history length
      return wallet.getHistory();
    },
    ["get-offer"]: function (detail, sender) {
      return wallet.getOffer(detail.offerId);
    },
    ["get-exchanges"]: function (detail, sender) {
      return wallet.getExchanges();
    },
    ["get-currencies"]: function (detail, sender) {
      return wallet.getCurrencies();
    },
    ["update-currency"]: function (detail, sender) {
      return wallet.updateCurrency(detail.currencyRecord);
    },
    ["get-reserves"]: function (detail, sender) {
      if (typeof detail.exchangeBaseUrl !== "string") {
        return Promise.reject(Error("exchangeBaseUrl missing"));
      }
      return wallet.getReserves(detail.exchangeBaseUrl);
    },
    ["get-payback-reserves"]: function (detail, sender) {
      return wallet.getPaybackReserves();
    },
    ["withdraw-payback-reserve"]: function (detail, sender) {
      if (typeof detail.reservePub !== "string") {
        return Promise.reject(Error("reservePub missing"));
      }
      return wallet.withdrawPaybackReserve(detail.reservePub);
    },
    ["get-coins"]: function (detail, sender) {
      if (typeof detail.exchangeBaseUrl !== "string") {
        return Promise.reject(Error("exchangBaseUrl missing"));
      }
      return wallet.getCoins(detail.exchangeBaseUrl);
    },
    ["get-precoins"]: function (detail, sender) {
      if (typeof detail.exchangeBaseUrl !== "string") {
        return Promise.reject(Error("exchangBaseUrl missing"));
      }
      return wallet.getPreCoins(detail.exchangeBaseUrl);
    },
    ["get-denoms"]: function (detail, sender) {
      if (typeof detail.exchangeBaseUrl !== "string") {
        return Promise.reject(Error("exchangBaseUrl missing"));
      }
      return wallet.getDenoms(detail.exchangeBaseUrl);
    },
    ["refresh-coin"]: function (detail, sender) {
      if (typeof detail.coinPub !== "string") {
        return Promise.reject(Error("coinPub missing"));
      }
      return wallet.refresh(detail.coinPub);
    },
    ["payback-coin"]: function (detail, sender) {
      if (typeof detail.coinPub !== "string") {
        return Promise.reject(Error("coinPub missing"));
      }
      return wallet.payback(detail.coinPub);
    },
    ["payment-failed"]: function (detail, sender) {
      // For now we just update exchanges (maybe the exchange did something
      // wrong and the keys were messed up).
      // FIXME: in the future we should look at what actually went wrong.
      console.error("payment reported as failed");
      wallet.updateExchanges();
      return Promise.resolve();
    },
    ["payment-succeeded"]: function (detail, sender) {
      let contractHash = detail.contractHash;
      let merchantSig = detail.merchantSig;
      if (!contractHash) {
        return Promise.reject(Error("contractHash missing"));
      }
      if (!merchantSig) {
        return Promise.reject(Error("merchantSig missing"));
      }
      return wallet.paymentSucceeded(contractHash, merchantSig);
    },
  };
}


async function dispatch(handlers: any, req: any, sender: any, sendResponse: any): Promise<void> {
  if (!(req.type in handlers)) {
    console.error(`Request type ${JSON.stringify(req)} unknown, req ${req.type}`);
    try {
      sendResponse({ error: "request unknown" });
    } catch (e) {
      // might fail if tab disconnected
    }
  }

  try {
    const p = handlers[req.type](req.detail, sender);
    let r = await p;
    try {
      sendResponse(r);
    } catch (e) {
      // might fail if tab disconnected
    }
  } catch (e) {
    console.log(`exception during wallet handler for '${req.type}'`);
    console.log("request", req);
    console.error(e);
    let stack = undefined;
    try {
      stack = e.stack.toString();
    } catch (e) {
      // might fail
    }
    try {
      sendResponse({
        stack,
        error: "exception",
        hint: e.message,
      });
    } catch (e) {
      console.log(e);
      // might fail if tab disconnected
    }
  }
}

class ChromeNotifier implements Notifier {
  ports: Port[] = [];

  constructor() {
    chrome.runtime.onConnect.addListener((port) => {
      console.log("got connect!");
      this.ports.push(port);
      port.onDisconnect.addListener(() => {
        let i = this.ports.indexOf(port);
        if (i >= 0) {
          this.ports.splice(i, 1);
        } else {
          console.error("port already removed");
        }
      });
    });
  }

  notify() {
    for (let p of this.ports) {
      p.postMessage({ notify: true });
    }
  }
}


/**
 * Mapping from tab ID to payment information (if any).
 */
let paymentRequestCookies: { [n: number]: any } = {};


/**
 * Handle a HTTP response that has the "402 Payment Required" status.
 * In this callback we don't have access to the body, and must communicate via
 * shared state with the content script that will later be run later
 * in this tab.
 */
function handleHttpPayment(headerList: chrome.webRequest.HttpHeader[], url: string, tabId: number): any {
  const headers: { [s: string]: string } = {};
  for (let kv of headerList) {
    if (kv.value) {
      headers[kv.name.toLowerCase()] = kv.value;
    }
  }

  let fields = {
    contract_url: headers["x-taler-contract-url"],
    contract_query: headers["x-taler-contract-query"],
    offer_url: headers["x-taler-offer-url"],
  }

  let talerHeaderFound = Object.keys(fields).filter((x: any) => (fields as any)[x]).length != 0;

  if (!talerHeaderFound) {
    // looks like it's not a taler request, it might be
    // for a different payment system (or the shop is buggy)
    console.log("ignoring non-taler 402 response");
    return;
  }

  let payDetail = {
    contract_url: fields.contract_url,
    offer_url: fields.offer_url,
  };

  console.log("got pay detail", payDetail)

  // This cookie will be read by the injected content script
  // in the tab that displays the page.
  paymentRequestCookies[tabId] = {
    type: "pay",
    payDetail,
  };
}



function handleBankRequest(wallet: Wallet, headerList: chrome.webRequest.HttpHeader[],
  url: string, tabId: number): any {
  const headers: { [s: string]: string } = {};
  for (let kv of headerList) {
    if (kv.value) {
      headers[kv.name.toLowerCase()] = kv.value;
    }
  }

  const reservePub = headers["x-taler-reserve-pub"];
  if (reservePub !== undefined) {
    console.log(`confirming reserve ${reservePub} via 201`);
    wallet.confirmReserve({reservePub});
    return;
  }

  const amount = headers["x-taler-amount"];
  if (amount) {
    let callbackUrl = headers["x-taler-callback-url"];
    if (!callbackUrl) {
      console.log("202 not understood (X-Taler-Callback-Url missing)");
      return;
    }
    let amountParsed;
    try {
      amountParsed = JSON.parse(amount);
    } catch (e) {
      let uri = new URI(chrome.extension.getURL("/src/pages/error.html"));
      let p = {
        message: `Can't parse amount ("${amount}"): ${e.message}`,
      };
      let redirectUrl = uri.query(p).href();
      // FIXME: use direct redirect when https://bugzilla.mozilla.org/show_bug.cgi?id=707624 is fixed
      chrome.tabs.update(tabId, {url: redirectUrl});
      return;
    }
    let wtTypes = headers["x-taler-wt-types"];
    if (!wtTypes) {
      console.log("202 not understood (X-Taler-Wt-Types missing)");
      return;
    }
    let params = {
      amount: amount,
      callback_url: new URI(callbackUrl)
        .absoluteTo(url),
      bank_url: url,
      wt_types: wtTypes,
      suggested_exchange_url: headers["x-taler-suggested-exchange"],
    };
    let uri = new URI(chrome.extension.getURL("/src/pages/confirm-create-reserve.html"));
    let redirectUrl = uri.query(params).href();
    console.log("redirecting to", redirectUrl);
    // FIXME: use direct redirect when https://bugzilla.mozilla.org/show_bug.cgi?id=707624 is fixed
    chrome.tabs.update(tabId, {url: redirectUrl});
    return;
  }
  // no known headers found, not a taler request ...
}


// Rate limit cache for executePayment operations, to break redirect loops
let rateLimitCache: { [n: number]: number } = {};

function clearRateLimitCache() {
  rateLimitCache = {};
}

export async function wxMain() {
  window.onerror = (m, source, lineno, colno, error) => {
    logging.record("error", m + error, undefined, source || "(unknown)", lineno || 0, colno || 0);
  }

  chrome.browserAction.setBadgeText({ text: "" });
  const badge = new ChromeBadge();

  chrome.tabs.query({}, function (tabs) {
    for (let tab of tabs) {
      if (!tab.url || !tab.id) {
        return;
      }
      let uri = new URI(tab.url);
      if (uri.protocol() == "http" || uri.protocol() == "https") {
        console.log("injecting into existing tab", tab.id);
        chrome.tabs.executeScript(tab.id, { file: "/dist/contentScript-bundle.js" });
        let code = `
          if (("taler" in window) || document.documentElement.getAttribute("data-taler-nojs")) {
            document.dispatchEvent(new Event("taler-probe-result"));
          }
        `;
        chrome.tabs.executeScript(tab.id, { code, runAt: "document_idle" });
      }
    }
  });

  const tabTimers: {[n: number]: number[]} = {};

  chrome.tabs.onRemoved.addListener((tabId, changeInfo) => {
    let tt = tabTimers[tabId] || [];
    for (let t of tt) {
      chrome.extension.getBackgroundPage().clearTimeout(t);
    }
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status != 'complete') {
      return;
    }
    const timers: number[] = [];

    const addRun = (dt: number) => {
      const id = chrome.extension.getBackgroundPage().setTimeout(run, dt);
      timers.push(id);
    }

    const run = () => {
      timers.shift();
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          return;
        }
        if (!tab.url || !tab.id) {
          return;
        }
        let uri = new URI(tab.url);
        if (!(uri.protocol() == "http" || uri.protocol() == "https")) {
          return;
        }
        let code = `
          if (("taler" in window) || document.documentElement.getAttribute("data-taler-nojs")) {
            document.dispatchEvent(new Event("taler-probe-result"));
          }
        `;
        chrome.tabs.executeScript(tab.id!, { code, runAt: "document_start" });
      });
    };

    addRun(0);
    addRun(50);
    addRun(300);
    addRun(1000);
    addRun(2000);
    addRun(4000);
    addRun(8000);
    addRun(16000);
    tabTimers[tabId] = timers;
  });

  chrome.extension.getBackgroundPage().setInterval(clearRateLimitCache, 5000);

  let db: IDBDatabase;
  try {
    db = await openTalerDb();
  } catch (e) {
    console.error("could not open database", e);
    return;
  }
  const http = new BrowserHttpLib();
  const notifier = new ChromeNotifier();
  console.log("setting wallet");
  const wallet = new Wallet(db, http, badge!, notifier);
  // Useful for debugging in the background page.
  (window as any).talerWallet = wallet;

  // Handlers for messages coming directly from the content
  // script on the page
  const handlers = makeHandlers(db, wallet!);
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    dispatch(handlers, req, sender, sendResponse);
    return true;
  });

  // Handlers for catching HTTP requests
  chrome.webRequest.onHeadersReceived.addListener((details) => {
    if (details.statusCode == 402) {
      console.log(`got 402 from ${details.url}`);
      return handleHttpPayment(details.responseHeaders || [],
        details.url,
        details.tabId);
    } else if (details.statusCode == 202) {
      return handleBankRequest(wallet!, details.responseHeaders || [],
        details.url,
        details.tabId);
    }
  }, { urls: ["<all_urls>"] }, ["responseHeaders", "blocking"]);
}



/**
 * Return a promise that resolves
 * to the taler wallet db.
 */
function openTalerDb(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = (e) => {
      reject(e);
    };
    req.onsuccess = (e) => {
      resolve(req.result);
    };
    req.onupgradeneeded = (e) => {
      const db = req.result;
      console.log("DB: upgrade needed: oldVersion = " + e.oldVersion);
      switch (e.oldVersion) {
        case 0: // DB does not exist yet

          for (let n in Stores) {
            if ((Stores as any)[n] instanceof Store) {
              let si: Store<any> = (Stores as any)[n];
              const s = db.createObjectStore(si.name, si.storeParams);
              for (let indexName in (si as any)) {
                if ((si as any)[indexName] instanceof Index) {
                  let ii: Index<any,any> = (si as any)[indexName];
                  s.createIndex(ii.indexName, ii.keyPath);
                }
              }
            }
          }
          break;
        default:
          if (e.oldVersion != DB_VERSION) {
            window.alert("Incompatible wallet dababase version, please reset" +
                         " db.");
            chrome.browserAction.setBadgeText({text: "err"});
            chrome.browserAction.setBadgeBackgroundColor({color: "#F00"});
            throw Error("incompatible DB");
          }
          break;
      }
    };
  });
}


function exportDb(db: IDBDatabase): Promise<any> {
  let dump = {
    name: db.name,
    version: db.version,
    stores: {} as {[s: string]: any},
  };

  return new Promise((resolve, reject) => {

    let tx = db.transaction(Array.from(db.objectStoreNames));
    tx.addEventListener("complete", () => {
      resolve(dump);
    });
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      let name = db.objectStoreNames[i];
      let storeDump = {} as {[s: string]: any};
      dump.stores[name] = storeDump;
      let store = tx.objectStore(name)
                    .openCursor()
                    .addEventListener("success", (e: Event) => {
                      let cursor = (e.target as any).result;
                      if (cursor) {
                        storeDump[cursor.key] = cursor.value;
                        cursor.continue();
                      }
                    });
    }
  });
}


function importDb(db: IDBDatabase, dump: any): Promise<void> {
  console.log("importing db", dump);
  return new Promise<void>((resolve, reject) => {
    let tx = db.transaction(Array.from(db.objectStoreNames), "readwrite");
    for (let storeName in dump.stores) {
      let objects = [];
      for (let key in dump.stores[storeName]) {
        objects.push(dump.stores[storeName][key]);
      }
      console.log(`importing ${objects.length} records into ${storeName}`); 
      let store = tx.objectStore(storeName);
      let clearReq = store.clear();
      for (let obj of objects) {
        store.put(obj);
      }
    }
    tx.addEventListener("complete", () => {
      resolve();
    });
  });
}


function deleteDb() {
  indexedDB.deleteDatabase(DB_NAME);
}
