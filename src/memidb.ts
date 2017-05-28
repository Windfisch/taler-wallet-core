/*
 This file is part of TALER
 (C) 2017 Inria and GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * In-memory implementation of the IndexedDB interface.
 */


interface StoredObject {
  key: any;
  object: string;
}

interface Store {
  name: string;
  keyPath: string | string[];
  objects: { [strKey: string]: StoredObject };
}


interface Database {
  name: string;
  version: number;
  stores: { [name: string]: Store };
}


interface Databases {
  [name: string]: Database;
}


class MemoryIDBFactory implements IDBFactory {
  data: Databases = {};

  cmp(a: any, b: any): number {
    return 0;
  }

  deleteDatabase(name: string): IDBOpenDBRequest {
    throw Error("not implemented");
  }

  open(name: string, version?: number): IDBOpenDBRequest {
    throw Error("not implemented");
  }
}
