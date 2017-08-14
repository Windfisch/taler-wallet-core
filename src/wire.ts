/*
 This file is part of TALER
 (C) 2017 GNUnet e.V.

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
 * Display and manipulate wire information.
 *
 * Right now, all types are hard-coded.  In the future, there might be plugins / configurable
 * methods or support for the "payto://" URI scheme.
 */

/**
 * Imports.
 */
import * as i18n from "./i18n";

/**
 * Short summary of the wire information.
 * 
 * Might abbreviate and return the same summary for different
 * wire details.
 */
export function summarizeWire(w: any): string {
  if (!w.type) {
    return i18n.str`Invalid Wire`;
  }
  switch (w.type.toLowerCase()) {
    case "test":
      if (!w.account_number && w.account_number !== 0) {
        return i18n.str`Invalid Test Wire Detail`;
      }
      if (!w.bank_uri) {
        return i18n.str`Invalid Test Wire Detail`;
      }
      return i18n.str`Test Wire Acct #${w.account_number} on ${w.bank_uri}`;
    default:
      return i18n.str`Unknown Wire Detail`;
  }
}

