#!/usr/bin/env node
/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
/* eslint-disable no-undef */
import esbuild from 'esbuild'
import fs from 'fs';
import path from "path"
import sass from "sass";

// eslint-disable-next-line no-undef
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
      return {
        path: preact,
      };
    });
  },
};


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

const DEFAULT_SASS_FILTER = /\.(s[ac]ss|css)$/

const buildSassPlugin = {
  name: "custom-build-sass",
  setup(build) {

    build.onLoad({ filter: DEFAULT_SASS_FILTER }, ({ path: file }) => {
      const resolveDir = path.dirname(file)
      const { css: contents } = sass.compile(file, { loadPaths: ["./"] })

      return {
        resolveDir,
        loader: 'css',
        contents
      }
    });

  },
};

function copyFilesPlugin(options) {
  if (!options.basedir) {
    options.basedir = process.cwd()
  }
  return {
    name: "copy-files",
    setup(build) {
      build.onEnd(() => {
        for (const fop of options) {
          fs.copyFileSync(path.join(options.basedir, fop.src), path.join(options.basedir, fop.dest));
        }
      });
    },
  };
}

export const buildConfig = {
  entryPoints: ['src/index.ts', 'src/stories.tsx'],
  bundle: true,
  outdir: 'dist',
  minify: false,
  loader: {
    '.svg': 'dataurl',
    '.ttf': 'file',
    '.woff': 'file',
    '.woff2': 'file',
    '.eot': 'file',
  },
  target: [
    'es6'
  ],
  format: 'esm',
  platform: 'browser',
  sourcemap: true,
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  define: {
    '__VERSION__': `"${_package.version}"`,
    '__GIT_HASH__': `"${GIT_HASH}"`,
  },
  plugins: [
    preactCompatPlugin,
    copyFilesPlugin([
      {
        src: "./src/index.html",
        dest: "./dist/index.html",
      },
    ]),
    buildSassPlugin
  ],
}

await esbuild.build(buildConfig)




