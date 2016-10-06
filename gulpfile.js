/*
 This file is part of TALER
 (C) 2015-2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
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
const zip = require("gulp-zip");
const gzip = require("gulp-gzip");
const rename = require("gulp-rename");
const symlink = require("gulp-sym");
const tar = require("gulp-tar");
const concat = require("gulp-concat");
const ts = require("gulp-typescript");
const debug = require("gulp-debug");
const glob = require("glob");
const jsonTransform = require('gulp-json-transform');
const fs = require("fs");
const del = require("del");
const through = require('through2');
const File = require('vinyl');
const Stream = require('stream').Stream;
const vfs = require('vinyl-fs');

const paths = {
  ts: {
    release: [
      "lib/**/*.{ts,tsx}",
      "background/*.{ts,tsx}",
      "content_scripts/*.{ts,tsx}",
      "popup/*.{ts,tsx}",
      "pages/*.{ts,tsx}",
      "!**/*.d.ts",
    ],
    dev: [
        "test/tests/*.{ts,tsx}",
    ],
  },
  dist: [
    "i18n/*.po",
    "i18n/*.pot",
    "img/*",
    "style/*.css",
    "lib/vendor/*",
    "i18n/strings.js",
    "lib/emscripten/libwrapper.js",
    "lib/module-trampoline.js",
    "popup/**/*.{html,css}",
    "pages/**/*.{html,css}",
    "lib/**/*.d.ts",
    "background/*.html",
  ],
  extra: [
      "AUTHORS",
      "README",
      "COPYING",
      "Makefile",
      "configure",
      "gulpfile.js",
      "tsconfig.json",
      "package.json",
      "pogen/pogen.ts",
      "pogen/tsconfig.json",
      "pogen/example/test.ts",
      // Only in extra, because the manifest is processed/generated
      // targets other than "srcdist".
      "manifest.json",
  ],
  /* French copyright application */
  appdist: [
      "i18n/*.po",
      "i18n/*.pot",
      "style/*.css",
      "img/**",
      "lib/**/*.{ts,tsx}",
      "!lib/vendor/*",
      "!**/*.d.ts",
      "background/*.{ts,tsx}",
      "content_scripts/*.{ts,tsx}",
      "popup/*.{ts,tsx}",
      "pages/*.{ts,tsx}",
      "AUTHORS",
      "README",
      "COPYING",
      "Makefile",
      "gulpfile.js",
      "test/tests/*.{ts,tsx}",
      "pogen/pogen.ts",
      "lib/module-trampoline.js",
      "popup/**/*.{html,css}",
      "pages/**/*.{html,css}",
  ],
};


const tsBaseArgs = {
  target: "es6",
  jsx: "react",
  reactNamespace: "preact",
  experimentalDecorators: true,
  module: "system",
  sourceMap: true,
  noLib: true,
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  strictNullChecks: true,
  noImplicitAny: true,
};


let manifest;
(() => {
  const f = fs.readFileSync("manifest.json", "utf8");
  manifest = JSON.parse(f);
})();


/**
 * File globbing that works just like
 * gulp.src(...).
 */
function gglob(ps) {
  let patPos = [];
  let patNeg = [];
  for (let x of ps) {
    if (x.slice(0,1) === "!") {
      patNeg.push(x.slice(1));
    } else {
      patPos.push(x);
      console.log("Pattern", x);
   }
  }
  let result = new Set();
  for (let pat of patPos) {
    let rs = glob.sync(pat, {ignore: patNeg});
    for (let r of rs) {
      result.add(r);
    }
  }
  return Array.from(result);
}


// Concatenate node streams,
// taken from dominictarr's event-stream module
function concatStreams (/*streams...*/) {
  var toMerge = [].slice.call(arguments);
  if (toMerge.length === 1 && (toMerge[0] instanceof Array)) {
    toMerge = toMerge[0]; //handle array as arguments object
  }
  var stream = new Stream();
  stream.setMaxListeners(0); // allow adding more than 11 streams
  var endCount = 0;
  stream.writable = stream.readable = true;

  toMerge.forEach(function (e) {
    e.pipe(stream, {end: false});
    var ended = false;
    e.on('end', function () {
      if (ended) return;
      ended = true;
      endCount++;
      if (endCount == toMerge.length)
        stream.emit('end');
    })
  });
  stream.write = function (data) {
    this.emit('data', data);
  };
  stream.destroy = function () {
    toMerge.forEach(function (e) {
      if (e.destroy) e.destroy();
    })
  };
  return stream;
}


gulp.task("clean", function () {
  return del("build/ext");
});


gulp.task("dist-prod", ["clean"], function () {
  return vfs.src(paths.dist, {base: ".", stripBOM: false})
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
  return gulp.src(paths.ts.release, {base: "."})
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
  let basename = String.prototype.concat("taler-wallet-stable-", manifest.version_name, "-", manifest.version);
  let zipname = basename + ".zip";
  let xpiname = basename + ".xpi";
  return gulp.src("build/ext/**", {buffer: false, stripBOM: false})
             .pipe(zip(zipname))
             .pipe(gulp.dest("build/"))
             .pipe(symlink("build/" + xpiname, {relative: true, force: true}));
});

gulp.task("package-unstable", ["compile-prod", "dist-prod", "manifest-unstable"], function () {
  let basename = String.prototype.concat("taler-wallet-unstable-", manifest.version_name, "-",  manifest.version);
  let zipname = basename + ".zip";
  let xpiname = basename + ".xpi";
  return gulp.src("build/ext/**", {buffer: false, stripBOM: false})
             .pipe(zip(zipname))
             .pipe(gulp.dest("build/"))
             .pipe(symlink("build/" + xpiname, {relative: true, force: true}));
});


/**
 * Create source distribution.
 */
gulp.task("srcdist", [], function () {
  const name = String.prototype.concat("taler-wallet-webex-", manifest.version_name);
  const opts = {buffer: false, stripBOM: false, base: "."};
  // We can't just concat patterns due to exclude patterns
  const files = concatStreams(
      gulp.src(paths.ts.release, opts),
      gulp.src(paths.ts.dev, opts),
      gulp.src(paths.dist, opts),
      gulp.src(paths.extra, opts));

  return files
      .pipe(rename(function (p) { p.dirname = name + "/" + p.dirname; }))
      .pipe(tar(name + "-src.tar"))
      .pipe(gzip())
      .pipe(gulp.dest("."));
});


/**
 * Create source distribution for
 * French copyright application.
 */
gulp.task("appdist", [], function () {
  let zipname = String.prototype.concat("taler-wallet-webex-", manifest.version_name, "-appsrc.zip");
  return gulp.src(paths.appdist, {buffer: false, stripBOM: false, base: "."})
             .pipe(zip(zipname))
             .pipe(gulp.dest("."));
});


/**
 * Compile po extraction script.
 */
gulp.task("pogenjs", [], function () {
  var tsProject = ts.createProject("pogen/tsconfig.json");
  return tsProject.src()
                  .pipe(ts(tsProject))
                  .pipe(gulp.dest("pogen"));
});


/**
 * Extract .po files from source code
 */
gulp.task("pogen", ["pogenjs"], function (cb) {
  throw Error("not yet implemented");
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
    this.push(f);
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
