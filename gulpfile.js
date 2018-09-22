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
const gutil = require("gulp-util");
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
const jsonTransform = require("gulp-json-transform");
const fs = require("fs");
const through = require("through2");
const File = require("vinyl");
const Stream = require("stream").Stream;
const vfs = require("vinyl-fs");
const webpack = require("webpack");
const po2json = require("po2json");
const path = require("path");

const paths = {
  ts: {
    src: [
      "src/**/*.{ts,tsx,js}",
      "!src/**/*-test*.ts",
    ],
    decl: [
      "decl/jed.d.ts",
      "decl/chrome/chrome.d.ts",
      "decl/urijs.d.ts",
    ],
    test: [
        "src/**/*-test*.ts",
    ],
  },
  // distributed in the chrome extension
  dist: [
    "dist/*-bundle.js",
    "dist/*-bundle.js.map",
    "emscripten/taler-emscripten-lib.js",
    "emscripten/taler-emscripten-lib.wasm",
    "img/icon.png",
    "img/logo.png",
    "src/webex/**/*.{js,css,html}",
  ],
  // for the source distribution
  extra: [
      "AUTHORS",
      "COPYING",
      "Makefile",
      "README",
      "configure",
      "decl/**/*.d.ts",
      "gulpfile.js",
      "manifest.json",
      "package.json",
      "pogen/example/test.ts",
      "pogen/pogen.ts",
      "pogen/tsconfig.json",
      "src/i18n/*.po",
      "src/i18n/*.pot",
      "src/i18n/poheader",
      "src/i18n/strings-prelude",
      "tooling/**",
      "tsconfig.json",
      "webpack.config.js",
  ],
};


const tsBaseArgs = {
  target: "es6",
  jsx: "react",
  reactNamespace: "React",
  experimentalDecorators: true,
  module: "commonjs",
  sourceMap: true,
  lib: ["es6", "dom"],
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  strict: true,
  strictPropertyInitialization: false,
  outDir: "build/src/",
  noImplicitAny: true,
  allowJs: true,
  checkJs: true,
  noUnusedLocals: true,
};


const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));


// Concatenate node streams,
// taken from dominictarr's event-stream module
function concatStreams (/*streams...*/) {
  var toMerge = [].slice.call(arguments);
  if (toMerge.length === 1 && (toMerge[0] instanceof Array)) {
    toMerge = toMerge[0]; // handle array as arguments object
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



gulp.task("dist-prod", ["compile-prod"], function () {
  return vfs.src(paths.dist, {base: ".", stripBOM: false})
             .pipe(gulp.dest("build/ext/"));
});

gulp.task("compile-prod", function (callback) {
  let config = require("./webpack.config.js")({prod: true});
  webpack(config, function(err, stats) {
    if (err) {
      throw new gutil.PluginError("webpack", err);
    }
    if (stats.hasErrors() || stats.hasWarnins) {
      gutil.log("[webpack]", stats.toString({
        colors: true,
      }));
    }
    callback();
  });
});

gulp.task("manifest-stable", function () {
  return gulp.src("manifest.json")
             .pipe(jsonTransform((data) => {
               data.name = "GNU Taler Wallet";
               return data;
             }, 2))
             .pipe(gulp.dest("build/ext/"));
});

gulp.task("manifest-unstable", function () {
  return gulp.src("manifest.json")
             .pipe(jsonTransform((data) => {
               data.name = "GNU Taler Wallet (unstable)";
               return data;
             }, 2))
             .pipe(gulp.dest("build/ext/"));
});


gulp.task("package-stable", ["dist-prod", "manifest-stable"], function () {
  let basename = String.prototype.concat("taler-wallet-stable-", manifest.version_name, "-", manifest.version);
  let zipname = basename + ".zip";
  let xpiname = basename + ".xpi";
  return gulp.src("build/ext/**", {buffer: false, stripBOM: false})
             .pipe(zip(zipname))
             .pipe(gulp.dest("build/"))
             .pipe(symlink("build/" + xpiname, {relative: true, force: true}));
});

gulp.task("package-unstable", ["dist-prod", "manifest-unstable"], function () {
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
      gulp.src(paths.ts.src, opts),
      gulp.src(paths.ts.decl, opts),
      gulp.src(paths.ts.test, opts),
      gulp.src(paths.dist, opts),
      gulp.src(paths.extra, opts));

  return files
      .pipe(rename(function (p) { p.dirname = name + "/" + p.dirname; }))
      .pipe(tar(name + "-src.tar"))
      .pipe(gzip())
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
gulp.task("pogen", function (cb) {
  throw Error("not yet implemented");
});


/**
 * Generate a tsconfig.json with the
 * given compiler options that compiles
 * all files piped into it.
 */
function tsconfig(confBase) {
  let conf = {
    compileOnSave: true,
    compilerOptions: {},
    files: []
  };
  Object.assign(conf.compilerOptions, confBase);
  return through.obj(function (file, enc, cb) {
    conf.files.push(file.relative);
    cb();
  }, function (cb) {
    conf.files.sort();
    let x = JSON.stringify(conf, null, 2);
    let f = new File({
      path: "tsconfig.json",
      contents: new Buffer(x),
    });
    this.push(f);
    cb();
  });
}


/**
 * Get the content of a Vinyl file object as a buffer.
 */
function readContentsBuffer(file, cb) {
  if (file.isBuffer()) {
    cb(file.contents);
    return;
  }
  if (!file.isStream()) {
    throw Error("file must be stream or buffer");
  }
  const chunks = [];
  file.contents.on("data", function (chunk) {
    if (!Buffer.isBuffer(chunk)) {
      throw Error("stream data must be a buffer");
    }
    chunks.pus(chunk);
  });
  file.contents.on("end", function (chunk) {
    cb(Buffer.concat(chunks));
  });
  file.contents.on("error", function (err) {
    cb(undefined, err);
  });
}


/**
 * Combine multiple translations (*.po files) into
 * one JavaScript file.
 */
function pofilesToJs(targetPath) {
  const outStream = through();
  const f = new File({
    path: targetPath,
    contents: outStream,
  });
  const prelude = fs.readFileSync("./src/i18n/strings-prelude");
  outStream.write(prelude);
  return through.obj(function (file, enc, cb) {
    readContentsBuffer(file, function (buf, error) {
      if (error) {
        throw error;
      }
      const lang = path.basename(file.path, ".po");
      if (!lang) {
        throw Error();
      }
      console.log("lang", lang);
      const pojson = po2json.parse(buf, {format: "jed1.x", fuzzy: true});
      outStream.write("strings['" + lang + "'] = " + JSON.stringify(pojson, null, "  ") + ";\n");
      cb();
    });
  }, function (cb) {
    this.push(f);
    return cb();
  });
}


// Generate the tsconfig file
// that should be used during development.
gulp.task("tsconfig", function () {
  let opts = {base: "."};
  const files = concatStreams(
          vfs.src(paths.ts.src, opts),
          vfs.src(paths.ts.test, opts),
          vfs.src(paths.ts.decl, opts));
  return files.pipe(tsconfig(tsBaseArgs))
              .pipe(gulp.dest("."));
});

gulp.task("po2js", function () {
  return gulp.src("src/i18n/*.po", {base: "."})
             .pipe(pofilesToJs("src/i18n/strings.ts"))
             .pipe(gulp.dest("."));
});


gulp.task("default", ["package-stable", "tsconfig"]);
