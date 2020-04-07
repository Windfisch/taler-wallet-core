// rollup.config.js
import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import builtins from "builtin-modules";
import { terser } from "rollup-plugin-terser";

const walletCli = {
  input: "dist/node/headless/taler-wallet-cli.js",
  output: {
    file: "dist/standalone/taler-wallet-cli.js",
    format: "cjs",
  },
  external: builtins,
  plugins: [
    nodeResolve({
      preferBuiltins: true,
    }),

    commonjs({
      include: ["node_modules/**", "dist/node/**"],
      extensions: [".js", ".ts"],
      ignoreGlobal: false, // Default: false
      sourceMap: false,
      ignore: ["taler-wallet"],
    }),
    json(),
  ],
};

const walletAndroid = {
  input: "dist/node/android/index.js",
  output: {
    file: "dist/standalone/taler-wallet-android.js",
    format: "cjs",
    exports: "named",
  },
  external: builtins,
  plugins: [
    json(),

    nodeResolve({
      preferBuiltins: true,
    }),

    commonjs({
      include: ["node_modules/**", "dist/node/**"],
      extensions: [".js"],
      ignoreGlobal: false, // Default: false
      sourceMap: false,
      ignore: ["taler-wallet"],
    }),
  ],
};

const webExtensionPageEntryPoint = {
  input: "dist/node/webex/pageEntryPoint.js",
  output: {
    file: "dist/webextension/pageEntryPoint.js",
    format: "iife",
    exports: "default",
    name: "webExtensionPageEntry",
  },
  external: builtins,
  plugins: [
    json(),

    nodeResolve({
      preferBuiltins: true,
    }),

    terser(),

    replace({
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),

    commonjs({
      include: ["node_modules/**", "dist/node/**"],
      extensions: [".js"],
      ignoreGlobal: false, // Default: false
      sourceMap: false,
      ignore: ["taler-wallet"],
    }),
  ],
};

const webExtensionBackgroundPageScript = {
  input: "dist/node/webex/background.js",
  output: {
    file: "dist/webextension/background.js",
    format: "iife",
    exports: "default",
    name: "webExtensionBackgroundScript",
  },
  external: builtins,
  plugins: [
    json(),

    nodeResolve({
      preferBuiltins: true,
    }),

    terser(),

    replace({
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),

    commonjs({
      include: ["node_modules/**", "dist/node/**"],
      extensions: [".js"],
      ignoreGlobal: false, // Default: false
      sourceMap: false,
      ignore: ["taler-wallet", "crypto"],
    }),
  ],
};

const webExtensionCryptoWorker = {
  input: "dist/node/crypto/workers/browserWorkerEntry.js",
  output: {
    file: "dist/webextension/browserWorkerEntry.js",
    format: "iife",
    exports: "default",
    name: "webExtensionCryptoWorker",
  },
  external: builtins,
  plugins: [
    json(),

    nodeResolve({
      preferBuiltins: true,
    }),

    terser(),

    replace({
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),

    commonjs({
      include: ["node_modules/**", "dist/node/**"],
      extensions: [".js"],
      ignoreGlobal: false, // Default: false
      sourceMap: false,
      ignore: ["taler-wallet", "crypto"],
    }),
  ],
};

const webExtensionContentScript = {
  input: "dist/node/webex/notify.js",
  output: {
    file: "dist/webextension/contentScript.js",
    format: "iife",
    exports: "default",
    name: "webExtensionContentScript",
  },
  external: builtins,
  plugins: [
    json(),

    nodeResolve({
      preferBuiltins: true,
    }),

    terser(),

    replace({
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),

    commonjs({
      include: ["node_modules/**", "dist/node/**"],
      extensions: [".js"],
      ignoreGlobal: false, // Default: false
      sourceMap: false,
      ignore: ["taler-wallet"],
    }),
  ],
};

export default [
  walletCli,
  walletAndroid,
  webExtensionPageEntryPoint,
  webExtensionBackgroundPageScript,
  webExtensionCryptoWorker,
  webExtensionContentScript,
];
