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

import { CoreApiResponse, NotificationType } from "@gnu-taler/taler-util";

export interface Permissions {
  /**
   * List of named permissions.
   */
  permissions?: string[] | undefined;
  /**
   * List of origin permissions. Anything listed here must be a subset of a
   * host that appears in the optional_permissions list in the manifest.
   *
   */
  origins?: string[] | undefined;
}

/**
 * Compatibility API that works on multiple browsers.
 */
export interface CrossBrowserPermissionsApi {
  containsHostPermissions(): Promise<boolean>;
  requestHostPermissions(): Promise<boolean>;
  removeHostPermissions(): Promise<boolean>;

  addPermissionsListener(
    callback: (p: Permissions, lastError?: string) => void,
  ): void;
}

export type MessageFromBackend = {
  type: NotificationType;
};

export interface WalletVersion {
  version_name?: string | undefined;
  version: string;
}

/**
 * Compatibility helpers needed for browsers that don't implement
 * WebExtension APIs consistently.
 */
export interface PlatformAPI {
  /**
   * Guarantee that the service workers don't die
   */
  keepAlive(cb: VoidFunction): void;
  /**
   * FIXME: should not be needed
   *
   * check if the platform is firefox
   */
  isFirefox(): boolean;

  /**
   * Permission API for checking and add a listener
   */
  getPermissionsApi(): CrossBrowserPermissionsApi;

  /**
   * Backend API
   *
   * Register a callback to be called when the wallet is ready to start
   * @param callback
   */
  notifyWhenAppIsReady(callback: () => void): void;

  /**
   * Popup API
   *
   * Used when an TalerURI is found and open up from the popup UI.
   * Closes the popup and open the URI into the wallet UI.
   *
   * @param talerUri
   */
  openWalletURIFromPopup(talerUri: string): void;

  /**
   * Backend API
   *
   * Open a page into the wallet UI
   * @param page
   */
  openWalletPage(page: string): void;

  /**
   * Popup API
   *
   * Open a page into the wallet UI and closed the popup
   * @param page
   */
  openWalletPageFromPopup(page: string): void;

  /**
   * Backend API
   *
   * When a tab has been detected to have a Taler action the background process
   * can use this function to redirect the tab to the wallet UI
   *
   * @param tabId
   * @param page
   */
  redirectTabToWalletPage(tabId: number, page: string): void;

  /**
   * Get the wallet version from manifest
   */
  getWalletVersion(): WalletVersion;

  /**
   * Backend API
   */
  registerAllIncomingConnections(): void;
  /**
   * Backend API
   */
  registerReloadOnNewVersion(): void;
  /**
   * Backend API
   */
  registerTalerHeaderListener(
    onHeader: (tabId: number, url: string) => void,
  ): void;
  /**
   * Frontend API
   */
  containsTalerHeaderListener(): boolean;
  /**
   * Backend API
   */
  registerOnInstalled(callback: () => void): void;

  /**
   * Backend API
   *
   * Check if background process run as service worker. This is used from the
   * wallet use different http api and crypto worker.
   */
  useServiceWorkerAsBackgroundProcess(): boolean;

  /**
   * Popup API
   *
   * Read the current tab html and try to find any Taler URI or QR code present.
   *
   * @return Taler URI if found
   */
  findTalerUriInActiveTab(): Promise<string | undefined>;

  /**
   * Used from the frontend to send commands to the wallet
   *
   * @param operation
   * @param payload
   *
   * @return response from the backend
   */
  sendMessageToWalletBackground(
    operation: string,
    payload: any,
  ): Promise<CoreApiResponse>;

  /**
   * Used from the frontend to receive notifications about new information
   * @param listener
   * @return function to unsubscribe the listener
   */
  listenToWalletBackground(
    listener: (message: MessageFromBackend) => void,
  ): () => void;

  /**
   * Use by the wallet backend to receive operations from frontend (popup & wallet)
   * and send a response back.
   *
   * @param onNewMessage
   */
  listenToAllChannels(
    onNewMessage: (
      message: any,
      sender: any,
      sendResponse: (r: CoreApiResponse) => void,
    ) => void,
  ): void;

  /**
   * Used by the wallet backend to send notification about new information
   * @param message
   */
  sendMessageToAllChannels(message: MessageFromBackend): void;
}

export let platform: PlatformAPI = undefined as any;
export function setupPlatform(impl: PlatformAPI): void {
  platform = impl;
}
