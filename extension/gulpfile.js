
"use strict";

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
      "lib/**.{ts,tsx}",
      "background/*.{ts,tsx}",
      "content_scripts/*.{ts,tsx}",
      "popup/*.{ts,tsx}",
      "pages/*.{ts,tsx}",
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
}



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


gulp.task("clean", function() {
  return del("_build/ext");
});


gulp.task("dist-prod", ["clean"], function () {
  return gulp.src(paths.dist, {base: ".", stripBOM: false})
             .pipe(gulp.dest("_build/ext/"));
});

gulp.task("compile-prod", ["clean"], function() {
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


gulp.task("package", ["compile-prod", "dist-prod"], function() {
  let zipname = String.prototype.concat("taler-wallet-", manifest.version, ".zip");
  return gulp.src("_build/ext/**", {buffer: false, stripBOM: false})
             .pipe(zip(zipname))
             .pipe(gulp.dest("_build/"));
});

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

