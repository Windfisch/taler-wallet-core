import { Stores } from "./types/dbTypes";
import { openDatabase, Database, Store, Index } from "./util/query";

const TALER_DB_NAME = "taler-wallet";

/**
 * Current database version, should be incremented
 * each time we do incompatible schema changes on the database.
 * In the future we might consider adding migration functions for
 * each version increment.
 */
export const WALLET_DB_VERSION = 1;

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
  ) => {
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
    WALLET_DB_VERSION,
    onVersionChange,
    onUpgradeNeeded,
  );
}

export function deleteTalerDatabase(idbFactory: IDBFactory) {
  Database.deleteDatabase(idbFactory, TALER_DB_NAME);
}
