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
import { AmountJson } from "../amounts";
import {
  ConfirmReserveRequest,
  CreateReserveRequest,
  Notifier,
  ReturnCoinsRequest,
  WalletDiagnostics,
} from "../walletTypes";
import { Wallet } from "../wallet";
import { isFirefox } from "./compat";
import { WALLET_DB_VERSION } from "../dbTypes";
import { openTalerDb, exportDb, importDb, deleteDb } from "../db";
import { ChromeBadge } from "./chromeBadge";
import { MessageType } from "./messages";
import * as wxApi from "./wxApi";
import URI = require("urijs");
import Port = chrome.runtime.Port;
import MessageSender = chrome.runtime.MessageSender;
import { BrowserCryptoWorkerFactory } from "../crypto/cryptoApi";
import { OpenedPromise, openPromise } from "../promiseUtils";

const NeedsWallet = Symbol("NeedsWallet");

async function handleMessage(
  sender: MessageSender,
  type: MessageType,
  detail: any,
): Promise<any> {
  function assertNotFound(t: never): never {
    console.error(`Request type ${t as string} unknown`);
    console.error(`Request detail was ${detail}`);
    return {
      error: {
        message: `request type ${t as string} unknown`,
        requestType: type,
      },
    } as never;
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
      deleteDb(indexedDB);
      setBadgeText({ text: "" });
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
    case "confirm-pay": {
      if (typeof detail.proposalId !== "number") {
        throw Error("proposalId must be number");
      }
      return needsWallet().confirmPay(detail.proposalId, detail.sessionId);
    }
    case "submit-pay": {
      if (typeof detail.contractTermsHash !== "string") {
        throw Error("contractTermsHash must be a string");
      }
      return needsWallet().submitPay(
        detail.contractTermsHash,
        detail.sessionId,
      );
    }
    case "check-pay": {
      if (typeof detail.proposalId !== "number") {
        throw Error("proposalId must be number");
      }
      return needsWallet().checkPay(detail.proposalId);
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
      return needsWallet()
        .hashContract(detail.contract)
        .then(hash => {
          return hash;
        });
    }
    case "reserve-creation-info": {
      if (!detail.baseUrl || typeof detail.baseUrl !== "string") {
        return Promise.resolve({ error: "bad url" });
      }
      const amount = AmountJson.checked(detail.amount);
      return needsWallet().getWithdrawDetailsForAmount(detail.baseUrl, amount);
    }
    case "get-history": {
      // TODO: limit history length
      return needsWallet().getHistory();
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
        oldDbVersion: (outdatedDbVersion || "unknown").toString(),
      };
      return resp;
    }
    case "log-and-display-error":
      logging.storeReport(detail).then(reportUid => {
        const url = chrome.extension.getURL(
          `/src/webex/pages/error.html?reportUid=${reportUid}`,
        );
        if (detail.sameTab && sender && sender.tab && sender.tab.id) {
          chrome.tabs.update(detail.tabId, { url });
        } else {
          chrome.tabs.create({ url });
        }
      });
      return;
    case "get-report":
      return logging.getReport(detail.reportUid);
    case "get-purchase-details": {
      const contractTermsHash = detail.contractTermsHash;
      if (!contractTermsHash) {
        throw Error("contractTermsHash missing");
      }
      return needsWallet().getPurchaseDetails(contractTermsHash);
    }
    case "accept-refund":
      return needsWallet().applyRefund(detail.refundUrl);
    case "get-tip-status": {
      return needsWallet().getTipStatus(detail.talerTipUri);
    }
    case "accept-tip": {
      return needsWallet().acceptTip(detail.talerTipUri);
    }
    case "clear-notification": {
      return needsWallet().clearNotification();
    }
    case "download-proposal": {
      return needsWallet().downloadProposal(detail.url);
    }
    case "abort-failed-payment": {
      if (!detail.contractTermsHash) {
        throw Error("contracTermsHash not given");
      }
      return needsWallet().abortFailedPayment(detail.contractTermsHash);
    }
    case "benchmark-crypto": {
      if (!detail.repetitions) {
        throw Error("repetitions not given");
      }
      return needsWallet().benchmarkCrypto(detail.repetitions);
    }
    case "get-withdraw-details": {
      return needsWallet().getWithdrawDetailsForUri(
        detail.talerWithdrawUri,
        detail.maybeSelectedExchange,
      );
    }
    case "accept-withdrawal": {
      return needsWallet().acceptWithdrawal(
        detail.talerWithdrawUri,
        detail.selectedExchange,
      );
    }
    case "get-diagnostics": {
      const manifestData = chrome.runtime.getManifest();
      const errors: string[] = [];
      let firefoxIdbProblem = false;
      let dbOutdated = false;
      try {
        await walletInit.promise;
      } catch (e) {
        errors.push("Error during wallet initialization: " + e);
        if (currentDatabase === undefined && outdatedDbVersion === undefined && isFirefox()) {
          firefoxIdbProblem = true;
        }
      }
      if (!currentWallet) {
        errors.push("Could not create wallet backend.");
      }
      if (!currentDatabase) {
        errors.push("Could not open database");
      }
      if (outdatedDbVersion !== undefined) {
        errors.push(`Outdated DB version: ${outdatedDbVersion}`);
        dbOutdated = true;
      }
      const diagnostics: WalletDiagnostics = {
        walletManifestDisplayVersion:
          manifestData.version_name || "(undefined)",
        walletManifestVersion: manifestData.version,
        errors,
        firefoxIdbProblem,
        dbOutdated,
      };
      return diagnostics;
    }
    case "prepare-pay":
      return needsWallet().preparePay(detail.talerPayUri);
    default:
      // Exhaustiveness check.
      // See https://www.typescriptlang.org/docs/handbook/advanced-types.html
      return assertNotFound(type);
  }
}

async function dispatch(
  req: any,
  sender: any,
  sendResponse: any,
): Promise<void> {
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
        error: {
          message: e.message,
          stack,
        },
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
    chrome.runtime.onConnect.addListener(port => {
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

function getTab(tabId: number): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab: chrome.tabs.Tab) => resolve(tab));
  });
}

function setBadgeText(options: chrome.browserAction.BadgeTextDetails) {
  // not supported by all browsers ...
  if (chrome && chrome.browserAction && chrome.browserAction.setBadgeText) {
    chrome.browserAction.setBadgeText(options);
  } else {
    console.warn("can't set badge text, not supported", options);
  }
}

function waitMs(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.extension
      .getBackgroundPage()!
      .setTimeout(() => resolve(), timeoutMs);
  });
}

function makeSyncWalletRedirect(
  url: string,
  tabId: number,
  oldUrl: string,
  params?: { [name: string]: string | undefined },
): object {
  const innerUrl = new URI(chrome.extension.getURL("/src/webex/pages/" + url));
  if (params) {
    for (const key in params) {
      if (params[key]) {
        innerUrl.addSearch(key, params[key]);
      }
    }
  }
  const outerUrl = new URI(
    chrome.extension.getURL("/src/webex/pages/redirect.html"),
  );
  outerUrl.addSearch("url", innerUrl);
  if (isFirefox()) {
    // Some platforms don't support the sync redirect (yet), so fall back to
    // async redirect after a timeout.
    const doit = async () => {
      await waitMs(150);
      const tab = await getTab(tabId);
      if (tab.url === oldUrl) {
        chrome.tabs.update(tabId, { url: outerUrl.href() });
      }
    };
    doit();
  }
  return { redirectUrl: outerUrl.href() };
}

/**
 * Currently active wallet instance.  Might be unloaded and
 * re-instantiated when the database is reset.
 */
let currentWallet: Wallet | undefined;

let currentDatabase: IDBDatabase | undefined;

/**
 * Last version if an outdated DB, if applicable.
 */
let outdatedDbVersion: number | undefined;

let walletInit: OpenedPromise<void> = openPromise<void>();

function handleUpgradeUnsupported(oldDbVersion: number, newDbVersion: number) {
  console.log("DB migration not supported");
  outdatedDbVersion = oldDbVersion;
  chrome.tabs.create({
    url: chrome.extension.getURL("/src/webex/pages/reset-required.html"),
  });
  setBadgeText({ text: "err" });
  chrome.browserAction.setBadgeBackgroundColor({ color: "#F00" });
}

async function reinitWallet() {
  if (currentWallet) {
    currentWallet.stop();
    currentWallet = undefined;
  }
  currentDatabase = undefined;
  setBadgeText({ text: "" });
  const badge = new ChromeBadge();
  try {
    currentDatabase = await openTalerDb(
      indexedDB,
      reinitWallet,
      handleUpgradeUnsupported,
    );
  } catch (e) {
    console.error("could not open database", e);
    walletInit.reject(e);
    return;
  }
  const http = new BrowserHttpLib();
  const notifier = new ChromeNotifier();
  console.log("setting wallet");
  const wallet = new Wallet(
    currentDatabase,
    http,
    badge,
    notifier,
    new BrowserCryptoWorkerFactory(),
  );
  // Useful for debugging in the background page.
  (window as any).talerWallet = wallet;
  currentWallet = wallet;
  walletInit.resolve();
}

/**
 * Inject a script into a tab.  Gracefully logs errors
 * and works around a bug where the tab's URL does not match the internal URL,
 * making the injection fail in a confusing way.
 */
function injectScript(
  tabId: number,
  details: chrome.tabs.InjectDetails,
  actualUrl: string,
): void {
  chrome.tabs.executeScript(tabId, details, () => {
    // Required to squelch chrome's "unchecked lastError" warning.
    // Sometimes chrome reports the URL of a tab as http/https but
    // injection fails.  This can happen when a page is unloaded or
    // shows a "no internet" page etc.
    if (chrome.runtime.lastError) {
      console.warn(
        "injection failed on page",
        actualUrl,
        chrome.runtime.lastError.message,
      );
    }
  });
}

/**
 * Main function to run for the WebExtension backend.
 *
 * Sets up all event handlers and other machinery.
 */
export async function wxMain() {
  chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === "install") {
      const url = chrome.extension.getURL("/src/webex/pages/welcome.html");
      chrome.tabs.create({ active: true, url: url });
    }
  });

  // Explicitly unload the extension page as soon as an update is available,
  // so the update gets installed as soon as possible.
  chrome.runtime.onUpdateAvailable.addListener(details => {
    console.log("update available:", details);
    chrome.runtime.reload();
  });

  window.onerror = (m, source, lineno, colno, error) => {
    logging.record(
      "error",
      "".concat(m as any, error as any),
      undefined,
      source || "(unknown)",
      lineno || 0,
      colno || 0,
    );
  };

  chrome.tabs.query({}, tabs => {
    console.log("got tabs", tabs);
    for (const tab of tabs) {
      if (!tab.url || !tab.id) {
        continue;
      }
      const uri = new URI(tab.url);
      if (uri.protocol() !== "http" && uri.protocol() !== "https") {
        continue;
      }
      console.log(
        "injecting into existing tab",
        tab.id,
        "with url",
        uri.href(),
        "protocol",
        uri.protocol(),
      );
      injectScript(
        tab.id,
        { file: "/dist/contentScript-bundle.js", runAt: "document_start" },
        uri.href(),
      );
      const code = `
        if (("taler" in window) || document.documentElement.getAttribute("data-taler-nojs")) {
          document.dispatchEvent(new Event("taler-probe-result"));
        }
      `;
      injectScript(tab.id, { code, runAt: "document_start" }, uri.href());
    }
  });

  const tabTimers: { [n: number]: number[] } = {};

  chrome.tabs.onRemoved.addListener((tabId, changeInfo) => {
    const tt = tabTimers[tabId] || [];
    for (const t of tt) {
      chrome.extension.getBackgroundPage()!.clearTimeout(t);
    }
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status !== "complete") {
      return;
    }
    const timers: number[] = [];

    const addRun = (dt: number) => {
      const id = chrome.extension.getBackgroundPage()!.setTimeout(run, dt);
      timers.push(id);
    };

    const run = () => {
      timers.shift();
      chrome.tabs.get(tabId, tab => {
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

  reinitWallet();

  // Handlers for messages coming directly from the content
  // script on the page
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    dispatch(req, sender, sendResponse);
    return true;
  });

  // Clear notifications both when the popop opens,
  // as well when it closes.
  chrome.runtime.onConnect.addListener(port => {
    if (port.name === "popup") {
      if (currentWallet) {
        currentWallet.clearNotification();
      }
      port.onDisconnect.addListener(() => {
        if (currentWallet) {
          currentWallet.clearNotification();
        }
      });
    }
  });

  // Handlers for catching HTTP requests
  chrome.webRequest.onHeadersReceived.addListener(
    details => {
      const wallet = currentWallet;
      if (!wallet) {
        console.warn("wallet not available while handling header");
      }
      if (details.statusCode === 402) {
        console.log(`got 402 from ${details.url}`);
        for (let header of details.responseHeaders || []) {
          if (header.name.toLowerCase() === "taler") {
            const talerUri = header.value || "";
            if (!talerUri.startsWith("taler://")) {
              console.warn(
                "Response with HTTP 402 has Taler header, but header value is not a taler:// URI.",
              );
              break;
            }
            if (talerUri.startsWith("taler://withdraw/")) {
              return makeSyncWalletRedirect(
                "withdraw.html",
                details.tabId,
                details.url,
                {
                  talerWithdrawUri: talerUri,
                },
              );
            } else if (talerUri.startsWith("taler://pay/")) {
              return makeSyncWalletRedirect(
                "pay.html",
                details.tabId,
                details.url,
                {
                  talerPayUri: talerUri,
                },
              );
            } else if (talerUri.startsWith("taler://tip/")) {
              return makeSyncWalletRedirect(
                "tip.html",
                details.tabId,
                details.url,
                {
                  talerTipUri: talerUri,
                },
              );
            } else if (talerUri.startsWith("taler://refund/")) {
              return makeSyncWalletRedirect(
                "refund.html",
                details.tabId,
                details.url,
                {
                  talerRefundUri: talerUri,
                },
              );
            } else {
              console.warn("Unknown action in taler:// URI, ignoring.");
            }
            break;
          }
        }
      }
      return {};
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders", "blocking"],
  );
}
