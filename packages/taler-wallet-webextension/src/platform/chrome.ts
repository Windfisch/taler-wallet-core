/*
 This file is part of TALER
 (C) 2017 INRIA

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { classifyTalerUri, CoreApiResponse, TalerUriType } from "@gnu-taler/taler-util";
import { getReadRequestPermissions } from "../permissions.js";
import { CrossBrowserPermissionsApi, MessageFromBackend, Permissions, PlatformAPI } from "./api.js";

const api: PlatformAPI = {
  isFirefox,
  findTalerUriInActiveTab,
  getPermissionsApi,
  getWalletVersion,
  listenToWalletBackground,
  notifyWhenAppIsReady,
  openWalletPage,
  openWalletPageFromPopup,
  openWalletURIFromPopup,
  redirectTabToWalletPage,
  registerAllIncomingConnections,
  registerOnInstalled,
  listenToAllChannels,
  registerReloadOnNewVersion,
  registerTalerHeaderListener,
  sendMessageToAllChannels,
  sendMessageToWalletBackground,
  useServiceWorkerAsBackgroundProcess
}

export default api;

function isFirefox(): boolean {
  return false;
}

export function contains(p: Permissions): Promise<boolean> {
  return new Promise((res, rej) => {
    chrome.permissions.contains(p, (resp) => {
      const le = chrome.runtime.lastError?.message
      if (le) {
        rej(le)
      }
      res(resp)
    })
  })
}

export async function request(p: Permissions): Promise<boolean> {
  return new Promise((res, rej) => {
    chrome.permissions.request(p, (resp) => {
      const le = chrome.runtime.lastError?.message
      if (le) {
        rej(le)
      }
      res(resp)
    })
  })
}

export async function remove(p: Permissions): Promise<boolean> {
  return new Promise((res, rej) => {
    chrome.permissions.remove(p, (resp) => {
      const le = chrome.runtime.lastError?.message
      if (le) {
        rej(le)
      }
      res(resp)
    })
  })
}

function addPermissionsListener(callback: (p: Permissions, lastError?: string) => void): void {
  console.log("addPermissionListener is not supported for Firefox");
  chrome.permissions.onAdded.addListener((perm: Permissions) => {
    const lastError = chrome.runtime.lastError?.message;
    callback(perm, lastError)
  })
}

function getPermissionsApi(): CrossBrowserPermissionsApi {
  return {
    addPermissionsListener, contains, request, remove
  }
}

/**
 * 
 * @param callback function to be called
 */
function notifyWhenAppIsReady(callback: () => void) {
  if (chrome.runtime && chrome.runtime.getManifest().manifest_version === 3) {
    callback()
  } else {
    window.addEventListener("load", callback);
  }
}


function openWalletURIFromPopup(talerUri: string) {
  const uriType = classifyTalerUri(talerUri);

  let url: string | undefined = undefined;
  switch (uriType) {
    case TalerUriType.TalerWithdraw:
      url = chrome.runtime.getURL(`static/wallet.html#/cta/withdraw?talerWithdrawUri=${talerUri}`);
      break;
    case TalerUriType.TalerPay:
      url = chrome.runtime.getURL(`static/wallet.html#/cta/pay?talerPayUri=${talerUri}`);
      break;
    case TalerUriType.TalerTip:
      url = chrome.runtime.getURL(`static/wallet.html#/cta/tip?talerTipUri=${talerUri}`);
      break;
    case TalerUriType.TalerRefund:
      url = chrome.runtime.getURL(`static/wallet.html#/cta/refund?talerRefundUri=${talerUri}`);
      break;
    default:
      console.warn(
        "Response with HTTP 402 has Taler header, but header value is not a taler:// URI.",
      );
      return;
  }

  chrome.tabs.create(
    { active: true, url, },
    () => { window.close(); },
  );
}

function openWalletPage(page: string) {
  const url = chrome.runtime.getURL(`/static/wallet.html#${page}`)
  chrome.tabs.create(
    { active: true, url, },
  );
}

function openWalletPageFromPopup(page: string) {
  const url = chrome.runtime.getURL(`/static/wallet.html#${page}`)
  chrome.tabs.create(
    { active: true, url, },
    () => { window.close(); },
  );
}

async function sendMessageToWalletBackground(operation: string, payload: any): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    chrome.runtime.sendMessage({ operation, payload, id: "(none)" }, (resp) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message)
      }
      resolve(resp)
      // return true to keep the channel open
      return true;
    })
  })
}

let notificationPort: chrome.runtime.Port | undefined;
function listenToWalletBackground(listener: (m: any) => void) {
  if (notificationPort === undefined) {
    notificationPort = chrome.runtime.connect({ name: "notifications" })
  }
  notificationPort.onMessage.addListener(listener)
  function removeListener() {
    if (notificationPort !== undefined) {
      notificationPort.onMessage.removeListener(listener)
    }
  }
  return removeListener
}


const allPorts: chrome.runtime.Port[] = [];

function sendMessageToAllChannels(message: MessageFromBackend) {
  for (const notif of allPorts) {
    // const message: MessageFromBackend = { type: msg.type };
    try {
      notif.postMessage(message);
    } catch (e) {
      console.error(e);
    }
  }
}

function registerAllIncomingConnections() {
  chrome.runtime.onConnect.addListener((port) => {
    allPorts.push(port);
    port.onDisconnect.addListener((discoPort) => {
      const idx = allPorts.indexOf(discoPort);
      if (idx >= 0) {
        allPorts.splice(idx, 1);
      }
    });
  });
}

function listenToAllChannels(cb: (message: any, sender: any, callback: (r: CoreApiResponse) => void) => void) {
  chrome.runtime.onMessage.addListener((m, s, c) => {
    cb(m, s, c)

    // keep the connection open
    return true;
  });
}

function registerReloadOnNewVersion() {
  // Explicitly unload the extension page as soon as an update is available,
  // so the update gets installed as soon as possible.
  chrome.runtime.onUpdateAvailable.addListener((details) => {
    console.log("update available:", details);
    chrome.runtime.reload();
  });

}

function redirectTabToWalletPage(
  tabId: number,
  page: string,
) {
  const url = chrome.runtime.getURL(`/static/wallet.html#${page}`);
  console.log("redirecting tabId: ", tabId, " to: ", url);
  chrome.tabs.update(tabId, { url });
}

interface WalletVersion {
  version_name?: string | undefined;
  version: string;
}

function getWalletVersion(): WalletVersion {
  const manifestData = chrome.runtime.getManifest();
  return manifestData;
}


function registerTalerHeaderListener(callback: (tabId: number, url: string) => void): void {
  console.log("setting up header listener");

  function headerListener(
    details: chrome.webRequest.WebResponseHeadersDetails,
  ) {
    if (chrome.runtime.lastError) {
      console.error(JSON.stringify(chrome.runtime.lastError));
      return;
    }
    if (
      details.statusCode === 402 ||
      details.statusCode === 202 ||
      details.statusCode === 200
    ) {
      const values = (details.responseHeaders || [])
        .filter(h => h.name.toLowerCase() === 'taler')
        .map(h => h.value)
        .filter((value): value is string => !!value)
      if (values.length > 0) {
        callback(details.tabId, values[0])
      }
    }
    return;
  }

  getPermissionsApi().contains(getReadRequestPermissions()).then(result => {
    //if there is a handler already, remove it
    if (
      "webRequest" in chrome &&
      "onHeadersReceived" in chrome.webRequest &&
      chrome.webRequest.onHeadersReceived.hasListener(headerListener)
    ) {
      chrome.webRequest.onHeadersReceived.removeListener(headerListener);
    }
    //if the result was positive, add the headerListener
    if (result) {
      chrome.webRequest.onHeadersReceived.addListener(
        headerListener,
        { urls: ["<all_urls>"] },
        ["responseHeaders"],
      );
    }
    //notify the browser about this change, this operation is expensive
    if ("webRequest" in chrome) {
      chrome.webRequest.handlerBehaviorChanged(() => {
        if (chrome.runtime.lastError) {
          console.error(JSON.stringify(chrome.runtime.lastError));
        }
      });
    }
  });
}

function registerOnInstalled(callback: () => void) {
  // This needs to be outside of main, as Firefox won't fire the event if
  // the listener isn't created synchronously on loading the backend.
  chrome.runtime.onInstalled.addListener((details) => {
    console.log("onInstalled with reason", details.reason);
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
      callback()
    }
  });
}

function useServiceWorkerAsBackgroundProcess() {
  return chrome.runtime.getManifest().manifest_version === 3
}

function searchForTalerLinks(): string | undefined {
  let found;
  found = document.querySelector("a[href^='taler://'")
  if (found) return found.toString()
  found = document.querySelector("a[href^='taler+http://'")
  if (found) return found.toString()
  return undefined
}

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}


async function findTalerUriInActiveTab(): Promise<string | undefined> {
  if (chrome.runtime.getManifest().manifest_version === 3) {
    // manifest v3
    const tab = await getCurrentTab();
    const res = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id!,
        allFrames: true,
      } as any,
      func: searchForTalerLinks,
      args: []
    })
    return res[0].result
  }
  return new Promise((resolve, reject) => {
    //manifest v2
    chrome.tabs.executeScript(
      {
        code: `
        (() => {
          let x = document.querySelector("a[href^='taler://'") || document.querySelector("a[href^='taler+http://'");
          return x ? x.href.toString() : null;
        })();
        `,
        allFrames: false,
      },
      (result) => {
        if (chrome.runtime.lastError) {
          console.error(JSON.stringify(chrome.runtime.lastError));
          resolve(undefined);
          return;
        }
        resolve(result[0]);
      },
    );
  });
}
