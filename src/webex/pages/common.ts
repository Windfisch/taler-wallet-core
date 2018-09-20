/*
 This file is part of TALER
 (C) 2018 GNUnet e.V.

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
 * Common helper functions for all web extension pages.
 */

/**
 * Make sure that a function is executed exactly once
 * after the DOM has been loaded.
 */
export function runOnceWhenReady(f: () => void): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", f);
    return;
  }
  f();
}
