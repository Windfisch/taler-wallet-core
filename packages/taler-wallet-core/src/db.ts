import { MetaStores, Stores } from "./types/dbTypes";
import {
  openDatabase,
  Database,
  Store,
  Index,
  AnyStoreMap,
} from "./util/query";
import {
  IDBFactory,
  IDBDatabase,
  IDBObjectStore,
  IDBTransaction,
} from "@gnu-taler/idb-bridge";
import { Logger } from "./util/logging";

/**
 * Name of the Taler database.  This is effectively the major
 * version of the DB schema. Whenever it changes, custom import logic
 * for all previous versions must be written, which should be
 * avoided.
 */
const TALER_DB_NAME = "taler-wallet-main-v2";

const TALER_META_DB_NAME = "taler-wallet-meta";

const CURRENT_DB_CONFIG_KEY = "currentMainDbName";

/**
 * Current database minor version, should be incremented
 * each time we do minor schema changes on the database.
 * A change is considered minor when fields are added in a
 * backwards-compatible way or object stores and indices
 * are added.
 */
export const WALLET_DB_MINOR_VERSION = 1;

const logger = new Logger("db.ts");

function upgradeFromStoreMap(
  storeMap: AnyStoreMap,
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number,
  upgradeTransaction: IDBTransaction,
): void {
  if (oldVersion === 0) {
    for (const n in storeMap) {
      if ((storeMap as any)[n] instanceof Store) {
        const si: Store<string, any> = (storeMap as any)[n];
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
      const storeVersionAdded = si.storeParams?.versionAdded ?? 1;
      if (storeVersionAdded > oldVersion) {
        s = db.createObjectStore(si.name, si.storeParams);
      } else {
        s = upgradeTransaction.objectStore(si.name);
      }
      for (const indexName in si as any) {
        if ((si as any)[indexName] instanceof Index) {
          const ii: Index<string, string, any, any> = (si as any)[indexName];
          const indexVersionAdded = ii.options?.versionAdded ?? 0;
          if (
            indexVersionAdded > oldVersion ||
            storeVersionAdded > oldVersion
          ) {
            s.createIndex(ii.indexName, ii.keyPath, ii.options);
          }
        }
      }
    }
  }
}

function onTalerDbUpgradeNeeded(
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number,
  upgradeTransaction: IDBTransaction,
) {
  upgradeFromStoreMap(Stores, db, oldVersion, newVersion, upgradeTransaction);
}

function onMetaDbUpgradeNeeded(
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number,
  upgradeTransaction: IDBTransaction,
) {
  upgradeFromStoreMap(
    MetaStores,
    db,
    oldVersion,
    newVersion,
    upgradeTransaction,
  );
}

/**
 * Return a promise that resolves
 * to the taler wallet db.
 */
export async function openTalerDatabase(
  idbFactory: IDBFactory,
  onVersionChange: () => void,
): Promise<Database<typeof Stores>> {
  const metaDbHandle = await openDatabase(
    idbFactory,
    TALER_META_DB_NAME,
    1,
    () => {},
    onMetaDbUpgradeNeeded,
  );

  const metaDb = new Database(metaDbHandle, MetaStores);
  let currentMainVersion: string | undefined;
  await metaDb.runWithWriteTransaction([MetaStores.metaConfig], async (tx) => {
    const dbVersionRecord = await tx.get(
      MetaStores.metaConfig,
      CURRENT_DB_CONFIG_KEY,
    );
    if (!dbVersionRecord) {
      currentMainVersion = TALER_DB_NAME;
      await tx.put(MetaStores.metaConfig, {
        key: CURRENT_DB_CONFIG_KEY,
        value: TALER_DB_NAME,
      });
    } else {
      currentMainVersion = dbVersionRecord.value;
    }
  });

  if (currentMainVersion !== TALER_DB_NAME) {
    // In the future, the migration logic will be implemented here.
    throw Error(`migration from database ${currentMainVersion} not supported`);
  }

  const mainDbHandle = await openDatabase(
    idbFactory,
    TALER_DB_NAME,
    WALLET_DB_MINOR_VERSION,
    onVersionChange,
    onTalerDbUpgradeNeeded,
  );

  return new Database(mainDbHandle, Stores);
}

export function deleteTalerDatabase(idbFactory: IDBFactory): void {
  Database.deleteDatabase(idbFactory, TALER_DB_NAME);
}
