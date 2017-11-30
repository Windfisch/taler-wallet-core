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
import { BrowserHttpLib } from "../http";
import * as logging from "../logging";
import {
  Index,
  Store,
} from "../query";
import {
  AcceptTipRequest,
  AmountJson,
  ConfirmReserveRequest,
  CreateReserveRequest,
  GetTipPlanchetsRequest,
  Notifier,
  ProcessTipResponseRequest,
  ProposalRecord,
  ReturnCoinsRequest,
  TipStatusRequest,
} from "../types";
import {
  Stores,
  WALLET_DB_VERSION,
  Wallet,
} from "../wallet";


import { ChromeBadge } from "./chromeBadge";
import { MessageType } from "./messages";
import * as wxApi from "./wxApi";

import URI = require("urijs");
import Port = chrome.runtime.Port;
import MessageSender = chrome.runtime.MessageSender;


const DB_NAME = "taler";

const NeedsWallet = Symbol("NeedsWallet");

function handleMessage(sender: MessageSender,
                       type: MessageType, detail: any): any {
  function assertNotFound(t: never): never {
    console.error(`Request type ${t as string} unknown`);
    console.error(`Request detail was ${detail}`);
    return { error: "request unknown", requestType: type } as never;
  }
  function needsWallet(): Wallet {
    if (!currentWallet) {
      throw NeedsWallet;
    }
    return currentWallet;
  }
  switch (type) {
    case "balances": {
      return needsWallet().getBalances();
    }
    case "dump-db": {
      const db = needsWallet().db;
      return exportDb(db);
    }
    case "import-db": {
      const db = needsWallet().db;
      return importDb(db, detail.dump);
    }
    case "get-tab-cookie": {
      if (!sender || !sender.tab || !sender.tab.id) {
        return Promise.resolve();
      }
      const id: number = sender.tab.id;
      const info: any = paymentRequestCookies[id] as any;
      delete paymentRequestCookies[id];
      return Promise.resolve(info);
    }
    case "ping": {
      return Promise.resolve();
    }
    case "reset-db": {
      if (currentWallet) {
        const db = currentWallet.db;
        const tx = db.transaction(Array.from(db.objectStoreNames), "readwrite");
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < db.objectStoreNames.length; i++) {
          tx.objectStore(db.objectStoreNames[i]).clear();
        }
      }
      deleteDb();
      chrome.browserAction.setBadgeText({ text: "" });
      console.log("reset done");
      if (!currentWallet) {
        reinitWallet();
      }
      return Promise.resolve({});
    }
    case "create-reserve": {
      const d = {
        amount: detail.amount,
        exchange: detail.exchange,
        senderWire: detail.senderWire,
      };
      const req = CreateReserveRequest.checked(d);
      return needsWallet().createReserve(req);
    }
    case "confirm-reserve": {
      const d = {
        reservePub: detail.reservePub,
      };
      const req = ConfirmReserveRequest.checked(d);
      return needsWallet().confirmReserve(req);
    }
    case "generate-nonce": {
      return needsWallet().generateNonce();
    }
    case "confirm-pay": {
      if (typeof detail.proposalId !== "number") {
        throw Error("proposalId must be number");
      }
      return needsWallet().confirmPay(detail.proposalId);
    }
    case "check-pay": {
      if (typeof detail.proposalId !== "number") {
        throw Error("proposalId must be number");
      }
      return needsWallet().checkPay(detail.proposalId);
    }
    case "query-payment": {
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
      return needsWallet().queryPayment(detail.url);
    }
    case "exchange-info": {
      if (!detail.baseUrl) {
        return Promise.resolve({ error: "bad url" });
      }
      return needsWallet().updateExchangeFromUrl(detail.baseUrl);
    }
    case "currency-info": {
      if (!detail.name) {
        return Promise.resolve({ error: "name missing" });
      }
      return needsWallet().getCurrencyRecord(detail.name);
    }
    case "hash-contract": {
      if (!detail.contract) {
        return Promise.resolve({ error: "contract missing" });
      }
      return needsWallet().hashContract(detail.contract).then((hash) => {
        return hash;
      });
    }
    case "save-proposal": {
      console.log("handling save-proposal", detail);
      const checkedRecord = ProposalRecord.checked(detail.proposal);
      return needsWallet().saveProposal(checkedRecord);
    }
    case "reserve-creation-info": {
      if (!detail.baseUrl || typeof detail.baseUrl !== "string") {
        return Promise.resolve({ error: "bad url" });
      }
      const amount = AmountJson.checked(detail.amount);
      return needsWallet().getReserveCreationInfo(detail.baseUrl, amount);
    }
    case "get-history": {
      // TODO: limit history length
      return needsWallet().getHistory();
    }
    case "get-proposal": {
      return needsWallet().getProposal(detail.proposalId);
    }
    case "get-exchanges": {
      return needsWallet().getExchanges();
    }
    case "get-currencies": {
      return needsWallet().getCurrencies();
    }
    case "update-currency": {
      return needsWallet().updateCurrency(detail.currencyRecord);
    }
    case "get-reserves": {
      if (typeof detail.exchangeBaseUrl !== "string") {
        return Promise.reject(Error("exchangeBaseUrl missing"));
      }
      return needsWallet().getReserves(detail.exchangeBaseUrl);
    }
    case "get-payback-reserves": {
      return needsWallet().getPaybackReserves();
    }
    case "withdraw-payback-reserve": {
      if (typeof detail.reservePub !== "string") {
        return Promise.reject(Error("reservePub missing"));
      }
      return needsWallet().withdrawPaybackReserve(detail.reservePub);
    }
    case "get-coins": {
      if (typeof detail.exchangeBaseUrl !== "string") {
        return Promise.reject(Error("exchangBaseUrl missing"));
      }
      return needsWallet().getCoins(detail.exchangeBaseUrl);
    }
    case "get-precoins": {
      if (typeof detail.exchangeBaseUrl !== "string") {
        return Promise.reject(Error("exchangBaseUrl missing"));
      }
      return needsWallet().getPreCoins(detail.exchangeBaseUrl);
    }
    case "get-denoms": {
      if (typeof detail.exchangeBaseUrl !== "string") {
        return Promise.reject(Error("exchangBaseUrl missing"));
      }
      return needsWallet().getDenoms(detail.exchangeBaseUrl);
    }
    case "refresh-coin": {
      if (typeof detail.coinPub !== "string") {
        return Promise.reject(Error("coinPub missing"));
      }
      return needsWallet().refresh(detail.coinPub);
    }
    case "payback-coin": {
      if (typeof detail.coinPub !== "string") {
        return Promise.reject(Error("coinPub missing"));
      }
      return needsWallet().payback(detail.coinPub);
    }
    case "payment-failed": {
      // For now we just update exchanges (maybe the exchange did something
      // wrong and the keys were messed up).
      // FIXME: in the future we should look at what actually went wrong.
      console.error("payment reported as failed");
      needsWallet().updateExchanges();
      return Promise.resolve();
    }
    case "payment-succeeded": {
      const contractTermsHash = detail.contractTermsHash;
      const merchantSig = detail.merchantSig;
      if (!contractTermsHash) {
        return Promise.reject(Error("contractHash missing"));
      }
      if (!merchantSig) {
        return Promise.reject(Error("merchantSig missing"));
      }
      return needsWallet().paymentSucceeded(contractTermsHash, merchantSig);
    }
    case "get-sender-wire-infos": {
      return needsWallet().getSenderWireInfos();
    }
    case "return-coins": {
      const d = {
        amount: detail.amount,
        exchange: detail.exchange,
        senderWire: detail.senderWire,
      };
      const req = ReturnCoinsRequest.checked(d);
      return needsWallet().returnCoins(req);
    }
    case "check-upgrade": {
      let dbResetRequired = false;
      if (!currentWallet) {
        dbResetRequired = true;
      }
      const resp: wxApi.UpgradeResponse = {
        currentDbVersion: WALLET_DB_VERSION.toString(),
        dbResetRequired,
        oldDbVersion: (oldDbVersion || "unknown").toString(),
      };
      return resp;
    }
    case "log-and-display-error":
      logging.storeReport(detail).then((reportUid) => {
        const url = chrome.extension.getURL(`/src/webex/pages/error.html?reportUid=${reportUid}`);
        if (detail.sameTab && sender && sender.tab && sender.tab.id) {
          chrome.tabs.update(detail.tabId, { url });
        } else {
          chrome.tabs.create({ url });
        }
      });
      return;
    case "get-report":
      return logging.getReport(detail.reportUid);
    case "accept-refund":
      return needsWallet().acceptRefund(detail.refund_permissions);
    case "get-purchase": {
      const contractTermsHash = detail.contractTermsHash;
      if (!contractTermsHash) {
        throw Error("contractTermsHash missing");
      }
      return needsWallet().getPurchase(contractTermsHash);
    }
    case "get-full-refund-fees":
      return needsWallet().getFullRefundFees(detail.refundPermissions);
    case "get-tip-status": {
      const req = TipStatusRequest.checked(detail);
      return needsWallet().getTipStatus(req.merchantDomain, req.tipId);
    }
    case "accept-tip": {
      const req = AcceptTipRequest.checked(detail);
      return needsWallet().acceptTip(req.merchantDomain, req.tipId);
    }
    case "process-tip-response": {
      const req = ProcessTipResponseRequest.checked(detail);
      return needsWallet().processTipResponse(req.merchantDomain, req.tipId, req.tipResponse);
    }
    case "get-tip-planchets": {
      const req = GetTipPlanchetsRequest.checked(detail);
      return needsWallet().getTipPlanchets(req.merchantDomain, req.tipId, req.amount, req.deadline, req.exchangeUrl);
    }
    default:
      // Exhaustiveness check.
      // See https://www.typescriptlang.org/docs/handbook/advanced-types.html
      return assertNotFound(type);
  }
}

async function dispatch(req: any, sender: any, sendResponse: any): Promise<void> {
  try {
    const p = handleMessage(sender, req.type, req.detail);
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
        message: e.message,
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
 *
 * Used to pass information from an intercepted HTTP header to the content
 * script on the page.
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
    contract_url: headers["x-taler-contract-url"],
    offer_url: headers["x-taler-offer-url"],
    refund_url: headers["x-taler-refund-url"],
    tip: headers["x-taler-tip"],
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
    refund_url: fields.refund_url,
    tip: fields.tip,
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

  const operation = headers["x-taler-operation"];

  if (!operation) {
    // Not a taler related request.
    return;
  }

  if (operation === "confirm-reserve") {
    const reservePub = headers["x-taler-reserve-pub"];
    if (reservePub !== undefined) {
      console.log(`confirming reserve ${reservePub} via 201`);
      wallet.confirmReserve({reservePub});
    }
    console.warn("got 'X-Taler-Operation: confirm-reserve' without 'X-Taler-Reserve-Pub'");
    return;
  }

  if (operation === "create-reserve") {
    const amount = headers["x-taler-amount"];
    if (!amount) {
      console.log("202 not understood (X-Taler-Amount missing)");
      return;
    }
    const callbackUrl = headers["x-taler-callback-url"];
    if (!callbackUrl) {
      console.log("202 not understood (X-Taler-Callback-Url missing)");
      return;
    }
    let amountParsed;
    try {
      amountParsed = JSON.parse(amount);
    } catch (e) {
      const errUri = new URI(chrome.extension.getURL("/src/webex/pages/error.html"));
      const p = {
        message: `Can't parse amount ("${amount}"): ${e.message}`,
      };
      const errRedirectUrl = errUri.query(p).href();
      // FIXME: use direct redirect when https://bugzilla.mozilla.org/show_bug.cgi?id=707624 is fixed
      chrome.tabs.update(tabId, {url: errRedirectUrl});
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
      sender_wire: headers["x-taler-sender-wire"],
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

  console.log("Ignoring unknown X-Taler-Operation:", operation);
}


// Rate limit cache for executePayment operations, to break redirect loops
let rateLimitCache: { [n: number]: number } = {};

function clearRateLimitCache() {
  rateLimitCache = {};
}


/**
 * Currently active wallet instance.  Might be unloaded and
 * re-instantiated when the database is reset.
 */
let currentWallet: Wallet|undefined;

/**
 * Last version if an outdated DB, if applicable.
 */
let oldDbVersion: number|undefined;


async function reinitWallet() {
  if (currentWallet) {
    currentWallet.stop();
    currentWallet = undefined;
  }
  chrome.browserAction.setBadgeText({ text: "" });
  const badge = new ChromeBadge();
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
  const wallet = new Wallet(db, http, badge, notifier);
  // Useful for debugging in the background page.
  (window as any).talerWallet = wallet;
  currentWallet = wallet;
}


/**
 * Inject a script into a tab.  Gracefully logs errors
 * and works around a bug where the tab's URL does not match the internal URL,
 * making the injection fail in a confusing way.
 */
function injectScript(tabId: number, details: chrome.tabs.InjectDetails, actualUrl: string): void {
  chrome.tabs.executeScript(tabId, details,  () => {
    // Required to squelch chrome's "unchecked lastError" warning.
    // Sometimes chrome reports the URL of a tab as http/https but
    // injection fails.  This can happen when a page is unloaded or
    // shows a "no internet" page etc.
    if (chrome.runtime.lastError) {
      console.warn("injection failed on page", actualUrl, chrome.runtime.lastError.message);
    }
  });
}


/**
 * Main function to run for the WebExtension backend.
 *
 * Sets up all event handlers and other machinery.
 */
export async function wxMain() {
  // Explicitly unload the extension page as soon as an update is available,
  // so the update gets installed as soon as possible.
  chrome.runtime.onUpdateAvailable.addListener((details) => {
    console.log("update available:", details);
    chrome.runtime.reload();
  });

  window.onerror = (m, source, lineno, colno, error) => {
    logging.record("error", m + error, undefined, source || "(unknown)", lineno || 0, colno || 0);
  };

  chrome.tabs.query({}, (tabs) => {
    console.log("got tabs", tabs);
    for (const tab of tabs) {
      if (!tab.url || !tab.id) {
        continue;
      }
      const uri = new URI(tab.url);
      if (uri.protocol() !== "http" && uri.protocol() !== "https") {
        continue;
      }
      console.log("injecting into existing tab", tab.id, "with url", uri.href(), "protocol", uri.protocol());
      injectScript(tab.id, { file: "/dist/contentScript-bundle.js", runAt: "document_start" }, uri.href());
      const code = `
        if (("taler" in window) || document.documentElement.getAttribute("data-taler-nojs")) {
          document.dispatchEvent(new Event("taler-probe-result"));
        }
      `;
      injectScript(tab.id, { code, runAt: "document_start" }, uri.href());
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
        injectScript(tab.id!, { code, runAt: "document_start" }, uri.href());
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

  reinitWallet();

  // Handlers for messages coming directly from the content
  // script on the page
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    dispatch(req, sender, sendResponse);
    return true;
  });


  // Handlers for catching HTTP requests
  chrome.webRequest.onHeadersReceived.addListener((details) => {
    const wallet = currentWallet;
    if (!wallet) {
      console.warn("wallet not available while handling header");
    }
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
    const req = indexedDB.open(DB_NAME, WALLET_DB_VERSION);
    req.onerror = (e) => {
      console.log("taler database error", e);
      reject(e);
    };
    req.onsuccess = (e) => {
      req.result.onversionchange = (evt: IDBVersionChangeEvent) => {
        console.log(`handling live db version change from ${evt.oldVersion} to ${evt.newVersion}`);
        req.result.close();
        reinitWallet();
      };
      resolve(req.result);
    };
    req.onupgradeneeded = (e) => {
      const db = req.result;
      console.log(`DB: upgrade needed: oldVersion=${e.oldVersion}, newVersion=${e.newVersion}`);
      switch (e.oldVersion) {
        case 0: // DB does not exist yet

          for (const n in Stores) {
            if ((Stores as any)[n] instanceof Store) {
              const si: Store<any> = (Stores as any)[n];
              const s = db.createObjectStore(si.name, si.storeParams);
              for (const indexName in (si as any)) {
                if ((si as any)[indexName] instanceof Index) {
                  const ii: Index<any, any> = (si as any)[indexName];
                  s.createIndex(ii.indexName, ii.keyPath, ii.options);
                }
              }
            }
          }
          break;
        default:
          if (e.oldVersion !== WALLET_DB_VERSION) {
            oldDbVersion = e.oldVersion;
            chrome.tabs.create({
              url: chrome.extension.getURL("/src/webex/pages/reset-required.html"),
            });
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
