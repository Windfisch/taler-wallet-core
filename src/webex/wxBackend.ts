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
import { BrowserCryptoWorkerFactory } from "../crypto/workers/cryptoApi";
import {
  deleteTalerDatabase,
  openTalerDatabase,
  WALLET_DB_VERSION,
} from "../db";
import {
  ReturnCoinsRequest,
  WalletDiagnostics,
  codecForCreateReserveRequest,
  codecForConfirmReserveRequest,
} from "../types/walletTypes";
import { codecForAmountJson } from "../util/amounts";
import { BrowserHttpLib } from "../util/http";
import { OpenedPromise, openPromise } from "../util/promiseUtils";
import { classifyTalerUri, TalerUriType } from "../util/taleruri";
import { Wallet } from "../wallet";
import { isFirefox, getPermissionsApi } from "./compat";
import { MessageType } from "./messages";
import * as wxApi from "./wxApi";
import MessageSender = chrome.runtime.MessageSender;
import { Database } from "../util/query";
import { extendedPermissions } from "./permissions";

const NeedsWallet = Symbol("NeedsWallet");

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

const walletInit: OpenedPromise<void> = openPromise<void>();

const notificationPorts: chrome.runtime.Port[] = [];

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
      return db.exportDatabase();
    }
    case "import-db": {
      const db = needsWallet().db;
      return db.importDatabase(detail.dump);
    }
    case "ping": {
      return Promise.resolve();
    }
    case "reset-db": {
      deleteTalerDatabase(indexedDB);
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
      const req = codecForCreateReserveRequest().decode(d);
      return needsWallet().createReserve(req);
    }
    case "confirm-reserve": {
      const d = {
        reservePub: detail.reservePub,
      };
      const req = codecForConfirmReserveRequest().decode(d);
      return needsWallet().confirmReserve(req);
    }
    case "confirm-pay": {
      if (typeof detail.proposalId !== "string") {
        throw Error("proposalId must be string");
      }
      return needsWallet().confirmPay(detail.proposalId, detail.sessionId);
    }
    case "exchange-info": {
      if (!detail.baseUrl) {
        return Promise.resolve({ error: "bad url" });
      }
      return needsWallet().updateExchangeFromUrl(detail.baseUrl);
    }
    case "reserve-creation-info": {
      if (!detail.baseUrl || typeof detail.baseUrl !== "string") {
        return Promise.resolve({ error: "bad url" });
      }
      const amount = codecForAmountJson().decode(detail.amount);
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
    case "get-coins": {
      if (typeof detail.exchangeBaseUrl !== "string") {
        return Promise.reject(Error("exchangBaseUrl missing"));
      }
      return needsWallet().getCoinsForExchange(detail.exchangeBaseUrl);
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
    case "get-purchase-details": {
      const proposalId = detail.proposalId;
      if (!proposalId) {
        throw Error("proposalId missing");
      }
      if (typeof proposalId !== "string") {
        throw Error("proposalId must be a string");
      }
      return needsWallet().getPurchaseDetails(proposalId);
    }
    case "accept-refund":
      return needsWallet().applyRefund(detail.refundUrl);
    case "get-tip-status": {
      return needsWallet().getTipStatus(detail.talerTipUri);
    }
    case "accept-tip": {
      return needsWallet().acceptTip(detail.talerTipUri);
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
        if (
          currentDatabase === undefined &&
          outdatedDbVersion === undefined &&
          isFirefox()
        ) {
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
      return needsWallet().preparePayForUri(detail.talerPayUri);
    case "set-extended-permissions": {
      const newVal = detail.value;
      console.log("new extended permissions value", newVal);
      if (newVal) {
        setupHeaderListener();
        return { newValue: true };
      } else {
        await new Promise((resolve, reject) => {
          getPermissionsApi().remove(extendedPermissions, (rem) => {
            console.log("permissions removed:", rem);
            resolve();
          });
        });
        return { newVal: false };
      }
    }
    case "get-extended-permissions": {
      const res = await new Promise((resolve, reject) => {
        getPermissionsApi().contains(extendedPermissions, (result: boolean) => {
          resolve(result);
        });
      });
      return { newValue: res };
    }
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

function getTab(tabId: number): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab: chrome.tabs.Tab) => resolve(tab));
  });
}

function setBadgeText(options: chrome.browserAction.BadgeTextDetails): void {
  // not supported by all browsers ...
  if (chrome && chrome.browserAction && chrome.browserAction.setBadgeText) {
    chrome.browserAction.setBadgeText(options);
  } else {
    console.warn("can't set badge text, not supported", options);
  }
}

function waitMs(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const bgPage = chrome.extension.getBackgroundPage();
    if (!bgPage) {
      reject("fatal: no background page");
      return;
    }
    bgPage.setTimeout(() => resolve(), timeoutMs);
  });
}

function makeSyncWalletRedirect(
  url: string,
  tabId: number,
  oldUrl: string,
  params?: { [name: string]: string | undefined },
): object {
  const innerUrl = new URL(chrome.extension.getURL("/" + url));
  if (params) {
    for (const key in params) {
      const p = params[key];
      if (p) {
        innerUrl.searchParams.set(key, p);
      }
    }
  }
  if (isFirefox()) {
    // Some platforms don't support the sync redirect (yet), so fall back to
    // async redirect after a timeout.
    const doit = async (): Promise<void> => {
      await waitMs(150);
      const tab = await getTab(tabId);
      if (tab.url === oldUrl) {
        chrome.tabs.update(tabId, { url: innerUrl.href });
      }
    };
    doit();
  }
  console.log("redirecting to", innerUrl.href);
  chrome.tabs.update(tabId, { url: innerUrl.href });
  return { redirectUrl: innerUrl.href };
}

async function reinitWallet(): Promise<void> {
  if (currentWallet) {
    currentWallet.stop();
    currentWallet = undefined;
  }
  currentDatabase = undefined;
  setBadgeText({ text: "" });
  try {
    currentDatabase = await openTalerDatabase(indexedDB, reinitWallet);
  } catch (e) {
    console.error("could not open database", e);
    walletInit.reject(e);
    return;
  }
  const http = new BrowserHttpLib();
  console.log("setting wallet");
  const wallet = new Wallet(
    new Database(currentDatabase),
    http,
    new BrowserCryptoWorkerFactory(),
  );
  wallet.addNotificationListener((x) => {
    for (const x of notificationPorts) {
      try {
        x.postMessage({ type: "notification" });
      } catch (e) {
        console.error(e);
      }
    }
  });
  wallet.runRetryLoop().catch((e) => {
    console.log("error during wallet retry loop", e);
  });
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

try {
  // This needs to be outside of main, as Firefox won't fire the event if
  // the listener isn't created synchronously on loading the backend.
  chrome.runtime.onInstalled.addListener((details) => {
    console.log("onInstalled with reason", details.reason);
    if (details.reason === "install") {
      const url = chrome.extension.getURL("/welcome.html");
      chrome.tabs.create({ active: true, url: url });
    }
  });
} catch (e) {
  console.error(e);
}

function headerListener(
  details: chrome.webRequest.WebResponseHeadersDetails,
): chrome.webRequest.BlockingResponse | undefined {
  console.log("header listener");
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
    return;
  }
  const wallet = currentWallet;
  if (!wallet) {
    console.warn("wallet not available while handling header");
    return;
  }
  console.log("in header listener");
  if (details.statusCode === 402 || details.statusCode === 202) {
    console.log(`got 402/202 from ${details.url}`);
    for (const header of details.responseHeaders || []) {
      if (header.name.toLowerCase() === "taler") {
        const talerUri = header.value || "";
        const uriType = classifyTalerUri(talerUri);
        switch (uriType) {
          case TalerUriType.TalerWithdraw:
            return makeSyncWalletRedirect(
              "withdraw.html",
              details.tabId,
              details.url,
              {
                talerWithdrawUri: talerUri,
              },
            );
          case TalerUriType.TalerPay:
            return makeSyncWalletRedirect(
              "pay.html",
              details.tabId,
              details.url,
              {
                talerPayUri: talerUri,
              },
            );
          case TalerUriType.TalerTip:
            return makeSyncWalletRedirect(
              "tip.html",
              details.tabId,
              details.url,
              {
                talerTipUri: talerUri,
              },
            );
          case TalerUriType.TalerRefund:
            return makeSyncWalletRedirect(
              "refund.html",
              details.tabId,
              details.url,
              {
                talerRefundUri: talerUri,
              },
            );
          case TalerUriType.TalerNotifyReserve:
            Promise.resolve().then(() => {
              const w = currentWallet;
              if (!w) {
                return;
              }
              w.handleNotifyReserve();
            });
            break;
          default:
            console.warn(
              "Response with HTTP 402 has Taler header, but header value is not a taler:// URI.",
            );
            break;
        }
      }
    }
  }
  return;
}

function setupHeaderListener(): void {
  console.log("setting up header listener");
  // Handlers for catching HTTP requests
  getPermissionsApi().contains(extendedPermissions, (result: boolean) => {
    if (
      chrome.webRequest.onHeadersReceived &&
      chrome.webRequest.onHeadersReceived.hasListener(headerListener)
    ) {
      chrome.webRequest.onHeadersReceived.removeListener(headerListener);
    }
    if (result) {
      console.log("actually adding listener");
      chrome.webRequest.onHeadersReceived.addListener(
        headerListener,
        { urls: ["<all_urls>"] },
        ["responseHeaders", "blocking"],
      );
    }
    chrome.webRequest.handlerBehaviorChanged(() => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      }
    });
  });
}

/**
 * Main function to run for the WebExtension backend.
 *
 * Sets up all event handlers and other machinery.
 */
export async function wxMain(): Promise<void> {
  // Explicitly unload the extension page as soon as an update is available,
  // so the update gets installed as soon as possible.
  chrome.runtime.onUpdateAvailable.addListener((details) => {
    console.log("update available:", details);
    chrome.runtime.reload();
  });
  reinitWallet();

  // Handlers for messages coming directly from the content
  // script on the page
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    dispatch(req, sender, sendResponse);
    return true;
  });

  chrome.runtime.onConnect.addListener((port) => {
    notificationPorts.push(port);
    port.onDisconnect.addListener((discoPort) => {
      const idx = notificationPorts.indexOf(discoPort);
      if (idx >= 0) {
        notificationPorts.splice(idx, 1);
      }
    });
  });

  try {
    setupHeaderListener();
  } catch (e) {
    console.log(e);
  }

  // On platforms that support it, also listen to external
  // modification of permissions.
  getPermissionsApi().addPermissionsListener((perm) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    setupHeaderListener();
  });
}
