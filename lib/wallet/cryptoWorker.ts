/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

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
 * Web worker for crypto operations.
 * @author Florian Dold
 */

"use strict";


importScripts("../emscripten/libwrapper.js",
              "../vendor/system-csp-production.src.js");


// TypeScript does not allow ".js" extensions in the
// module name, so SystemJS must add it.
System.config({
                defaultJSExtensions: true,
              });

// We expect that in the manifest, the emscripten js is loaded
// becore the background page.
// Currently it is not possible to use SystemJS to load the emscripten js.
declare var Module: any;
if ("object" !== typeof Module) {
  throw Error("emscripten not loaded, no 'Module' defined");
}


// Manually register the emscripten js as a SystemJS, so that
// we can use it from TypeScript by importing it.

{
  let mod = System.newModule({Module: Module});
  let modName = System.normalizeSync("../emscripten/emsc");
  console.log("registering", modName);
  System.set(modName, mod);
}

System.import("./cryptoLib")
      .then((m) => {
        m.main(self);
        console.log("loaded");
      })
      .catch((e) => {
        console.log("crypto worker failed");
        console.error(e.stack);
      });

console.log("in worker thread");

