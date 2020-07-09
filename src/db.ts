import { Stores } from "./types/dbTypes";
import { openDatabase, Database, Store, Index } from "./util/query";

/**
 * Name of the Taler database.  The name includes the
 * major version of the DB schema.  The version should be incremented
 * with each major change.  When incrementing the major version,
 * the wallet should import data from the previous version.
 */
const TALER_DB_NAME = "taler-walletdb-v5";

/**
 * Current database minor version, should be incremented
 * each time we do minor schema changes on the database.
 * A change is considered minor when fields are added in a
 * backwards-compatible way or object stores and indices
 * are added.
 */
export const WALLET_DB_MINOR_VERSION = 1;

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
  ): void => {
    switch (oldVersion) {
      case 0: // DB does not exist yet
        for (const n in Stores) {
          if ((Stores as any)[n] instanceof Store) {
            const si: Store<any> = (Stores as any)[n];
            const s = db.createObjectStore(si.name, si.storeParams);
            for (const indexName in si as any) {
              if ((si as any)[indexName] instanceof Index) {
                const ii: Index<any, any> = (si as any)[indexName];
                s.createIndex(ii.indexName, ii.keyPath, ii.options);
              }
            }
          }
        }
        break;
      default:
        throw Error("unsupported existig DB version");
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
