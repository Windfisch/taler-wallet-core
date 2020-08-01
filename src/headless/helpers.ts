/*
 This file is part of GNU Taler
 (C) 2019 Taler Systems S.A.

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
 * Helpers to create headless wallets.
 * @author Florian Dold <dold@taler.net>
 */

/**
 * Imports.
 */
import { Wallet } from "../wallet";
import { MemoryBackend, BridgeIDBFactory, shimIndexedDB } from "idb-bridge";
import { openTalerDatabase } from "../db";
import { HttpRequestLibrary } from "../util/http";
import fs from "fs";
import { NodeThreadCryptoWorkerFactory } from "../crypto/workers/nodeThreadWorker";
import { WalletNotification } from "../types/notifications";
import { Database } from "../util/query";
import { NodeHttpLib } from "./NodeHttpLib";
import { Logger } from "../util/logging";
import { SynchronousCryptoWorkerFactory } from "../crypto/workers/synchronousWorker";

const logger = new Logger("headless/helpers.ts");

export interface DefaultNodeWalletArgs {
  /**
   * Location of the wallet database.
   *
   * If not specified, the wallet starts out with an empty database and
   * the wallet database is stored only in memory.
   */
  persistentStoragePath?: string;

  /**
   * Handler for asynchronous notifications from the wallet.
   */
  notifyHandler?: (n: WalletNotification) => void;

  /**
   * If specified, use this as HTTP request library instead
   * of the default one.
   */
  httpLib?: HttpRequestLibrary;
}

/**
 * Get a wallet instance with default settings for node.
 */
export async function getDefaultNodeWallet(
  args: DefaultNodeWalletArgs = {},
): Promise<Wallet> {
  BridgeIDBFactory.enableTracing = false;
  const myBackend = new MemoryBackend();
  myBackend.enableTracing = false;

  const storagePath = args.persistentStoragePath;
  if (storagePath) {
    try {
      const dbContentStr: string = fs.readFileSync(storagePath, {
        encoding: "utf-8",
      });
      const dbContent = JSON.parse(dbContentStr);
      myBackend.importDump(dbContent);
    } catch (e) {
      logger.warn("could not read wallet file");
    }

    myBackend.afterCommitCallback = async () => {
      // Allow caller to stop persisting the wallet.
      if (args.persistentStoragePath === undefined) {
        return;
      }
      const dbContent = myBackend.exportDump();
      fs.writeFileSync(storagePath, JSON.stringify(dbContent, undefined, 2), {
        encoding: "utf-8",
      });
    };
  }

  BridgeIDBFactory.enableTracing = false;

  const myBridgeIdbFactory = new BridgeIDBFactory(myBackend);
  const myIdbFactory: IDBFactory = (myBridgeIdbFactory as any) as IDBFactory;

  let myHttpLib;
  if (args.httpLib) {
    myHttpLib = args.httpLib;
  } else {
    myHttpLib = new NodeHttpLib();
  }

  const myVersionChange = (): Promise<void> => {
    console.error("version change requested, should not happen");
    throw Error();
  };

  shimIndexedDB(myBridgeIdbFactory);

  const myDb = await openTalerDatabase(myIdbFactory, myVersionChange);

  let workerFactory;
  try {
    // Try if we have worker threads available, fails in older node versions.
    require("worker_threads");
    workerFactory = new NodeThreadCryptoWorkerFactory();
  } catch (e) {
    console.log(
      "worker threads not available, falling back to synchronous workers",
    );
    workerFactory = new SynchronousCryptoWorkerFactory();
  }

  const dbWrap = new Database(myDb);

  const w = new Wallet(dbWrap, myHttpLib, workerFactory);
  if (args.notifyHandler) {
    w.addNotificationListener(args.notifyHandler);
  }
  return w;
}
