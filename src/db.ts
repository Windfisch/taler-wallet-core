import { Stores, WALLET_DB_VERSION } from "./dbTypes";
import { Store, Index } from "./query";

const DB_NAME = "taler";

/**
 * Return a promise that resolves
 * to the taler wallet db.
 */
export function openTalerDb(
  idbFactory: IDBFactory,
  onVersionChange: () => void,
  onUpgradeUnsupported: (oldVersion: number, newVersion: number) => void,
): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = idbFactory.open(DB_NAME, WALLET_DB_VERSION);
    req.onerror = e => {
      console.log("taler database error", e);
      reject(e);
    };
    req.onsuccess = e => {
      req.result.onversionchange = (evt: IDBVersionChangeEvent) => {
        console.log(
          `handling live db version change from ${evt.oldVersion} to ${
            evt.newVersion
          }`,
        );
        req.result.close();
        onVersionChange();
      };
      resolve(req.result);
    };
    req.onupgradeneeded = e => {
      const db = req.result;
      console.log(
        `DB: upgrade needed: oldVersion=${e.oldVersion}, newVersion=${
          e.newVersion
        }`,
      );
      switch (e.oldVersion) {
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
          if (e.oldVersion !== WALLET_DB_VERSION) {
            onUpgradeUnsupported(e.oldVersion, WALLET_DB_VERSION);
            throw Error("incompatible DB");
          }
          break;
      }
    };
  });
}

export function exportDb(db: IDBDatabase): Promise<any> {
  const dump = {
    name: db.name,
    stores: {} as { [s: string]: any },
    version: db.version,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(Array.from(db.objectStoreNames));
    tx.addEventListener("complete", () => {
      resolve(dump);
    });
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      const name = db.objectStoreNames[i];
      const storeDump = {} as { [s: string]: any };
      dump.stores[name] = storeDump;
      tx.objectStore(name)
        .openCursor()
        .addEventListener("success", (e: Event) => {
          const cursor = (e.target as any).result;
          if (cursor) {
            storeDump[cursor.key] = cursor.value;
            cursor.continue();
          }
        });
    }
  });
}

export function importDb(db: IDBDatabase, dump: any): Promise<void> {
  console.log("importing db", dump);
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(Array.from(db.objectStoreNames), "readwrite");
    if (dump.stores) {
      for (const storeName in dump.stores) {
        const objects = [];
        const dumpStore = dump.stores[storeName];
        for (const key in dumpStore) {
          objects.push(dumpStore[key]);
        }
        console.log(`importing ${objects.length} records into ${storeName}`);
        const store = tx.objectStore(storeName);
        for (const obj of objects) {
          store.put(obj);
        }
      }
    }
    tx.addEventListener("complete", () => {
      resolve();
    });
  });
}

export function deleteDb(idbFactory: IDBFactory) {
  idbFactory.deleteDatabase(DB_NAME);
}
