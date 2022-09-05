// rollup.config.js
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import builtins from "builtin-modules";
import pkg from "./package.json";
import sourcemaps from "rollup-plugin-sourcemaps";
import replace from '@rollup/plugin-replace';
import path from "path"
import fs from "fs"

const BASE = process.cwd()

let GIT_ROOT = BASE
while (!fs.existsSync(path.join(GIT_ROOT, '.git')) && GIT_ROOT !== '/') {
  GIT_ROOT = path.join(GIT_ROOT, '../')
}
const GIT_HASH = GIT_ROOT === '/' ? undefined : git_hash()

const nodeEntryPoint = {
  input: "lib/index.node.js",
  output: {
    file: pkg.main,
    format: "cjs",
    sourcemap: true,
  },
  external: builtins,
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      exportConditions: ["node"],
    }),

    sourcemaps(),
    replace({
      values: {
        '__VERSION__': `"${pkg.version}"`,
        '__GIT_HASH__': `"${GIT_HASH}"`,
      },
      preventAssignment: false,
    }),

    commonjs({
      include: [/node_modules/, /dist/],
      extensions: [".js"],
      ignoreGlobal: false,
      sourceMap: true,
    }),

    json(),
  ],
};

const browserEntryPoint = {
  input: "lib/index.browser.js",
  output: {
    file: pkg.browser[pkg.main],
    format: "cjs",
    sourcemap: true,
  },
  external: builtins,
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: true,
    }),

    sourcemaps(),

    commonjs({
      include: [/node_modules/, /dist/],
      extensions: [".js"],
      ignoreGlobal: false,
      sourceMap: true,
    }),

    json(),
  ],
};

export default [nodeEntryPoint, browserEntryPoint];

function git_hash() {
  const rev = fs.readFileSync(path.join(GIT_ROOT, '.git', 'HEAD')).toString().trim().split(/.*[: ]/).slice(-1)[0];
  if (rev.indexOf('/') === -1) {
    return rev;
  } else {
    return fs.readFileSync(path.join(GIT_ROOT, '.git', rev)).toString().trim();
  }
}
