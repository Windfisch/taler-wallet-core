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

import linaria from '@linaria/esbuild'
import esbuild from 'esbuild'
import path from "path"
import fs from "fs"

function getFilesInDirectory(startPath, regex) {
  if (!fs.existsSync(startPath)) {
    return;
  }
  const files = fs.readdirSync(startPath);
  const result = files.flatMap(file => {
    const filename = path.join(startPath, file);

    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      return getFilesInDirectory(filename, regex);
    }
    else if (regex.test(filename)) {
      return filename
    }
  }).filter(x => !!x)

  return result
}

const allTestFiles = getFilesInDirectory(path.join(process.cwd(), 'src'), /.test.ts$/)

const preact = path.join(process.cwd(), "node_modules", "preact", "compat", "dist", "compat.module.js");
const preactCompatPlugin = {
  name: "preact-compat",
  setup(build) {
    build.onResolve({ filter: /^(react-dom|react)$/ }, args => ({ path: preact }));
  }
}

const entryPoints = [
  'src/popupEntryPoint.tsx',
  'src/popupEntryPoint.dev.tsx',
  'src/walletEntryPoint.tsx',
  'src/walletEntryPoint.dev.tsx',
  'src/background.ts',
  'src/stories.tsx',
  'src/background.dev.ts',
  'src/browserWorkerEntry.ts'
]

export const buildConfig = {
  entryPoints: [...entryPoints, ...allTestFiles],
  bundle: true,
  outdir: 'dist',
  minify: false,
  loader: {
    '.svg': 'text',
    '.png': 'dataurl',
    '.jpeg': 'dataurl',
  },
  target: [
    'es6'
  ],
  format: 'iife',
  platform: 'browser',
  sourcemap: true,
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  // define: {
  //   'process.env.NODE_ENV': '"development"',
  // },
  plugins: [
    preactCompatPlugin,
    linaria.default({
      babelOptions: {
        babelrc: false,
        configFile: './babel.config-linaria.json',
      },
      sourceMap: true,
    }),
  ],
}

await esbuild
  .build(buildConfig)
  .catch((e) => {
    console.log(e)
    process.exit(1)
  });

