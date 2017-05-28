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
import { Checkable } from "../checkable";
import { BrowserHttpLib } from "../http";
import * as logging from "../logging";
import {
  Index,
  Store,
} from "../query";
import {
  AmountJson,
  Contract,
  Notifier,
} from "../types";
import {
  Badge,
  ConfirmReserveRequest,
  CreateReserveRequest,
  OfferRecord,
  Stores,
  Wallet,
} from "../wallet";

import { ChromeBadge } from "./chromeBadge";
import URI = require("urijs");
import Port = chrome.runtime.Port;
import MessageSender = chrome.runtime.MessageSender;


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
    ["balances"]: (detail, sender) => {
      return wallet.getBalances();
    },
    ["dump-db"]: (detail, sender) => {
      return exportDb(db);
    },
    ["import-db"]: (detail, sender) => {
      return importDb(db, detail.dump);
    },
    ["get-tab-cookie"]: (detail, sender) => {
      if (!sender || !sender.tab || !sender.tab.id) {
        return Promise.resolve();
      }
      const id: number = sender.tab.id;
      const info: any = paymentRequestCookies[id] as any;
      delete paymentRequestCookies[id];
      return Promise.resolve(info);
    },
    ["ping"]: (detail, sender) => {
      return Promise.resolve();
    },
    ["reset"]: (detail, sender) => {
      if (db) {
        const tx = db.transaction(Array.from(db.objectStoreNames), "readwrite");
        // tslint:disable-next-line:prefer-for-of
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
    ["create-reserve"]: (detail, sender) => {
      const d = {
        amount: detail.amount,
        exchange: detail.exchange,
      };
      const req = CreateReserveRequest.checked(d);
      return wallet.createReserve(req);
    },
    ["confirm-reserve"]: (detail, sender) => {
      // TODO: make it a checkable
      const d = {
        reservePub: detail.reservePub,
      };
      const req = ConfirmReserveRequest.checked(d);
      return wallet.confirmReserve(req);
    },
    ["generate-nonce"]: (detail, sender) => {
      return wallet.generateNonce();
    },
    ["confirm-pay"]: (detail, sender) => {
      let offer: OfferRecord;
      try {
        offer = OfferRecord.checked(detail.offer);
      } catch (e) {
        if (e instanceof Checkable.SchemaError) {
          console.error("schema error:", e.message);
          return Promise.resolve({
            detail,
            error: "invalid contract",
            hint: e.message,
          });
        } else {
          throw e;
        }
      }

      return wallet.confirmPay(offer);
    },
    ["check-pay"]: (detail, sender) => {
      let offer: OfferRecord;
      try {
        offer = OfferRecord.checked(detail.offer);
      } catch (e) {
        if (e instanceof Checkable.SchemaError) {
          console.error("schema error:", e.message);
          return Promise.resolve({
            detail,
            error: "invalid contract",
            hint: e.message,
          });
        } else {
          throw e;
        }
      }
      return wallet.checkPay(offer);
    },
    ["query-payment"]: (detail: any, sender: MessageSender) => {
      if (sender.tab && sender.tab.id) {
        rateLimitCache[sender.tab.id]++;
        if (rateLimitCache[sender.tab.id] > 10) {
          console.warn("rate limit for query-payment exceeded");
          const msg = {
            error: "rate limit exceeded for query-payment",
            hint: "Check for redirect loops",
            rateLimitExceeded: true,
          };
          return Promise.resolve(msg);
        }
      }
      return wallet.queryPayment(detail.url);
    },
    ["exchange-info"]: (detail) => {
      if (!detail.baseUrl) {
        return Promise.resolve({ error: "bad url" });
      }
      return wallet.updateExchangeFromUrl(detail.baseUrl);
    },
    ["currency-info"]: (detail) => {
      if (!detail.name) {
        return Promise.resolve({ error: "name missing" });
      }
      return wallet.getCurrencyRecord(detail.name);
    },
    ["hash-contract"]: (detail) => {
      if (!detail.contract) {
        return Promise.resolve({ error: "contract missing" });
      }
      return wallet.hashContract(detail.contract).then((hash) => {
        return { hash };
      });
    },
    ["put-history-entry"]: (detail: any) => {
      if (!detail.historyEntry) {
        return Promise.resolve({ error: "historyEntry missing" });
      }
      return wallet.putHistory(detail.historyEntry);
    },
    ["save-offer"]: (detail: any) => {
      const offer = detail.offer;
      if (!offer) {
        return Promise.resolve({ error: "offer missing" });
      }
      console.log("handling safe-offer", detail);
      // FIXME:  fully migrate to new terminology
      const checkedOffer = OfferRecord.checked(offer);
      return wallet.saveOffer(checkedOffer);
    },
    ["reserve-creation-info"]: (detail, sender) => {
      if (!detail.baseUrl || typeof detail.baseUrl !== "string") {
        return Promise.resolve({ error: "bad url" });
      }
      const amount = AmountJson.checked(detail.amount);
      return wallet.getReserveCreationInfo(detail.baseUrl, amount);
    },
    ["get-history"]: (detail, sender) => {
      // TODO: limit history length
      return wallet.getHistory();
    },
    ["get-offer"]: (detail, sender) => {
      return wallet.getOffer(detail.offerId);
    },
    ["get-exchanges"]: (detail, sender) => {
      return wallet.getExchanges();
    },
    ["get-currencies"]: (detail, sender) => {
      return wallet.getCurrencies();
    },
    ["update-currency"]: (detail, sender) => {
      return wallet.updateCurrency(detail.currencyRecord);
    },
    ["get-reserves"]: (detail, sender) => {
      if (typeof detail.exchangeBaseUrl !== "string") {
        return Promise.reject(Error("exchangeBaseUrl missing"));
      }
      return wallet.getReserves(detail.exchangeBaseUrl);
    },
    ["get-payback-reserves"]: (detail, sender) => {
      return wallet.getPaybackReserves();
    },
    ["withdraw-payback-reserve"]: (detail, sender) => {
      if (typeof detail.reservePub !== "string") {
        return Promise.reject(Error("reservePub missing"));
      }
      return wallet.withdrawPaybackReserve(detail.reservePub);
    },
    ["get-coins"]: (detail, sender) => {
      if (typeof detail.exchangeBaseUrl !== "string") {
        return Promise.reject(Error("exchangBaseUrl missing"));
      }
      return wallet.getCoins(detail.exchangeBaseUrl);
    },
    ["get-precoins"]: (detail, sender) => {
      if (typeof detail.exchangeBaseUrl !== "string") {
        return Promise.reject(Error("exchangBaseUrl missing"));
      }
      return wallet.getPreCoins(detail.exchangeBaseUrl);
    },
    ["get-denoms"]: (detail, sender) => {
      if (typeof detail.exchangeBaseUrl !== "string") {
        return Promise.reject(Error("exchangBaseUrl missing"));
      }
      return wallet.getDenoms(detail.exchangeBaseUrl);
    },
    ["refresh-coin"]: (detail, sender) => {
      if (typeof detail.coinPub !== "string") {
        return Promise.reject(Error("coinPub missing"));
      }
      return wallet.refresh(detail.coinPub);
    },
    ["payback-coin"]: (detail, sender) => {
      if (typeof detail.coinPub !== "string") {
        return Promise.reject(Error("coinPub missing"));
      }
      return wallet.payback(detail.coinPub);
    },
    ["payment-failed"]: (detail, sender) => {
      // For now we just update exchanges (maybe the exchange did something
      // wrong and the keys were messed up).
      // FIXME: in the future we should look at what actually went wrong.
      console.error("payment reported as failed");
      wallet.updateExchanges();
      return Promise.resolve();
    },
    ["payment-succeeded"]: (detail, sender) => {
      const contractHash = detail.contractHash;
      const merchantSig = detail.merchantSig;
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
    const r = await p;
    try {
      sendResponse(r);
    } catch (e) {
      // might fail if tab disconnected
    }
  } catch (e) {
    console.log(`exception during wallet handler for '${req.type}'`);
    console.log("request", req);
    console.error(e);
    let stack;
    try {
      stack = e.stack.toString();
    } catch (e) {
      // might fail
    }
    try {
      sendResponse({
        error: "exception",
        hint: e.message,
        stack,
      });
    } catch (e) {
      console.log(e);
      // might fail if tab disconnected
    }
  }
}


class ChromeNotifier implements Notifier {
  private ports: Port[] = [];

  constructor() {
    chrome.runtime.onConnect.addListener((port) => {
      console.log("got connect!");
      this.ports.push(port);
      port.onDisconnect.addListener(() => {
        const i = this.ports.indexOf(port);
        if (i >= 0) {
          this.ports.splice(i, 1);
        } else {
          console.error("port already removed");
        }
      });
    });
  }

  notify() {
    for (const p of this.ports) {
      p.postMessage({ notify: true });
    }
  }
}


/**
 * Mapping from tab ID to payment information (if any).
 */
const paymentRequestCookies: { [n: number]: any } = {};


/**
 * Handle a HTTP response that has the "402 Payment Required" status.
 * In this callback we don't have access to the body, and must communicate via
 * shared state with the content script that will later be run later
 * in this tab.
 */
function handleHttpPayment(headerList: chrome.webRequest.HttpHeader[], url: string, tabId: number): any {
  const headers: { [s: string]: string } = {};
  for (const kv of headerList) {
    if (kv.value) {
      headers[kv.name.toLowerCase()] = kv.value;
    }
  }

  const fields = {
    contract_query: headers["x-taler-contract-query"],
    contract_url: headers["x-taler-contract-url"],
    offer_url: headers["x-taler-offer-url"],
  };

  const talerHeaderFound = Object.keys(fields).filter((x: any) => (fields as any)[x]).length !== 0;

  if (!talerHeaderFound) {
    // looks like it's not a taler request, it might be
    // for a different payment system (or the shop is buggy)
    console.log("ignoring non-taler 402 response");
    return;
  }

  const payDetail = {
    contract_url: fields.contract_url,
    offer_url: fields.offer_url,
  };

  console.log("got pay detail", payDetail);

  // This cookie will be read by the injected content script
  // in the tab that displays the page.
  paymentRequestCookies[tabId] = {
    payDetail,
    type: "pay",
  };
}


function handleBankRequest(wallet: Wallet, headerList: chrome.webRequest.HttpHeader[],
                           url: string, tabId: number): any {
  const headers: { [s: string]: string } = {};
  for (const kv of headerList) {
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
    const callbackUrl = headers["x-taler-callback-url"];
    if (!callbackUrl) {
      console.log("202 not understood (X-Taler-Callback-Url missing)");
      return;
    }
    let amountParsed;
    try {
      amountParsed = JSON.parse(amount);
    } catch (e) {
      const uri = new URI(chrome.extension.getURL("/src/webex/pages/error.html"));
      const p = {
        message: `Can't parse amount ("${amount}"): ${e.message}`,
      };
      const redirectUrl = uri.query(p).href();
      // FIXME: use direct redirect when https://bugzilla.mozilla.org/show_bug.cgi?id=707624 is fixed
      chrome.tabs.update(tabId, {url: redirectUrl});
      return;
    }
    const wtTypes = headers["x-taler-wt-types"];
    if (!wtTypes) {
      console.log("202 not understood (X-Taler-Wt-Types missing)");
      return;
    }
    const params = {
      amount,
      bank_url: url,
      callback_url: new URI(callbackUrl) .absoluteTo(url),
      suggested_exchange_url: headers["x-taler-suggested-exchange"],
      wt_types: wtTypes,
    };
    const uri = new URI(chrome.extension.getURL("/src/webex/pages/confirm-create-reserve.html"));
    const redirectUrl = uri.query(params).href();
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

/**
 * Main function to run for the WebExtension backend.
 *
 * Sets up all event handlers and other machinery.
 */
export async function wxMain() {
  window.onerror = (m, source, lineno, colno, error) => {
    logging.record("error", m + error, undefined, source || "(unknown)", lineno || 0, colno || 0);
  };

  chrome.browserAction.setBadgeText({ text: "" });
  const badge = new ChromeBadge();

  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab.url || !tab.id) {
        return;
      }
      const uri = new URI(tab.url);
      if (uri.protocol() === "http" || uri.protocol() === "https") {
        console.log("injecting into existing tab", tab.id);
        chrome.tabs.executeScript(tab.id, { file: "/dist/contentScript-bundle.js" });
        const code = `
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
    const tt = tabTimers[tabId] || [];
    for (const t of tt) {
      chrome.extension.getBackgroundPage().clearTimeout(t);
    }
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status !== "complete") {
      return;
    }
    const timers: number[] = [];

    const addRun = (dt: number) => {
      const id = chrome.extension.getBackgroundPage().setTimeout(run, dt);
      timers.push(id);
    };

    const run = () => {
      timers.shift();
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          return;
        }
        if (!tab.url || !tab.id) {
          return;
        }
        const uri = new URI(tab.url);
        if (!(uri.protocol() === "http" || uri.protocol() === "https")) {
          return;
        }
        const code = `
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
    if (details.statusCode === 402) {
      console.log(`got 402 from ${details.url}`);
      return handleHttpPayment(details.responseHeaders || [],
        details.url,
        details.tabId);
    } else if (details.statusCode === 202) {
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

          for (const n in Stores) {
            if ((Stores as any)[n] instanceof Store) {
              const si: Store<any> = (Stores as any)[n];
              const s = db.createObjectStore(si.name, si.storeParams);
              for (const indexName in (si as any)) {
                if ((si as any)[indexName] instanceof Index) {
                  const ii: Index<any, any> = (si as any)[indexName];
                  s.createIndex(ii.indexName, ii.keyPath);
                }
              }
            }
          }
          break;
        default:
          if (e.oldVersion !== DB_VERSION) {
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
  const dump = {
    name: db.name,
    stores: {} as {[s: string]: any},
    version: db.version,
  };

  return new Promise((resolve, reject) => {

    const tx = db.transaction(Array.from(db.objectStoreNames));
    tx.addEventListener("complete", () => {
      resolve(dump);
    });
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      const name = db.objectStoreNames[i];
      const storeDump = {} as {[s: string]: any};
      dump.stores[name] = storeDump;
      tx.objectStore(name)
        .openCursor()
        .addEventListener("success", (e: Event) => {
          const cursor = (e.target as any).result;
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
    const tx = db.transaction(Array.from(db.objectStoreNames), "readwrite");
    if (dump.stores) {
      for (const storeName in dump.stores) {
        const objects = [];
        const dumpStore = dump.stores[storeName];
        for (const key in dumpStore) {
          objects.push(dumpStore[key]);
        }
        console.log(`importing ${objects.length} records into ${storeName}`);
        const store = tx.objectStore(storeName);
        const clearReq = store.clear();
        for (const obj of objects) {
          store.put(obj);
        }
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
