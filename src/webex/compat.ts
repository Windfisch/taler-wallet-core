/*
 This file is part of TALER
 (C) 2017 INRIA

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
 * Compatibility helpers needed for browsers that don't implement
 * WebExtension APIs consistently.
 */

export function isFirefox(): boolean {
  const rt = chrome.runtime as any;
  if (typeof rt.getBrowserInfo === "function") {
    return true;
  }
  return false;
}

/**
 * Check if we are running under nodejs.
 */
export function isNode(): boolean {
  return typeof process !== "undefined" && process.release.name === "node";
}
