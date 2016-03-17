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
 *   build/.
 *
 * @author Florian Dold
 */

const gulp = require("gulp");
const map = require("map-stream");
const ts = require("gulp-typescript");
const zip = require("gulp-zip");
const fs = require("fs");
const del = require("del");
const through = require('through2');
const File = require('vinyl');
const jsonTransform = require('gulp-json-transform');

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
    "*.po",
    "img/*",
    "style/*.css",
    "lib/vendor/*",
    "lib/i18n-strings.js",
    "lib/emscripten/libwrapper.js",
    "lib/module-trampoline.js",
    "popup/**/*.{html,css}",
    "pages/**/*.{html,css}",
  ],
  extra: [
      "AUTHORS",
      "README",
      "COPYING",
      "gulpfile.js",
      "tsconfig.json",
      "package.json",
      "pogen/pogen.ts",
      "pogen/tsconfig.json",
      "pogen/example/test.ts",
  ],
};

paths.srcdist = [].concat(paths.ts.release,
                          paths.ts.dev,
                          paths.dist,
                          paths.extra);



const tsBaseArgs = {
  target: "es5",
  jsx: "react",
  experimentalDecorators: true,
  module: "system",
  sourceMap: true,
  noLib: true,
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
};


let manifest;
(() => {
  const f = fs.readFileSync("manifest.json", "utf8");
  manifest = JSON.parse(f);
})();


gulp.task("clean", function () {
  return del("build/ext");
});


gulp.task("dist-prod", ["clean"], function () {
  return gulp.src(paths.dist, {base: ".", stripBOM: false})
             .pipe(gulp.dest("build/ext/"));
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
      .pipe(gulp.dest("build/ext/"));
});

gulp.task("manifest-stable", ["clean"], function () {
  return gulp.src("manifest.json")
             .pipe(jsonTransform((data) => {
               data.name = "GNU Taler Wallet (stable)";
               return data;
             }, 2))
             .pipe(gulp.dest("build/ext/"));
});

gulp.task("manifest-unstable", ["clean"], function () {
  return gulp.src("manifest.json")
             .pipe(jsonTransform((data) => {
               data.name = "GNU Taler Wallet (unstable)";
               return data;
             }, 2))
             .pipe(gulp.dest("build/ext/"));
});


gulp.task("package-stable", ["compile-prod", "dist-prod", "manifest-stable"], function () {
  let zipname = String.prototype.concat("taler-wallet-stable-", manifest.version, ".zip");
  return gulp.src("build/ext/**", {buffer: false, stripBOM: false})
             .pipe(zip(zipname))
             .pipe(gulp.dest("build/"));
});

gulp.task("package-unstable", ["compile-prod", "dist-prod", "manifest-unstable"], function () {
  let zipname = String.prototype.concat("taler-wallet-unstable-", manifest.version, ".zip");
  return gulp.src("build/ext/**", {buffer: false, stripBOM: false})
             .pipe(zip(zipname))
             .pipe(gulp.dest("build/"));
});


/**
 * Create source distribution.
 */
gulp.task("srcdist", [], function () {
  let zipname = String.prototype.concat("taler-wallet-", manifest.version, "-src.zip");
  return gulp.src(paths.srcdist, {buffer: false, stripBOM: false, base: "."})
             .pipe(zip(zipname))
             .pipe(gulp.dest("."));
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


gulp.task("default", ["package-stable", "tsconfig"]);
