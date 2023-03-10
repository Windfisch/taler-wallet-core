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
  CoreApiResponseSuccess,
  Logger,
  TalerErrorCode,
  TalerUriType,
  WalletDiagnostics,
} from "@gnu-taler/taler-util";
import {
  DbAccess,
  deleteTalerDatabase,
  exportDb,
  importDb,
  makeErrorDetail,
  OpenedPromise,
  openPromise,
  openTalerDatabase,
  Wallet,
  WalletStoresV1,
} from "@gnu-taler/taler-wallet-core";
import { SetTimeoutTimerAPI } from "@gnu-taler/taler-wallet-core";
import { BrowserCryptoWorkerFactory } from "./browserCryptoWorkerFactory.js";
import { BrowserHttpLib } from "./browserHttpLib.js";
import { MessageFromBackend, platform } from "./platform/api.js";
import { SynchronousCryptoWorkerFactory } from "./serviceWorkerCryptoWorkerFactory.js";
import { ServiceWorkerHttpLib } from "./serviceWorkerHttpLib.js";

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

const logger = new Logger("wxBackend.ts");

async function getDiagnostics(): Promise<WalletDiagnostics> {
  const manifestData = platform.getWalletWebExVersion();
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

  try {
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
      case "run-gc": {
        logger.info("gc");
        const dump = await exportDb(currentDatabase!.idbHandle());
        await deleteTalerDatabase(indexedDB as any);
        logger.info("cleaned");
        await reinitWallet();
        logger.info("init");
        await importDb(currentDatabase!.idbHandle(), dump);
        logger.info("imported");
        r = wrapResponse({ result: true });
        break;
      }
      case "containsHeaderListener": {
        const res = await platform.containsTalerHeaderListener();
        r = wrapResponse({ newValue: res });
        break;
      }
      //FIXME: implement type checked api like WalletCoreApi
      case "toggleHeaderListener": {
        const newVal = req.payload.value;
        logger.trace("new extended permissions value", newVal);
        if (newVal) {
          platform.registerTalerHeaderListener(parseTalerUriAndRedirect);
          r = wrapResponse({ newValue: true });
        } else {
          const rem = await platform
            .getPermissionsApi()
            .removeHostPermissions();
          logger.trace("permissions removed:", rem);
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
        console.log("response received from wallet", r);
        break;
      }
    }

    sendResponse(r);
  } catch (e) {
    logger.error(`Error sending operation: ${req.operation}`, e);
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
    logger.error("could not open database", e);
    walletInit.reject(e);
    return;
  }
  let httpLib;
  let cryptoWorker;
  let timer;

  if (platform.useServiceWorkerAsBackgroundProcess()) {
    httpLib = new ServiceWorkerHttpLib();
    cryptoWorker = new SynchronousCryptoWorkerFactory();
    timer = new SetTimeoutTimerAPI();
  } else {
    httpLib = new BrowserHttpLib();
    // We could (should?) use the BrowserCryptoWorkerFactory here,
    // but right now we don't, to have less platform differences.
    // cryptoWorker = new BrowserCryptoWorkerFactory();
    cryptoWorker = new SynchronousCryptoWorkerFactory();
    timer = new SetTimeoutTimerAPI();
  }

  logger.info("Setting up wallet");
  const wallet = await Wallet.create(
    currentDatabase,
    httpLib,
    timer,
    cryptoWorker,
  );
  try {
    await wallet.handleCoreApiRequest("initWallet", "native-init", {});
  } catch (e) {
    logger.error("could not initialize wallet", e);
    walletInit.reject(e);
    return;
  }
  wallet.addNotificationListener((x) => {
    const message: MessageFromBackend = { type: x.type };
    platform.sendMessageToAllChannels(message);
  });

  platform.keepAlive(() => {
    return wallet.runTaskLoop().catch((e) => {
      logger.error("error during wallet task loop", e);
    });
  });
  // Useful for debugging in the background page.
  if (typeof window !== "undefined") {
    (window as any).talerWallet = wallet;
  }
  currentWallet = wallet;
  return walletInit.resolve();
}

function parseTalerUriAndRedirect(tabId: number, talerUri: string): void {
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
    case TalerUriType.TalerPayPull:
      return platform.redirectTabToWalletPage(
        tabId,
        `/cta/invoice/pay?talerPayPullUri=${talerUri}`,
      );
    case TalerUriType.TalerPayPush:
      return platform.redirectTabToWalletPage(
        tabId,
        `/cta/transfer/pickup?talerPayPushUri=${talerUri}`,
      );
    case TalerUriType.TalerRecovery:
      return platform.redirectTabToWalletPage(
        tabId,
        `/cta/transfer/recovery?talerBackupUri=${talerUri}`,
      );
    case TalerUriType.Unknown:
      logger.warn(
        `Response with HTTP 402 the Taler header but could not classify ${talerUri}`,
      );
      return;
    case TalerUriType.TalerDevExperiment:
      // FIXME: Implement!
      logger.warn("not implemented");
      return;
    default: {
      const error: never = uriType;
      logger.warn(
        `Response with HTTP 402 the Taler header "${error}", but header value is not a taler:// URI.`,
      );
      return;
    }
  }
}

/**
 * Main function to run for the WebExtension backend.
 *
 * Sets up all event handlers and other machinery.
 */
export async function wxMain(): Promise<void> {
  logger.trace("starting");
  const afterWalletIsInitialized = reinitWallet();

  platform.registerReloadOnNewVersion();

  // Handlers for messages coming directly from the content
  // script on the page
  platform.listenToAllChannels((message, sender, callback) => {
    afterWalletIsInitialized.then(() => {
      dispatch(message, sender, (response: CoreApiResponse) => {
        callback(response);
      });
    });
  });

  platform.registerAllIncomingConnections();

  try {
    platform.registerOnInstalled(() => {
      platform.openWalletPage("/welcome");

      //
      try {
        platform.registerTalerHeaderListener(parseTalerUriAndRedirect);
      } catch (e) {
        logger.error("could not register header listener", e);
      }
    });
  } catch (e) {
    console.error(e);
  }

  // On platforms that support it, also listen to external
  // modification of permissions.
  platform.getPermissionsApi().addPermissionsListener((perm, lastError) => {
    if (lastError) {
      logger.error(
        `there was a problem trying to get permission ${perm}`,
        lastError,
      );
      return;
    }
    platform.registerTalerHeaderListener(parseTalerUriAndRedirect);
  });
}
