// rollup.config.js
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import builtins from "builtin-modules";
import { terser } from "rollup-plugin-terser";
import typescript from "@rollup/plugin-typescript";

// Base settings to use
const baseTypescriptCompilerSettings = {
  target: "ES6",
  jsx: "react",
  reactNamespace: "React",
  moduleResolution: "node",
  sourceMap: true,
  lib: ["es6", "dom"],
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  strict: true,
  strictPropertyInitialization: false,
  noImplicitAny: true,
  noImplicitThis: true,
  allowJs: true,
  checkJs: true,
  incremental: false,
  esModuleInterop: true,
  importHelpers: true,
  module: "ESNext",
  include: ["src/**/*.+(ts|tsx)"],
  rootDir: "./src",
};

const walletCli = {
  input: "src/headless/taler-wallet-cli.ts",
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
    
    typescript({
      tsconfig: false,
      ...baseTypescriptCompilerSettings,
      sourceMap: false,
    }),
  ],
};

const walletAndroid = {
  input: "src/android/index.ts",
  output: {
    //dir: "dist/standalone",
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
      include: ["node_modules/**"],
      extensions: [".js"],
      sourceMap: false,
      ignore: ["taler-wallet"],
    }),

    typescript({
      tsconfig: false,
      ...baseTypescriptCompilerSettings,
      sourceMap: false,
    }),
  ],
};

const webExtensionPageEntryPoint = {
  input: "src/webex/pageEntryPoint.ts",
  output: {
    file: "dist/webextension/pageEntryPoint.js",
    format: "iife",
    exports: "none",
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
      sourceMap: false,
      ignore: ["taler-wallet"],
    }),

    typescript({
      tsconfig: false,
      ...baseTypescriptCompilerSettings,
      sourceMap: false,
    }),
  ],
};

const webExtensionBackgroundPageScript = {
  input: "src/webex/background.ts",
  output: {
    file: "dist/webextension/background.js",
    format: "iife",
    exports: "none",
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
      sourceMap: false,
      ignore: ["taler-wallet", "crypto"],
    }),

    typescript({
      tsconfig: false,
      ...baseTypescriptCompilerSettings,
      sourceMap: false,
    }),
  ],
};

const webExtensionCryptoWorker = {
  input: "src/crypto/workers/browserWorkerEntry.ts",
  output: {
    file: "dist/webextension/browserWorkerEntry.js",
    format: "iife",
    exports: "none",
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
      sourceMap: false,
      ignore: ["taler-wallet", "crypto"],
    }),

    typescript({
      tsconfig: false,
      ...baseTypescriptCompilerSettings,
      sourceMap: false,
    }),
  ],
};

export default [
  walletCli,
  walletAndroid,
  webExtensionPageEntryPoint,
  webExtensionBackgroundPageScript,
  webExtensionCryptoWorker,
];
