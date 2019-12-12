import { Stores, WALLET_DB_VERSION } from "./types/dbTypes";
import { openDatabase, Database } from "./util/query";

const TALER_DB_NAME = "taler";

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