
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
  ts: [
    "lib/**.{ts,tsx}",
    "background/*.{ts,tsx}",
    "content_scripts/*.{ts,tsx}",
    "popup/*.{ts,tsx}",
    "pages/*.{ts,tsx}",
  ],
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

console.log("version:", manifest.version);


gulp.task("clean", function() {
  del("_build/ext");
});

// Package the extension
gulp.task("build-prod", ["clean"], function() {
  console.log("hello");
  const tsArgs = {};
  Object.assign(tsArgs, tsBaseArgs);
  console.log("args", JSON.stringify(tsArgs));
  tsArgs.typescript = require("typescript");
  // relative to the gulp.dest
  tsArgs.outDir = ".";
  // We don't want source maps for production
  tsArgs.sourceMap = undefined;
  gulp.src(paths.ts)
      .pipe(map((f,cb) => { console.log(f.path); cb(null, f); }))
      .pipe(ts(tsArgs))
      .pipe(gulp.dest("_build/ext/"));
  gulp.src(paths.dist, {base: ".", stripBOM: false})
      .pipe(gulp.dest("_build/ext/"));
});


gulp.task("package", ["build-prod"], function() {
  console.log("hello, packaging");
  let zipname = String.prototype.concat("taler-wallet-", manifest.version, ".zip");
  gulp.src("_build/ext/*", {buffer: false, stripBOM: false})
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
    console.log("file", file.relative);
    conf.files.push(file.relative);
    cb();
  }, function(cb) {
    console.log("done");
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
  gulp.src(paths.ts, {base: "."})
      .pipe(tsconfig(tsBaseArgs))
      .pipe(gulp.dest("."));
});

