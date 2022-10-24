/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

// rollup.config.js
import linaria from '@linaria/rollup';
import nodeResolve from "@rollup/plugin-node-resolve";
import alias from "@rollup/plugin-alias";
import image from '@rollup/plugin-image';
import json from "@rollup/plugin-json";
import ts from "@rollup/plugin-typescript";
import replace from "@rollup/plugin-replace";
import css from 'rollup-plugin-css-only';
import html from '@rollup/plugin-html';
import commonjs from "@rollup/plugin-commonjs";



const template = async ({
  files,
}) => {
  const scripts = (files.js || []).map(({ code }) => `<script>${code}</script>`).join('\n');
  const css = (files.css || []).map(({ source }) => `<style>${source}</style>`).join('\n');
  const ssr = (files.js || []).map(({ code }) => code).join('\n');
  const page = new Function(`${ssr}; return page.buildTimeRendering();`)()
  return `
<!doctype html>
<html>
  <head>
    ${page.head}
    ${css}
  </head>
  <script id="built_time_data">
  </script>
  <body>
    ${page.body}
    ${scripts}
    <script>page.mount()</script>
  </body>
</html>`;
};

const makePlugins = (name) => [
  alias({
    entries: [
      { find: 'react', replacement: 'preact/compat' },
      { find: 'react-dom', replacement: 'preact/compat' }
    ]
  }),

  replace({
    "process.env.NODE_ENV": JSON.stringify("production"),
    preventAssignment: true,
  }),

  commonjs({
    include: [/node_modules/, /dist/],
    extensions: [".js"],
    ignoreGlobal: true,
    sourceMap: true,
  }),

  nodeResolve({
    browser: true,
    preferBuiltins: true,
  }),

  json(),
  image(),

  linaria({
    sourceMap: process.env.NODE_ENV !== 'production',
  }),
  css(),
  ts({
    sourceMap: false,
    outputToFilesystem: false,
  }),
  html({ template, fileName: name }),
];


const pageDefinition = (name) => ({
  input: `src/pages/${name}.tsx`,
  output: {
    file: `dist/pages/${name}.js`,
    format: "iife",
    exports: 'named',
    name: 'page',
  },
  plugins: makePlugins(`${name}.html`),
});

export default [
  pageDefinition("OfferTip"),
  pageDefinition("OfferRefund"),
  pageDefinition("DepletedTip"),
  pageDefinition("RequestPayment"),
  pageDefinition("ShowOrderDetails"),
]
