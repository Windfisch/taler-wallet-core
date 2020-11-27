import { Stores } from "./types/dbTypes";
import { openDatabase, Database, Store, Index } from "./util/query";
import { IDBFactory, IDBDatabase, IDBObjectStore, IDBTransaction } from "idb-bridge";
import { Logger } from './util/logging';

/**
 * Name of the Taler database.  This is effectively the major
 * version of the DB schema. Whenever it changes, custom import logic
 * for all previous versions must be written, which should be
 * avoided.
 */
const TALER_DB_NAME = "taler-wallet-prod-v1";

/**
 * Current database minor version, should be incremented
 * each time we do minor schema changes on the database.
 * A change is considered minor when fields are added in a
 * backwards-compatible way or object stores and indices
 * are added.
 */
export const WALLET_DB_MINOR_VERSION = 2;

const logger = new Logger("db.ts");

/**
 * Return a promise that resolves
 * to the taler wallet db.
 */
export function openTalerDatabase(
  idbFactory: IDBFactory,
  onVersionChange: () => void,
): Promise<IDBDatabase> {
  const onUpgradeNeeded = (
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number,
    upgradeTransaction: IDBTransaction,
  ): void => {
    if (oldVersion === 0) {
      for (const n in Stores) {
        if ((Stores as any)[n] instanceof Store) {
          const si: Store<string, any> = (Stores as any)[n];
          const s = db.createObjectStore(si.name, si.storeParams);
          for (const indexName in si as any) {
            if ((si as any)[indexName] instanceof Index) {
              const ii: Index<string, string, any, any> = (si as any)[indexName];
              s.createIndex(ii.indexName, ii.keyPath, ii.options);
            }
          }
        }
      }
      return;
    }
    if (oldVersion === newVersion) {
      return;
    }
    logger.info(`upgrading database from ${oldVersion} to ${newVersion}`);
    for (const n in Stores) {
      if ((Stores as any)[n] instanceof Store) {
        const si: Store<string, any> = (Stores as any)[n];
        let s: IDBObjectStore;
        if ((si.storeParams?.versionAdded ?? 1) > oldVersion) {
          s = db.createObjectStore(si.name, si.storeParams);
        } else {
          s = upgradeTransaction.objectStore(si.name);
        }
        for (const indexName in si as any) {
          if ((si as any)[indexName] instanceof Index) {
            const ii: Index<string, string, any, any> = (si as any)[indexName];
            if ((ii.options?.versionAdded ?? 0) > oldVersion) {
              s.createIndex(ii.indexName, ii.keyPath, ii.options);
            }
          }
        }
      }
    }
  };

  return openDatabase(
    idbFactory,
    TALER_DB_NAME,
    WALLET_DB_MINOR_VERSION,
    onVersionChange,
    onUpgradeNeeded,
  );
}

export function deleteTalerDatabase(idbFactory: IDBFactory): void {
  Database.deleteDatabase(idbFactory, TALER_DB_NAME);
}
