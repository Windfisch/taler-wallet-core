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


// @ts-nocheck

/**
 * Load the taler emscripten lib.
 *
 * If in a WebWorker, importScripts is used.  Inside a browser,
 * the module must be globally available.
 */
export default function getLib() {
  if (window.TalerEmscriptenLib) {
    return TalerEmscriptenLib;
  }
  if (importScripts) {
    importScripts('/src/emscripten/taler-emscripten-lib.js')
    if (TalerEmscriptenLib) {
      throw Error("can't import TalerEmscriptenLib");
    }
    return TalerEmscriptenLib
  }
  throw Error("Can't find TalerEmscriptenLib.");
}
