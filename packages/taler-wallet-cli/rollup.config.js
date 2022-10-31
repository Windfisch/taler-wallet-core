// rollup.config.js
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import builtins from "builtin-modules";
import pkg from "./package.json";
import sourcemaps from "rollup-plugin-sourcemaps";
import path from "path";
import replace from "@rollup/plugin-replace";
import child_process from 'child_process';

const printedVersion = `${pkg.version}-${getGitRevision()}`

export default {
  input: "lib/index.js",
  output: {
    file: pkg.main,
    format: "es",
    sourcemap: true,
    sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
      // Transform to source map paths to virtual path.  Otherwise,
      // error messages would contain paths that look like they should exist (relative to
      // the bundle) but don't.
      const res = path.normalize(
        path.join("/_walletsrc/packages/taler-wallet-cli/src/", relativeSourcePath),
      );
      return res;
    },
  },
  external: builtins,
  plugins: [
    replace({
      __VERSION__: `"${printedVersion}"`,
      preventAssignment: true,
    }),

    nodeResolve({
      preferBuiltins: true,
      exportConditions: ["node"],
    }),

    sourcemaps(),

    commonjs({
      sourceMap: true,
      transformMixedEsModules: true,
    }),

    json(),
  ],
};

function getGitRevision() {
  return child_process.execSync(`git rev-parse --short HEAD`, {
    encoding: 'utf-8',
    windowsHide: true,
  }).trim();
}
