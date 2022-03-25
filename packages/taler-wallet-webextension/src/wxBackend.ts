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
import {
  classifyTalerUri,
  CoreApiResponse,
  CoreApiResponseSuccess, TalerErrorCode,
  TalerUriType,
  WalletDiagnostics
} from "@gnu-taler/taler-util";
import {
  DbAccess,
  deleteTalerDatabase,
  makeErrorDetail,
  OpenedPromise,
  openPromise,
  openTalerDatabase,
  Wallet,
  WalletStoresV1
} from "@gnu-taler/taler-wallet-core";
import { BrowserCryptoWorkerFactory } from "./browserCryptoWorkerFactory";
import { BrowserHttpLib } from "./browserHttpLib";
import { getReadRequestPermissions } from "./permissions";
import { MessageFromBackend, platform } from "./platform/api";
import { SynchronousCryptoWorkerFactory } from "./serviceWorkerCryptoWorkerFactory";
import { ServiceWorkerHttpLib } from "./serviceWorkerHttpLib";

/**
 * Currently active wallet instance.  Might be unloaded and
 * re-instantiated when the database is reset.
 *
 * FIXME:  Maybe move the wallet resetting into the Wallet class?
 */
let currentWallet: Wallet | undefined;

let currentDatabase: DbAccess<typeof WalletStoresV1> | undefined;

/**
 * Last version of an outdated DB, if applicable.
 */
let outdatedDbVersion: number | undefined;

const walletInit: OpenedPromise<void> = openPromise<void>();

async function getDiagnostics(): Promise<WalletDiagnostics> {
  const manifestData = platform.getWalletVersion();
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
      platform.isFirefox()
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
    walletManifestDisplayVersion: manifestData.version_name || "(undefined)",
    walletManifestVersion: manifestData.version,
    errors,
    firefoxIdbProblem,
    dbOutdated,
  };
  return diagnostics;
}

async function dispatch(
  req: any,
  sender: any,
  sendResponse: any,
): Promise<void> {
  let r: CoreApiResponse;

  const wrapResponse = (result: unknown): CoreApiResponseSuccess => {
    return {
      type: "response",
      id: req.id,
      operation: req.operation,
      result,
    };
  };

  switch (req.operation) {
    case "wxGetDiagnostics": {
      r = wrapResponse(await getDiagnostics());
      break;
    }
    case "reset-db": {
      await deleteTalerDatabase(indexedDB as any);
      r = wrapResponse(await reinitWallet());
      break;
    }
    case "wxGetExtendedPermissions": {
      const res = await platform.getPermissionsApi().contains(getReadRequestPermissions());
      r = wrapResponse({ newValue: res });
      break;
    }
    case "wxSetExtendedPermissions": {
      const newVal = req.payload.value;
      console.log("new extended permissions value", newVal);
      if (newVal) {
        platform.registerTalerHeaderListener(parseTalerUriAndRedirect);
        r = wrapResponse({ newValue: true });
      } else {
        const rem = await platform.getPermissionsApi().remove(getReadRequestPermissions());
        console.log("permissions removed:", rem);
        r = wrapResponse({ newVal: false });
      }
      break;
    }
    default: {
      const w = currentWallet;
      if (!w) {
        r = {
          type: "error",
          id: req.id,
          operation: req.operation,
          error: makeErrorDetail(
            TalerErrorCode.WALLET_CORE_NOT_AVAILABLE,
            {},
            "wallet core not available",
          ),
        };
        break;
      }
      r = await w.handleCoreApiRequest(req.operation, req.id, req.payload);
      break;
    }
  }

  try {
    sendResponse(r);
  } catch (e) {
    // might fail if tab disconnected
  }
}

async function reinitWallet(): Promise<void> {
  if (currentWallet) {
    currentWallet.stop();
    currentWallet = undefined;
  }
  currentDatabase = undefined;
  // setBadgeText({ text: "" });
  try {
    currentDatabase = await openTalerDatabase(indexedDB as any, reinitWallet);
  } catch (e) {
    console.error("could not open database", e);
    walletInit.reject(e);
    return;
  }
  let httpLib;
  let cryptoWorker;

  if (platform.useServiceWorkerAsBackgroundProcess()) {
    httpLib = new ServiceWorkerHttpLib();
    cryptoWorker = new SynchronousCryptoWorkerFactory();
  } else {
    httpLib = new BrowserHttpLib();
    cryptoWorker = new BrowserCryptoWorkerFactory();
  }

  console.log("setting wallet");
  const wallet = await Wallet.create(currentDatabase, httpLib, cryptoWorker);
  try {
    await wallet.handleCoreApiRequest("initWallet", "native-init", {});
  } catch (e) {
    console.error("could not initialize wallet", e);
    walletInit.reject(e);
    return;
  }
  wallet.addNotificationListener((x) => {
    const message: MessageFromBackend = { type: x.type };
    platform.sendMessageToAllChannels(message)
  });
  wallet.runTaskLoop().catch((e) => {
    console.log("error during wallet task loop", e);
  });
  // Useful for debugging in the background page.
  if (typeof window !== "undefined") {
    (window as any).talerWallet = wallet;
  }
  currentWallet = wallet;
  walletInit.resolve();
}

function parseTalerUriAndRedirect(tabId: number, talerUri: string) {
  const uriType = classifyTalerUri(talerUri);
  switch (uriType) {
    case TalerUriType.TalerWithdraw:
      return platform.redirectTabToWalletPage(
        tabId,
        `/cta/withdraw?talerWithdrawUri=${talerUri}`,
      );
    case TalerUriType.TalerPay:
      return platform.redirectTabToWalletPage(
        tabId,
        `/cta/pay?talerPayUri=${talerUri}`,
      );
    case TalerUriType.TalerTip:
      return platform.redirectTabToWalletPage(
        tabId,
        `/cta/tip?talerTipUri=${talerUri}`,
      );
    case TalerUriType.TalerRefund:
      return platform.redirectTabToWalletPage(
        tabId,
        `/cta/refund?talerRefundUri=${talerUri}`,
      );
    case TalerUriType.TalerNotifyReserve:
      // FIXME:  Is this still useful?
      // handleNotifyReserve(w);
      break;
    default:
      console.warn(
        "Response with HTTP 402 has Taler header, but header value is not a taler:// URI.",
      );
      break;
  }
}


/**
 * Main function to run for the WebExtension backend.
 *
 * Sets up all event handlers and other machinery.
 */
export async function wxMain(): Promise<void> {
  const afterWalletIsInitialized = reinitWallet();

  platform.registerReloadOnNewVersion();

  // Handlers for messages coming directly from the content
  // script on the page
  platform.listenToAllChannels((message, sender, callback) => {
    afterWalletIsInitialized.then(() => {
      dispatch(message, sender, callback);
    });
  })

  platform.registerAllIncomingConnections()

  try {
    platform.registerTalerHeaderListener(parseTalerUriAndRedirect);
  } catch (e) {
    console.log(e);
  }

  // On platforms that support it, also listen to external
  // modification of permissions.
  platform.getPermissionsApi().addPermissionsListener((perm, lastError) => {
    if (lastError) {
      console.error(lastError);
      return;
    }
    platform.registerTalerHeaderListener(parseTalerUriAndRedirect);
  });
}
