#!/usr/bin/env node
/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import esbuild from "esbuild";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { sassPlugin } from "esbuild-sass-plugin";

const BASE = process.cwd();

const preact = path.join(
  BASE,
  "node_modules",
  "preact",
  "compat",
  "dist",
  "compat.module.js",
);

const preactCompatPlugin = {
  name: "preact-compat",
  setup(build) {
    build.onResolve({ filter: /^(react-dom|react)$/ }, (args) => {
      //console.log("onresolve", JSON.stringify(args, undefined, 2));
      return {
        path: preact,
      };
    });
  },
};

const entryPoints = ["src/index.tsx"];

let GIT_ROOT = BASE;
while (!fs.existsSync(path.join(GIT_ROOT, ".git")) && GIT_ROOT !== "/") {
  GIT_ROOT = path.join(GIT_ROOT, "../");
}
if (GIT_ROOT === "/") {
  console.log("not found");
  process.exit(1);
}
const GIT_HASH = GIT_ROOT === "/" ? undefined : git_hash();

let _package = JSON.parse(fs.readFileSync(path.join(BASE, "package.json")));

function git_hash() {
  const rev = fs
    .readFileSync(path.join(GIT_ROOT, ".git", "HEAD"))
    .toString()
    .trim()
    .split(/.*[: ]/)
    .slice(-1)[0];
  if (rev.indexOf("/") === -1) {
    return rev;
  } else {
    return fs.readFileSync(path.join(GIT_ROOT, ".git", rev)).toString().trim();
  }
}

// FIXME: Put this into some helper library.
function copyFilesPlugin(options) {
  return {
    name: "copy-files",
    setup(build) {
      build.onEnd(() => {
        for (const fop of options) {
          fs.copyFileSync(fop.src, fop.dest);
        }
      });
    },
  };
}

export const buildConfig = {
  entryPoints: [...entryPoints],
  bundle: true,
  outdir: "dist",
  minify: false,
  loader: {
    ".svg": "file",
    ".png": "dataurl",
    ".jpeg": "dataurl",
  },
  target: ["es6"],
  format: "esm",
  platform: "browser",
  sourcemap: true,
  jsxFactory: "h",
  jsxFragment: "Fragment",
  define: {
    __VERSION__: `"${_package.version}"`,
    __GIT_HASH__: `"${GIT_HASH}"`,
  },
  plugins: [
    preactCompatPlugin,
    sassPlugin(),
    copyFilesPlugin([
      {
        src: "static/index.html",
        dest: "dist/index.html",
      },
    ]),
  ],
};

esbuild.build(buildConfig).catch((e) => {
  console.log(e);
  process.exit(1);
});
