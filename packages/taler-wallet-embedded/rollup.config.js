// rollup.config.js
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import builtins from "builtin-modules";
import pkg from "./package.json";
import walletCorePkg from "../taler-wallet-core/package.json";
import replace from "@rollup/plugin-replace";
import fs from "fs";
import path from "path";

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

const BASE = process.cwd();
let GIT_ROOT = BASE;
while (!fs.existsSync(path.join(GIT_ROOT, ".git")) && GIT_ROOT !== "/") {
  GIT_ROOT = path.join(GIT_ROOT, "../");
}
const GIT_HASH = GIT_ROOT === "/" ? undefined : git_hash();

export default {
  input: "lib/index.js",
  output: {
    file: pkg.main,
    format: "cjs",
  },
  external: builtins,
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      exportConditions: ["node"],
    }),

    replace({
      values: {
        __VERSION__: `"${walletCorePkg.version}"`,
        __GIT_HASH__: `"${GIT_HASH}"`,
      },
      preventAssignment: false,
    }),

    commonjs({
      include: [/node_modules/, /dist/],
      extensions: [".js", ".ts"],
      ignoreGlobal: false,
      sourceMap: false,
    }),

    json(),
  ],
};
