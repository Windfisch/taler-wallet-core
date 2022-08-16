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

import { CrossBrowserPermissionsApi, Permissions, PlatformAPI } from "./api.js";
import chromePlatform, {
  containsHostPermissions as chromeContains,
  removeHostPermissions as chromeRemove,
  requestHostPermissions as chromeRequest,
} from "./chrome.js";

const api: PlatformAPI = {
  ...chromePlatform,
  isFirefox,
  getPermissionsApi,
  notifyWhenAppIsReady,
  redirectTabToWalletPage,
  useServiceWorkerAsBackgroundProcess,
};

export default api;

function isFirefox(): boolean {
  return true;
}

function addPermissionsListener(callback: (p: Permissions) => void): void {
  console.log("addPermissionListener is not supported for Firefox");
}

function getPermissionsApi(): CrossBrowserPermissionsApi {
  return {
    addPermissionsListener,
    containsHostPermissions: chromeContains,
    requestHostPermissions: chromeRequest,
    removeHostPermissions: chromeRemove,
  };
}

/**
 *
 * @param callback function to be called
 */
function notifyWhenAppIsReady(callback: () => void): void {
  if (chrome.runtime && chrome.runtime.getManifest().manifest_version === 3) {
    callback();
  } else {
    window.addEventListener("load", callback);
  }
}

function redirectTabToWalletPage(tabId: number, page: string): void {
  const url = chrome.runtime.getURL(`/static/wallet.html#${page}`);
  chrome.tabs.update(tabId, { url, loadReplace: true } as any);
}

function useServiceWorkerAsBackgroundProcess(): false {
  return false;
}
