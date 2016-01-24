/*
 This file is part of TALER
 (C) 2015 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
 */

"use strict";

/**
 * Run with
 * $ gulp <taskname>
 *
 * The important tasks are:
 * - tsconfig: generate tsconfig.json file for
 *   development
 * - package: create Chrome extension zip file in
 *   _build/.
 */

const gulp = require("gulp");
const map = require("map-stream");
const ts = require("gulp-typescript");
const zip = require("gulp-zip");
const fs = require("fs");
const del = require("del");
const through = require('through2');
const File = require('vinyl');

const paths = {
  ts: {
    release: [
      "lib/**/*.{ts,tsx}",
      "background/*.{ts,tsx}",
      "content_scripts/*.{ts,tsx}",
      "popup/*.{ts,tsx}",
      "pages/*.{ts,tsx}",
      "!**/*.d.ts"
    ],
    dev: [
        "test/tests/*.{ts,tsx}"
    ],
  },
  dist: [
    "manifest.json",
    "img/*",
    "lib/vendor/*",
    "lib/emscripten/libwrapper.js"
  ],
};



const tsBaseArgs = {
  target: "es5",
  jsx: "react",
  experimentalDecorators: true,
  module: "system",
  sourceMap: true,
  noLib: true,
};


let manifest;
(() => {
  const f = fs.readFileSync("manifest.json", "utf8");
  manifest = JSON.parse(f);
})();


gulp.task("clean", function () {
  return del("_build/ext");
});


gulp.task("dist-prod", ["clean"], function () {
  return gulp.src(paths.dist, {base: ".", stripBOM: false})
             .pipe(gulp.dest("_build/ext/"));
});

gulp.task("compile-prod", ["clean"], function () {
  const tsArgs = {};
  Object.assign(tsArgs, tsBaseArgs);
  tsArgs.typescript = require("typescript");
  // relative to the gulp.dest
  tsArgs.outDir = ".";
  // We don't want source maps for production
  tsArgs.sourceMap = undefined;
  return gulp.src(paths.ts.release)
      .pipe(ts(tsArgs))
      .pipe(gulp.dest("_build/ext/"));
});


gulp.task("package", ["compile-prod", "dist-prod"], function () {
  let zipname = String.prototype.concat("taler-wallet-", manifest.version, ".zip");
  return gulp.src("_build/ext/**", {buffer: false, stripBOM: false})
             .pipe(zip(zipname))
             .pipe(gulp.dest("_build/"));
});


/**
 * Generate a tsconfig.json with the
 * given compiler options that compiles
 * all files piped into it.
 */
function tsconfig(confBase) {
  let conf = {
    compilerOptions: {},
    files: []
  };
  Object.assign(conf.compilerOptions, confBase);
  return through.obj(function(file, enc, cb) {
    conf.files.push(file.relative);
    cb();
  }, function(cb) {
    let x = JSON.stringify(conf, null, 2);
    let f = new File({
      path: "tsconfig.json",
      contents: new Buffer(x),
    });
    this.push(f)
    cb();
  });
}


// Generate the tsconfig file
// that should be used during development.
gulp.task("tsconfig", function() {
  return gulp.src(Array.prototype.concat(paths.ts.release, paths.ts.dev), {base: "."})
             .pipe(tsconfig(tsBaseArgs))
             .pipe(gulp.dest("."));
});


gulp.task("default", ["package", "tsconfig"]);
