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
 * This module loads the emscripten library, and is written in unchecked
 * JavaScript since it needs to do environment detection and dynamically select
 * the right way to load the library.
 */

let cachedLib = undefined;
let cachedLibPromise = undefined;

export let enableTracing = false;

/**
 * Load the taler emscripten lib.
 *
 * If in a WebWorker, importScripts is used.  Inside a browser, the module must
 * be globally available.  Inside node, require is used.
 * 
 * Returns a Promise<{ lib: EmscLib }>
 */
export function getLib() {
  enableTracing && console.log("in getLib");
  if (cachedLib) {
    enableTracing && console.log("lib is cached");
    return Promise.resolve({ lib: cachedLib });
  }
  if (cachedLibPromise) {
    return cachedLibPromise;
  }
  if (typeof require !== "undefined") {
    enableTracing && console.log("trying to load emscripten lib with 'require'");
    // Make sure that TypeScript doesn't try
    // to check the taler-emscripten-lib.
    const indirectRequire = require;
    const g = global;
    // unavoidable hack, so that emscripten detects
    // the environment as node even though importScripts
    // is present.
    const savedImportScripts = g.importScripts;
    delete g.importScripts;
    // Assume that the code is run from the build/ directory.
    const libFn = indirectRequire("../../../emscripten/taler-emscripten-lib.js");
    const lib = libFn();
    g.importScripts = savedImportScripts;
    if (lib) {
      if (!lib.ccall) {
        throw Error("sanity check failed: taler-emscripten lib does not have 'ccall'");
      }
      cachedLibPromise = new Promise((resolve, reject) => {
        lib.onRuntimeInitialized = () => {
          cachedLib = lib;
          cachedLibPromise = undefined;
          resolve({ lib: cachedLib });
        };
      });
      return cachedLibPromise;
    } else {
      // When we're running as a webpack bundle, the above require might
      // have failed and returned 'undefined', so we try other ways to import.
      console.log("failed to load emscripten lib with 'require', trying alternatives"); 
    }
  }

  if (typeof importScripts !== "undefined") {
    console.log("trying to load emscripten lib with 'importScripts'");
    self.TalerEmscriptenLib = {};
    importScripts('/emscripten/taler-emscripten-lib.js')
    if (!self.TalerEmscriptenLib) {
      throw Error("can't import taler emscripten lib");
    }
    const locateFile = (path, scriptDir) => {
      console.log("locating file", "path", path, "scriptDir", scriptDir);
      // This is quite hacky and assumes that our scriptDir is dist/
      return scriptDir + "../emscripten/" + path;
    };
    console.log("instantiating TalerEmscriptenLib");
    const lib = self.TalerEmscriptenLib({ locateFile });
    cachedLib = lib;
    return new Promise((resolve, reject) => {
      lib.then(mod => {
        console.log("emscripten module fully loaded");
        resolve({ lib: mod });
      });
    });
  }

  // Last resort, we don't have require, we're not running in a webworker.
  // Maybe we're on a normal browser page, in this case TalerEmscriptenLib
  // must be included in a script tag on the page.

  if (typeof window !== "undefined") {
    if (window.TalerEmscriptenLib) {
      return Promise.resolve(TalerEmscriptenLib);
    }
    throw Error("Looks like running in browser, but TalerEmscriptenLib is not defined");
  }
  throw Error("Running in unsupported environment");
}
