// rollup.config.js
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import builtins from "builtin-modules";
import replace from "@rollup/plugin-replace";
import ignore from "rollup-plugin-ignore"

const makePlugins = () => [
    ignore(["module", "os"]),
    nodeResolve({
      browser: true,
      preferBuiltins: true,
    }),

    //terser(),
    

    replace({
      "process.env.NODE_ENV": JSON.stringify("production"),
      "__filename": "'__webextension__'",
    }),

    commonjs({
      include: [/node_modules/, /dist/],
      extensions: [".js"],
      ignoreGlobal: true,
      sourceMap: true,
    }),

    json(),
];


const webExtensionWalletEntryPoint = {
  input: "lib/walletEntryPoint.js",
  output: {
    file: "dist/walletEntryPoint.js",
    format: "iife",
    exports: "none",
    name: "webExtensionWalletEntry",
  },
  plugins: makePlugins(),
};

const webExtensionPopupEntryPoint = {
  input: "lib/popupEntryPoint.js",
  output: {
    file: "dist/popupEntryPoint.js",
    format: "iife",
    exports: "none",
    name: "webExtensionPopupEntry",
  },
  plugins: makePlugins(),
};

const webExtensionBackgroundPageScript = {
  input: "lib/background.js",
  output: {
    file: "dist/background.js",
    format: "iife",
    exports: "none",
    name: "webExtensionBackgroundScript",
  },
  plugins: makePlugins(),
};

const webExtensionCryptoWorker = {
  input: "lib/browserWorkerEntry.js",
  output: {
    file: "dist/browserWorkerEntry.js",
    format: "iife",
    exports: "none",
    name: "webExtensionCryptoWorker",
  },
  plugins: makePlugins(),
};

export default [
  webExtensionPopupEntryPoint,
  webExtensionWalletEntryPoint,
  webExtensionBackgroundPageScript,
  webExtensionCryptoWorker,
];
