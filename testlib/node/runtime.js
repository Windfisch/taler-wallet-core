/*
 This file is part of TALER
 (C) 2016 Inria

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
 *
 * @author Florian Dold
 */


"use strict";

let vm = require("vm");
let fs = require("fs");
let process = require("process");

let emsc = require("../../src/emscripten/taler-emscripten-lib.js");

// Do it here, since it breaks 'require'' for libwrapper
let System = require("systemjs");


// When instrumenting code with istanbul,
// automatic module type detection fails,
// thus we specify it here manually.
System.config({
  defaultJSExtensions: true,
  //meta: {
  //  './test/tests/taler.js': {
  //    format: 'register'
  //  },
  //  './lib/wallet/*': {
  //    format: 'register'
  //  }
  //}
});

console.log("TAP version 13");

let mod = System.newModule({Module: emsc, default: emsc});
let modName = System.normalizeSync(__dirname + "/../../src/emscripten/taler-emscripten-lib.js");
System.set(modName, mod);

process.on('unhandledRejection', function(reason, p){
  console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
  process.exit(1);
});


let testName = process.argv[2];
System.import("testlib/talertest")
  .then(tt => {
    SystemJS.import(testName)
      .then(() => {
        return tt.run();
      })
      .catch((e) => console.error(e));
  })
  .catch((e) => {
    console.error("can't locate talertest");
    console.error(e);
  });

