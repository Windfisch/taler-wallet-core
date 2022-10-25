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

/**
 * Interface to the wallet through WebExtension messaging.
 */

/**
 * Imports.
 */
import {
  CoreApiResponse, Logger, NotificationType, WalletDiagnostics
} from "@gnu-taler/taler-util";
import {
  TalerError, WalletCoreApiClient,
  WalletCoreOpKeys,
  WalletCoreRequestType,
  WalletCoreResponseType
} from "@gnu-taler/taler-wallet-core";
import { MessageFromBackend, platform } from "./platform/api.js";
import { nullFunction } from "./test-utils.js";

/**
 *
 * @author Florian Dold
 * @author sebasjm
 */

export interface ExtendedPermissionsResponse {
  newValue: boolean;
}
const logger = new Logger("wxApi");

/**
 * Response with information about available version upgrades.
 */
export interface UpgradeResponse {
  /**
   * Is a reset required because of a new DB version
   * that can't be automatically upgraded?
   */
  dbResetRequired: boolean;

  /**
   * Current database version.
   */
  currentDbVersion: string;

  /**
   * Old db version (if applicable).
   */
  oldDbVersion: string;
}

/**
 * @deprecated Use {@link WxWalletCoreApiClient} instead.
 */
async function callBackend(operation: string, payload: any): Promise<any> {
  let response: CoreApiResponse;
  try {
    response = await platform.sendMessageToWalletBackground(operation, payload);
  } catch (e) {
    console.log("Error calling backend");
    throw new Error(`Error contacting backend: ${e}`);
  }
  logger.info("got response", response);
  if (response.type === "error") {
    throw TalerError.fromUncheckedDetail(response.error);
  }
  return response.result;
}

export class WxWalletCoreApiClient implements WalletCoreApiClient {
  async call<Op extends WalletCoreOpKeys>(
    operation: Op,
    payload: WalletCoreRequestType<Op>,
  ): Promise<WalletCoreResponseType<Op>> {
    let response: CoreApiResponse;
    try {
      response = await platform.sendMessageToWalletBackground(
        operation,
        payload,
      );
    } catch (e) {
      console.log("Error calling backend");
      throw new Error(`Error contacting backend: ${e}`);
    }
    logger.info("got response", response);
    if (response.type === "error") {
      throw TalerError.fromUncheckedDetail(response.error);
    }
    return response.result as any;
  }
}

export class BackgroundApiClient {

  public resetDb(): Promise<void> {
    return callBackend("reset-db", {});
  }

  public containsHeaderListener(): Promise<ExtendedPermissionsResponse> {
    return callBackend("containsHeaderListener", {});
  }

  public getDiagnostics(): Promise<WalletDiagnostics> {
    return callBackend("wxGetDiagnostics", {});
  }

  public toggleHeaderListener(
    value: boolean,
  ): Promise<ExtendedPermissionsResponse> {
    return callBackend("toggleHeaderListener", { value });
  }

  public runGarbageCollector(): Promise<void> {
    return callBackend("run-gc", {});
  }

}
function onUpdateNotification(
  messageTypes: Array<NotificationType>,
  doCallback: undefined | (() => void),
): () => void {
  //if no callback, then ignore
  if (!doCallback) return () => {
    return
  };
  const onNewMessage = (message: MessageFromBackend): void => {
    const shouldNotify = messageTypes.includes(message.type);
    if (shouldNotify) {
      doCallback();
    }
  };
  return platform.listenToWalletBackground(onNewMessage);
}

export const wxApi = {
  wallet: new WxWalletCoreApiClient(),
  background: new BackgroundApiClient(),
  listener: {
    onUpdateNotification
  }
}

