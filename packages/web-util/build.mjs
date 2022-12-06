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

import esbuild from 'esbuild'
import path from "path"
import fs from "fs"

// eslint-disable-next-line no-undef
const BASE = process.cwd()

let GIT_ROOT = BASE
while (!fs.existsSync(path.join(GIT_ROOT, '.git')) && GIT_ROOT !== '/') {
  GIT_ROOT = path.join(GIT_ROOT, '../')
}
if (GIT_ROOT === '/') {
  // eslint-disable-next-line no-undef
  console.log("not found")
  // eslint-disable-next-line no-undef
  process.exit(1);
}
const GIT_HASH = GIT_ROOT === '/' ? undefined : git_hash()


let _package = JSON.parse(fs.readFileSync(path.join(BASE, 'package.json')));

function git_hash() {
  const rev = fs.readFileSync(path.join(GIT_ROOT, '.git', 'HEAD')).toString().trim().split(/.*[: ]/).slice(-1)[0];
  if (rev.indexOf('/') === -1) {
    return rev;
  } else {
    return fs.readFileSync(path.join(GIT_ROOT, '.git', rev)).toString().trim();
  }
}

const buildConfigBase = {
  outdir: "lib",
  bundle: true,
  minify: false,
  target: [
    'es6'
  ],
  loader: {
    '.key': 'text',
    '.crt': 'text',
    '.html': 'text',
  },
  sourcemap: true,
  define: {
    '__VERSION__': `"${_package.version}"`,
    '__GIT_HASH__': `"${GIT_HASH}"`,
  },
}

const buildConfigNode = {
  ...buildConfigBase,
  entryPoints: ["src/index.node.ts", "src/cli.ts"],
  outExtension: {
    '.js': '.cjs'
  },
  format: 'cjs',
  platform: 'node',
  external: ["preact"],
};

const buildConfigBrowser = {
  ...buildConfigBase,
  entryPoints: ["src/index.browser.ts", "src/live-reload.ts", 'src/stories.tsx'],
  outExtension: {
    '.js': '.mjs'
  },
  format: 'esm',
  platform: 'browser',
  external: ["preact", "@gnu-taler/taler-util", "jed"],
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
};

[buildConfigNode, buildConfigBrowser].forEach((config) => {
  esbuild
    .build(config)
    .catch((e) => {
      // eslint-disable-next-line no-undef
      console.log(e)
      // eslint-disable-next-line no-undef
      process.exit(1)
    });

})

