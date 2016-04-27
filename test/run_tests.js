
/**
 * Bridge between the mocha test runner / nodejs
 * and the typescript / the wallet's module system.
 *
 * The test cases use better-assert as assert library
 * with mocha's bdd UI.
 */

"use strict";

let assert = require("better-assert");
let vm = require("vm");
let fs = require("fs");


if ("function" !== typeof run) {
  throw Error("test must be run with 'mocha --delay ...'");
}

let emsc = require("../lib/emscripten/libwrapper.js");

// Do it here, since it breaks 'require'' for libwrapper
let System = require("systemjs");

System.config({
  defaultJSExtensions: true
});

let mod = System.newModule({Module: emsc});
let modName = System.normalizeSync(__dirname + "/../lib/emscripten/emsc");
console.log("registering", modName);
System.set(modName, mod);

System.import("./test/tests/taler.js")
  .then((t) => {
    t.declareTests(assert, context, it);
    setTimeout(run, 1);
  })
  .catch((e) => {
    console.error("failed to load module", e.stack);
  });
