import { Stores } from "./types/dbTypes";
import { openDatabase, Database } from "./util/query";

const TALER_DB_NAME = "taler";

/**
 * Current database version, should be incremented
 * each time we do incompatible schema changes on the database.
 * In the future we might consider adding migration functions for
 * each version increment.
 */
export const WALLET_DB_VERSION = 28;

/**
 * Return a promise that resolves
 * to the taler wallet db.
 */
export function openTalerDatabase(
  idbFactory: IDBFactory,
  onVersionChange: () => void,
  onUpgradeUnsupported: (oldVersion: number, newVersion: number) => void,
): Promise<IDBDatabase> {
  return openDatabase(
    idbFactory,
    TALER_DB_NAME,
    WALLET_DB_VERSION,
    Stores,
    onVersionChange,
    onUpgradeUnsupported,
  );
}

export function deleteTalerDatabase(idbFactory: IDBFactory) {
  Database.deleteDatabase(idbFactory, TALER_DB_NAME);
}