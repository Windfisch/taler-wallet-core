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
import type { IDBFactory } from "@gnu-taler/idb-bridge";
// eslint-disable-next-line no-duplicate-imports
import {
  BridgeIDBFactory,
  MemoryBackend,
  shimIndexedDB,
} from "@gnu-taler/idb-bridge";
import { AccessStats } from "@gnu-taler/idb-bridge";
import { Logger, WalletNotification } from "@gnu-taler/taler-util";
import * as fs from "fs";
import { NodeThreadCryptoWorkerFactory } from "../crypto/workers/nodeThreadWorker.js";
import { SynchronousCryptoWorkerFactory } from "../crypto/workers/synchronousWorkerFactory.js";
import { openTalerDatabase } from "../db-utils.js";
import { HttpRequestLibrary } from "../util/http.js";
import { SetTimeoutTimerAPI } from "../util/timer.js";
import { Wallet } from "../wallet.js";
import { NodeHttpLib } from "./NodeHttpLib.js";

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

  cryptoWorkerType?: "sync" | "node-worker-thread";
}

/**
 * Generate a random alphanumeric ID.  Does *not* use cryptographically
 * secure randomness.
 */
function makeId(length: number): string {
  let result = "";
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Get a wallet instance with default settings for node.
 */
export async function getDefaultNodeWallet(
  args: DefaultNodeWalletArgs = {},
): Promise<Wallet> {
  const res = await getDefaultNodeWallet2(args);
  return res.wallet;
}

/**
 * Get a wallet instance with default settings for node.
 *
 * Extended version that allows getting DB stats.
 */
export async function getDefaultNodeWallet2(
  args: DefaultNodeWalletArgs = {},
): Promise<{
  wallet: Wallet;
  getDbStats: () => AccessStats;
}> {
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
    } catch (e: any) {
      const code: string = e.code;
      if (code === "ENOENT") {
        logger.trace("wallet file doesn't exist yet");
      } else {
        logger.error("could not open wallet database file");
        throw e;
      }
    }

    myBackend.afterCommitCallback = async () => {
      logger.trace("committing database");
      // Allow caller to stop persisting the wallet.
      if (args.persistentStoragePath === undefined) {
        return;
      }
      const tmpPath = `${args.persistentStoragePath}-${makeId(5)}.tmp`;
      const dbContent = myBackend.exportDump();
      fs.writeFileSync(tmpPath, JSON.stringify(dbContent, undefined, 2), {
        encoding: "utf-8",
      });
      // Atomically move the temporary file onto the DB path.
      fs.renameSync(tmpPath, args.persistentStoragePath);
      logger.trace("committing database done");
    };
  }

  BridgeIDBFactory.enableTracing = false;

  const myBridgeIdbFactory = new BridgeIDBFactory(myBackend);
  const myIdbFactory: IDBFactory = myBridgeIdbFactory as any as IDBFactory;

  let myHttpLib;
  if (args.httpLib) {
    myHttpLib = args.httpLib;
  } else {
    myHttpLib = new NodeHttpLib();
  }

  const myVersionChange = (): Promise<void> => {
    logger.error("version change requested, should not happen");
    throw Error(
      "BUG: wallet DB version change event can't happen with memory IDB",
    );
  };

  shimIndexedDB(myBridgeIdbFactory);

  const myDb = await openTalerDatabase(myIdbFactory, myVersionChange);

  let workerFactory;
  const cryptoWorkerType = args.cryptoWorkerType ?? "node-worker-thread";
  if (cryptoWorkerType === "sync") {
    logger.info("using synchronous crypto worker");
    workerFactory = new SynchronousCryptoWorkerFactory();
  } else if (cryptoWorkerType === "node-worker-thread") {
    try {
      // Try if we have worker threads available, fails in older node versions.
      const _r = "require";
      // eslint-disable-next-line no-unused-vars
      const worker_threads = module[_r]("worker_threads");
      // require("worker_threads");
      workerFactory = new NodeThreadCryptoWorkerFactory();
    } catch (e) {
      logger.warn(
        "worker threads not available, falling back to synchronous workers",
      );
      workerFactory = new SynchronousCryptoWorkerFactory();
    }
  } else {
    throw Error(`unsupported crypto worker type '${cryptoWorkerType}'`);
  }

  const timer = new SetTimeoutTimerAPI();

  const w = await Wallet.create(myDb, myHttpLib, timer, workerFactory);

  if (args.notifyHandler) {
    w.addNotificationListener(args.notifyHandler);
  }
  return {
    wallet: w,
    getDbStats: () => myBackend.accessStats,
  };
}
