// rollup.config.js
import linaria from '@linaria/rollup';
import alias from '@rollup/plugin-alias';
import commonjs from "@rollup/plugin-commonjs";
import image from '@rollup/plugin-image';
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import css from 'rollup-plugin-css-only';
import ignore from "rollup-plugin-ignore";
import typescript from '@rollup/plugin-typescript';

export const makePlugins = () => [
  typescript({
    outputToFilesystem: false,
  }),

  alias({
    entries: [
      { find: 'react', replacement: 'preact/compat' },
      { find: 'react-dom', replacement: 'preact/compat' }
    ]
  }),

  ignore(["module", "os"]),
  nodeResolve({
    browser: true,
    preferBuiltins: true,
  }),

  //terser(),


  replace({
    "process.env.NODE_ENV": JSON.stringify("production"),
    // "__filename": "'__webextension__'",
    preventAssignment: true
  }),

  commonjs({
    include: [/node_modules/, /dist/],
    extensions: [".js"],
    ignoreGlobal: true,
    sourceMap: true,
  }),

  json(),
  image(),

  linaria({
    babelOptions: {
      babelrc: false,
      configFile: './babel.config-linaria.json',
    },
    sourceMap: process.env.NODE_ENV !== 'production',
  }),

];


const webExtensionWalletEntryPoint = {
  input: "src/walletEntryPoint.tsx",
  output: {
    file: "dist/walletEntryPoint.js",
    format: "iife",
    exports: "none",
    name: "webExtensionWalletEntry",
  },
  plugins: [
    ...makePlugins(),
    css({
      output: 'walletEntryPoint.css',
    }),
  ],
};

const webExtensionPopupEntryPoint = {
  input: "src/popupEntryPoint.tsx",
  output: {
    file: "dist/popupEntryPoint.js",
    format: "iife",
    exports: "none",
    name: "webExtensionPopupEntry",
  },
  plugins: [
    ...makePlugins(),
    css({
      output: 'popupEntryPoint.css',
    }),
  ],
};

const webExtensionBackgroundPageScript = {
  input: "src/background.ts",
  output: {
    file: "dist/background.js",
    format: "iife",
    exports: "none",
    name: "webExtensionBackgroundScript",
  },
  plugins: makePlugins(),
};

const webExtensionCryptoWorker = {
  input: "src/browserWorkerEntry.ts",
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
