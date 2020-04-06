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
import * as amounts from "../util/amounts";
import { Bank } from "./bank";
import fs from "fs";
import { NodeThreadCryptoWorkerFactory } from "../crypto/workers/nodeThreadWorker";
import { WalletNotification, NotificationType } from "../types/notifications";
import { Database } from "../util/query";
import { NodeHttpLib } from "./NodeHttpLib";
import { Logger } from "../util/logging";
import { SynchronousCryptoWorkerFactory } from "../crypto/workers/synchronousWorker";
import { WithdrawalSourceType } from "../types/dbTypes";

const logger = new Logger("helpers.ts");

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
      console.error("could not read wallet file");
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

  const myVersionChange = () => {
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

export async function withdrawTestBalance(
  myWallet: Wallet,
  amount: string = "TESTKUDOS:10",
  bankBaseUrl: string = "https://bank.test.taler.net/",
  exchangeBaseUrl: string = "https://exchange.test.taler.net/",
) {
  const reserveResponse = await myWallet.createReserve({
    amount: amounts.parseOrThrow(amount),
    exchange: exchangeBaseUrl,
    exchangeWire: "payto://unknown",
  });

  const reservePub = reserveResponse.reservePub;

  const bank = new Bank(bankBaseUrl);

  const bankUser = await bank.registerRandomUser();

  logger.trace(`Registered bank user ${JSON.stringify(bankUser)}`);

  const exchangePaytoUri = await myWallet.getExchangePaytoUri(exchangeBaseUrl, [
    "x-taler-bank",
  ]);

  const donePromise = new Promise((resolve, reject) => {
    myWallet.runRetryLoop().catch((x) => {
      reject(x);
    });
    myWallet.addNotificationListener((n) => {
      if (
        n.type === NotificationType.WithdrawGroupFinished &&
        n.withdrawalSource.type === WithdrawalSourceType.Reserve &&
        n.withdrawalSource.reservePub === reservePub
      ) {
        resolve();
      }
    });
  });

  await bank.createReserve(bankUser, amount, reservePub, exchangePaytoUri);
  await myWallet.confirmReserve({ reservePub: reserveResponse.reservePub });
  await donePromise;
}
