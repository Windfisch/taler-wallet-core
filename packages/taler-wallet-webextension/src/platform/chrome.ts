/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import {
  classifyTalerUri,
  CoreApiResponse,
  Logger,
  TalerUriType,
} from "@gnu-taler/taler-util";
import {
  CrossBrowserPermissionsApi,
  MessageFromBackend,
  Permissions,
  PlatformAPI,
} from "./api.js";

const api: PlatformAPI = {
  isFirefox,
  findTalerUriInActiveTab,
  findTalerUriInClipboard,
  getPermissionsApi,
  getWalletWebExVersion,
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
  useServiceWorkerAsBackgroundProcess,
  containsTalerHeaderListener,
  keepAlive,
};

export default api;

const logger = new Logger("chrome.ts");

function keepAlive(callback: any): void {
  if (extensionIsManifestV3()) {
    chrome.alarms.create("wallet-worker", { periodInMinutes: 1 });

    chrome.alarms.onAlarm.addListener((a) => {
      logger.trace(`kee p alive alarm: ${a.name}`);
      // callback()
    });
    // } else {
  }
  callback();
}

function isFirefox(): boolean {
  return false;
}

const hostPermissions = {
  permissions: ["webRequest"],
  origins: ["http://*/*", "https://*/*"],
};

export function containsClipboardPermissions(): Promise<boolean> {
  return new Promise((res, rej) => {
    chrome.permissions.contains({ permissions: ["clipboardRead"] }, (resp) => {
      const le = chrome.runtime.lastError?.message;
      if (le) {
        rej(le);
      }
      res(resp);
    });
  });
}

export function containsHostPermissions(): Promise<boolean> {
  return new Promise((res, rej) => {
    chrome.permissions.contains(hostPermissions, (resp) => {
      const le = chrome.runtime.lastError?.message;
      if (le) {
        rej(le);
      }
      res(resp);
    });
  });
}

export async function requestClipboardPermissions(): Promise<boolean> {
  return new Promise((res, rej) => {
    chrome.permissions.request({ permissions: ["clipboardRead"] }, (resp) => {
      const le = chrome.runtime.lastError?.message;
      if (le) {
        rej(le);
      }
      res(resp);
    });
  });
}

export async function requestHostPermissions(): Promise<boolean> {
  return new Promise((res, rej) => {
    chrome.permissions.request(hostPermissions, (resp) => {
      const le = chrome.runtime.lastError?.message;
      if (le) {
        rej(le);
      }
      res(resp);
    });
  });
}

type HeaderListenerFunc = (
  details: chrome.webRequest.WebResponseHeadersDetails,
) => void;
let currentHeaderListener: HeaderListenerFunc | undefined = undefined;

type TabListenerFunc = (tabId: number, info: chrome.tabs.TabChangeInfo) => void;
let currentTabListener: TabListenerFunc | undefined = undefined;

export function containsTalerHeaderListener(): boolean {
  return (
    currentHeaderListener !== undefined || currentTabListener !== undefined
  );
}

export async function removeHostPermissions(): Promise<boolean> {
  //if there is a handler already, remove it
  if (
    currentHeaderListener &&
    chrome?.webRequest?.onHeadersReceived?.hasListener(currentHeaderListener)
  ) {
    chrome.webRequest.onHeadersReceived.removeListener(currentHeaderListener);
  }
  if (
    currentTabListener &&
    chrome?.tabs?.onUpdated?.hasListener(currentTabListener)
  ) {
    chrome.tabs.onUpdated.removeListener(currentTabListener);
  }

  currentHeaderListener = undefined;
  currentTabListener = undefined;

  //notify the browser about this change, this operation is expensive
  if ("webRequest" in chrome) {
    chrome.webRequest.handlerBehaviorChanged(() => {
      if (chrome.runtime.lastError) {
        logger.error(JSON.stringify(chrome.runtime.lastError));
      }
    });
  }

  if (extensionIsManifestV3()) {
    // Trying to remove host permissions with manifest >= v3 throws an error
    return true;
  }
  return new Promise((res, rej) => {
    chrome.permissions.remove(hostPermissions, (resp) => {
      const le = chrome.runtime.lastError?.message;
      if (le) {
        rej(le);
      }
      res(resp);
    });
  });
}

export function removeClipboardPermissions(): Promise<boolean> {
  return new Promise((res, rej) => {
    chrome.permissions.remove({ permissions: ["clipboardRead"] }, (resp) => {
      const le = chrome.runtime.lastError?.message;
      if (le) {
        rej(le);
      }
      res(resp);
    });
  });
}

function addPermissionsListener(
  callback: (p: Permissions, lastError?: string) => void,
): void {
  chrome.permissions.onAdded.addListener((perm: Permissions) => {
    const lastError = chrome.runtime.lastError?.message;
    callback(perm, lastError);
  });
}

function getPermissionsApi(): CrossBrowserPermissionsApi {
  return {
    addPermissionsListener,
    containsHostPermissions,
    requestHostPermissions,
    removeHostPermissions,
    requestClipboardPermissions,
    removeClipboardPermissions,
    containsClipboardPermissions,
  };
}

/**
 *
 * @param callback function to be called
 */
function notifyWhenAppIsReady(callback: () => void): void {
  if (extensionIsManifestV3()) {
    callback();
  } else {
    window.addEventListener("load", callback);
  }
}

function openWalletURIFromPopup(talerUri: string): void {
  const uriType = classifyTalerUri(talerUri);

  let url: string | undefined = undefined;
  switch (uriType) {
    case TalerUriType.TalerWithdraw:
      url = chrome.runtime.getURL(
        `static/wallet.html#/cta/withdraw?talerWithdrawUri=${talerUri}`,
      );
      break;
    case TalerUriType.TalerRecovery:
      url = chrome.runtime.getURL(
        `static/wallet.html#/cta/recovery?talerRecoveryUri=${talerUri}`,
      );
      break;
    case TalerUriType.TalerPay:
      url = chrome.runtime.getURL(
        `static/wallet.html#/cta/pay?talerPayUri=${talerUri}`,
      );
      break;
    case TalerUriType.TalerTip:
      url = chrome.runtime.getURL(
        `static/wallet.html#/cta/tip?talerTipUri=${talerUri}`,
      );
      break;
    case TalerUriType.TalerRefund:
      url = chrome.runtime.getURL(
        `static/wallet.html#/cta/refund?talerRefundUri=${talerUri}`,
      );
      break;
    case TalerUriType.TalerPayPull:
      url = chrome.runtime.getURL(
        `static/wallet.html#/cta/invoice/pay?talerPayPullUri=${talerUri}`,
      );
      break;
    case TalerUriType.TalerPayPush:
      url = chrome.runtime.getURL(
        `static/wallet.html#/cta/transfer/pickup?talerPayPushUri=${talerUri}`,
      );
      break;
    case TalerUriType.TalerNotifyReserve:
      logger.warn(
        `Response with HTTP 402 the Taler header but it is deprecated ${talerUri}`,
      );
      break;
    case TalerUriType.Unknown:
      logger.warn(
        `Response with HTTP 402 the Taler header but could not classify ${talerUri}`,
      );
      return;
    case TalerUriType.TalerDevExperiment:
      logger.warn(`taler://dev-experiment URIs are not allowed in headers`);
      return;
    default: {
      const error: never = uriType;
      logger.warn(
        `Response with HTTP 402 the Taler header "${error}", but header value is not a taler:// URI.`,
      );
      return;
    }
  }

  chrome.tabs.create({ active: true, url }, () => {
    window.close();
  });
}

function openWalletPage(page: string): void {
  const url = chrome.runtime.getURL(`/static/wallet.html#${page}`);
  chrome.tabs.create({ active: true, url });
}

function openWalletPageFromPopup(page: string): void {
  const url = chrome.runtime.getURL(`/static/wallet.html#${page}`);
  chrome.tabs.create({ active: true, url }, () => {
    window.close();
  });
}

let i = 0;

async function sendMessageToWalletBackground(
  operation: string,
  payload: any,
): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    logger.trace("send operation to the wallet background", operation);
    chrome.runtime.sendMessage(
      { operation, payload, id: `id_${i++ % 1000}` },
      (backgroundResponse) => {
        logger.trace("BUG: got response from background", backgroundResponse);

        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
        }
        // const apiResponse = JSON.parse(resp)
        resolve(backgroundResponse);

        // return true to keep the channel open
        return true;
      },
    );
  });
}

let notificationPort: chrome.runtime.Port | undefined;
function listenToWalletBackground(listener: (m: any) => void): () => void {
  if (notificationPort === undefined) {
    notificationPort = chrome.runtime.connect({ name: "notifications" });
  }
  notificationPort.onMessage.addListener(listener);
  function removeListener(): void {
    if (notificationPort !== undefined) {
      notificationPort.onMessage.removeListener(listener);
    }
  }
  return removeListener;
}

const allPorts: chrome.runtime.Port[] = [];

function sendMessageToAllChannels(message: MessageFromBackend): void {
  for (const notif of allPorts) {
    // const message: MessageFromBackend = { type: msg.type };
    try {
      notif.postMessage(message);
    } catch (e) {
      logger.error("error posting a message", e);
    }
  }
}

function registerAllIncomingConnections(): void {
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

function listenToAllChannels(
  cb: (
    message: any,
    sender: any,
    callback: (r: CoreApiResponse) => void,
  ) => void,
): void {
  chrome.runtime.onMessage.addListener((m, s, c) => {
    cb(m, s, (apiResponse) => {
      logger.trace("BUG: sending response to client", apiResponse);
      c(apiResponse);
    });

    // keep the connection open
    return true;
  });
}

function registerReloadOnNewVersion(): void {
  // Explicitly unload the extension page as soon as an update is available,
  // so the update gets installed as soon as possible.
  chrome.runtime.onUpdateAvailable.addListener((details) => {
    logger.info("update available:", details);
    chrome.runtime.reload();
  });
}

function redirectTabToWalletPage(tabId: number, page: string): void {
  const url = chrome.runtime.getURL(`/static/wallet.html#${page}`);
  logger.trace("redirecting tabId: ", tabId, " to: ", url);
  chrome.tabs.update(tabId, { url });
}

interface WalletVersion {
  version_name?: string | undefined;
  version: string;
}

function getWalletWebExVersion(): WalletVersion {
  const manifestData = chrome.runtime.getManifest();
  return manifestData;
}

function registerTalerHeaderListener(
  callback: (tabId: number, url: string) => void,
): void {
  logger.trace("setting up header listener");

  function headerListener(
    details: chrome.webRequest.WebResponseHeadersDetails,
  ): void {
    if (chrome.runtime.lastError) {
      logger.error(JSON.stringify(chrome.runtime.lastError));
      return;
    }
    if (
      details.statusCode === 402 ||
      details.statusCode === 202 ||
      details.statusCode === 200
    ) {
      const values = (details.responseHeaders || [])
        .filter((h) => h.name.toLowerCase() === "taler")
        .map((h) => h.value)
        .filter((value): value is string => !!value);
      if (values.length > 0) {
        logger.info(
          `Found a Taler URI in a response header for the request ${details.url} from tab ${details.tabId}`,
        );
        callback(details.tabId, values[0]);
      }
    }
    return;
  }

  async function tabListener(
    tabId: number,
    info: chrome.tabs.TabChangeInfo,
  ): Promise<void> {
    if (tabId < 0) return;
    if (info.status !== "complete") return;
    const uri = await findTalerUriInTab(tabId);
    if (!uri) return;
    logger.info(`Found a Taler URI in the tab ${tabId}`);
    callback(tabId, uri);
  }

  const prevHeaderListener = currentHeaderListener;
  const prevTabListener = currentTabListener;

  getPermissionsApi()
    .containsHostPermissions()
    .then((result) => {
      //if there is a handler already, remove it
      if (
        prevHeaderListener &&
        chrome?.webRequest?.onHeadersReceived?.hasListener(prevHeaderListener)
      ) {
        chrome.webRequest.onHeadersReceived.removeListener(prevHeaderListener);
      }
      if (
        prevTabListener &&
        chrome?.tabs?.onUpdated?.hasListener(prevTabListener)
      ) {
        chrome.tabs.onUpdated.removeListener(prevTabListener);
      }

      //if the result was positive, add the headerListener
      if (result) {
        const headersEvent:
          | chrome.webRequest.WebResponseHeadersEvent
          | undefined = chrome?.webRequest?.onHeadersReceived;
        if (headersEvent) {
          headersEvent.addListener(headerListener, { urls: ["<all_urls>"] }, [
            "responseHeaders",
          ]);
          currentHeaderListener = headerListener;
        }

        const tabsEvent: chrome.tabs.TabUpdatedEvent | undefined =
          chrome?.tabs?.onUpdated;
        if (tabsEvent) {
          tabsEvent.addListener(tabListener);
          currentTabListener = tabListener;
        }
      }

      //notify the browser about this change, this operation is expensive
      chrome?.webRequest?.handlerBehaviorChanged(() => {
        if (chrome.runtime.lastError) {
          logger.error(JSON.stringify(chrome.runtime.lastError));
        }
      });
    });
}

const alertIcons = {
  "16": "/static/img/taler-alert-16.png",
  "19": "/static/img/taler-alert-19.png",
  "32": "/static/img/taler-alert-32.png",
  "38": "/static/img/taler-alert-38.png",
  "48": "/static/img/taler-alert-48.png",
  "64": "/static/img/taler-alert-64.png",
  "128": "/static/img/taler-alert-128.png",
  "256": "/static/img/taler-alert-256.png",
  "512": "/static/img/taler-alert-512.png",
};
const normalIcons = {
  "16": "/static/img/taler-logo-16.png",
  "19": "/static/img/taler-logo-19.png",
  "32": "/static/img/taler-logo-32.png",
  "38": "/static/img/taler-logo-38.png",
  "48": "/static/img/taler-logo-48.png",
  "64": "/static/img/taler-logo-64.png",
  "128": "/static/img/taler-logo-128.png",
  "256": "/static/img/taler-logo-256.png",
  "512": "/static/img/taler-logo-512.png",
};
function setNormalIcon(): void {
  if (extensionIsManifestV3()) {
    chrome.action.setIcon({ path: normalIcons });
  } else {
    chrome.browserAction.setIcon({ path: normalIcons });
  }
}

function setAlertedIcon(): void {
  if (extensionIsManifestV3()) {
    chrome.action.setIcon({ path: alertIcons });
  } else {
    chrome.browserAction.setIcon({ path: alertIcons });
  }
}

interface OffscreenCanvasRenderingContext2D
  extends CanvasState,
    CanvasTransform,
    CanvasCompositing,
    CanvasImageSmoothing,
    CanvasFillStrokeStyles,
    CanvasShadowStyles,
    CanvasFilters,
    CanvasRect,
    CanvasDrawPath,
    CanvasUserInterface,
    CanvasText,
    CanvasDrawImage,
    CanvasImageData,
    CanvasPathDrawingStyles,
    CanvasTextDrawingStyles,
    CanvasPath {
  readonly canvas: OffscreenCanvas;
}
declare const OffscreenCanvasRenderingContext2D: {
  prototype: OffscreenCanvasRenderingContext2D;
  new (): OffscreenCanvasRenderingContext2D;
};

interface OffscreenCanvas extends EventTarget {
  width: number;
  height: number;
  getContext(
    contextId: "2d",
    contextAttributes?: CanvasRenderingContext2DSettings,
  ): OffscreenCanvasRenderingContext2D | null;
}
declare const OffscreenCanvas: {
  prototype: OffscreenCanvas;
  new (width: number, height: number): OffscreenCanvas;
};

function createCanvas(size: number): OffscreenCanvas {
  if (extensionIsManifestV3()) {
    return new OffscreenCanvas(size, size);
  } else {
    const c = document.createElement("canvas");
    c.height = size;
    c.width = size;
    return c;
  }
}

async function createImage(size: number, file: string): Promise<ImageData> {
  const r = await fetch(file);
  const b = await r.blob();
  const image = await createImageBitmap(b);
  const canvas = createCanvas(size);
  const canvasContext = canvas.getContext("2d")!;
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  canvasContext.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = canvasContext.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return imageData;
}

async function registerIconChangeOnTalerContent(): Promise<void> {
  const imgs = await Promise.all(
    Object.entries(alertIcons).map(([key, value]) =>
      createImage(parseInt(key, 10), value),
    ),
  );
  const imageData = imgs.reduce(
    (prev, cur) => ({ ...prev, [cur.width]: cur }),
    {} as { [size: string]: ImageData },
  );

  if (chrome.declarativeContent) {
    // using declarative content does not need host permission
    // and is faster
    const secureTalerUrlLookup = {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          css: ["a[href^='taler://'"],
        }),
      ],
      actions: [new chrome.declarativeContent.SetIcon({ imageData })],
    };
    const inSecureTalerUrlLookup = {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          css: ["a[href^='taler+http://'"],
        }),
      ],
      actions: [new chrome.declarativeContent.SetIcon({ imageData })],
    };
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
      chrome.declarativeContent.onPageChanged.addRules([
        secureTalerUrlLookup,
        inSecureTalerUrlLookup,
      ]);
    });
    return;
  }

  //this browser doesn't have declarativeContent
  //we need host_permission and we will check the content for changing the icon
  chrome.tabs.onUpdated.addListener(
    async (tabId, info: chrome.tabs.TabChangeInfo) => {
      if (tabId < 0) return;
      if (info.status !== "complete") return;
      const uri = await findTalerUriInTab(tabId);
      if (uri) {
        setAlertedIcon();
      } else {
        setNormalIcon();
      }
    },
  );
  chrome.tabs.onActivated.addListener(
    async ({ tabId }: chrome.tabs.TabActiveInfo) => {
      if (tabId < 0) return;
      const uri = await findTalerUriInTab(tabId);
      if (uri) {
        setAlertedIcon();
      } else {
        setNormalIcon();
      }
    },
  );
}

function registerOnInstalled(callback: () => void): void {
  // This needs to be outside of main, as Firefox won't fire the event if
  // the listener isn't created synchronously on loading the backend.
  chrome.runtime.onInstalled.addListener(async (details) => {
    logger.info(`onInstalled with reason: "${details.reason}"`);
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
      callback();
    }
    registerIconChangeOnTalerContent();
  });
}

function extensionIsManifestV3(): boolean {
  return chrome.runtime.getManifest().manifest_version === 3;
}

function useServiceWorkerAsBackgroundProcess(): boolean {
  return extensionIsManifestV3();
}

function searchForTalerLinks(): string | undefined {
  let found;
  found = document.querySelector("a[href^='taler://'");
  if (found) return found.toString();
  found = document.querySelector("a[href^='taler+http://'");
  if (found) return found.toString();
  return undefined;
}

async function getCurrentTab(): Promise<chrome.tabs.Tab> {
  const queryOptions = { active: true, currentWindow: true };
  return new Promise<chrome.tabs.Tab>((resolve, reject) => {
    chrome.tabs.query(queryOptions, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(tabs[0]);
    });
  });
}

async function findTalerUriInTab(tabId: number): Promise<string | undefined> {
  if (extensionIsManifestV3()) {
    // manifest v3
    try {
      const res = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: searchForTalerLinks,
        args: [],
      });
      return res[0].result;
    } catch (e) {
      return;
    }
  } else {
    return new Promise((resolve, reject) => {
      //manifest v2
      chrome.tabs.executeScript(
        tabId,
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
            logger.error(JSON.stringify(chrome.runtime.lastError));
            resolve(undefined);
            return;
          }
          resolve(result[0]);
        },
      );
    });
  }
}

async function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function findTalerUriInClipboard(): Promise<string | undefined> {
  try {
    //It looks like clipboard promise does not return, so we need a timeout
    const textInClipboard = await Promise.any([
      timeout(100),
      window.navigator.clipboard.readText(),
    ]);
    if (!textInClipboard) return;
    return textInClipboard.startsWith("taler://") ||
      textInClipboard.startsWith("taler+http://")
      ? textInClipboard
      : undefined;
  } catch (e) {
    logger.error("could not read clipboard", e);
    return undefined;
  }
}

async function findTalerUriInActiveTab(): Promise<string | undefined> {
  const tab = await getCurrentTab();
  if (!tab || tab.id === undefined) return;
  return findTalerUriInTab(tab.id);
}
