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
 * Core of the wallet's schema, used for painless export, import
 * and schema migration.
 * 
 * If this schema is extended, it must be extended in a completely
 * backwards-compatible way.
 */

interface CoreCoin {
  exchangeBaseUrl: string;
  coinPub: string;
  coinPriv: string;
  amountRemaining: string;
}

interface CorePurchase {
  noncePub: string;
  noncePriv: string;
  paySig: string;
  contractTerms: any;
}

interface CoreReserve {
  reservePub: string;
  reservePriv: string;
  exchangeBaseUrl: string;
}

interface SchemaCore {
  coins: CoreCoin[];
  purchases: CorePurchase[];

  /**
   * Schema version (of full schema) of wallet that exported the core schema.
   */
  versionExporter: number;

  /**
   * Schema version of the database that has been exported to the core schema
   */
  versionSourceDatabase: number;
}