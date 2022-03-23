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

import { CoreApiResponse, NotificationType, TalerUriType } from "@gnu-taler/taler-util";

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
  contains(p: Permissions): Promise<boolean>;
  request(p: Permissions): Promise<boolean>;
  remove(p: Permissions): Promise<boolean>;

  addPermissionsListener(callback: (p: Permissions) => void): void;

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
   * check if the platform is firefox
   */
  isFirefox(): boolean;
  /**
   * 
   */
  getPermissionsApi(): CrossBrowserPermissionsApi;
  notifyWhenAppIsReady(callback: () => void): void;
  openWalletURIFromPopup(uriType: TalerUriType, talerUri: string): void;
  openWalletPage(page: string): void;
  openWalletPageFromPopup(page: string): void;
  setMessageToWalletBackground(operation: string, payload: any): Promise<CoreApiResponse>;
  listenToWalletNotifications(listener: (m: any) => void): () => void;
  sendMessageToAllChannels(message: MessageFromBackend): void;
  registerAllIncomingConnections(): void;
  registerOnNewMessage(onNewMessage: (message: any, sender: any, callback: any) => void): void;
  registerReloadOnNewVersion(): void;
  redirectTabToWalletPage(tabId: number, page: string): void;
  getWalletVersion(): WalletVersion;
  registerTalerHeaderListener(onHeader: (tabId: number, url: string) => void): void;
  registerOnInstalled(callback: () => void): void;
  useServiceWorkerAsBackgroundProcess(): boolean;
  getLastError(): string | undefined;
  searchForTalerLinks(): string | undefined;
  findTalerUriInActiveTab(): Promise<string | undefined>;
}

export let platform: PlatformAPI = undefined as any;
export function setupPlatform(impl: PlatformAPI) {
  platform = impl;
}
