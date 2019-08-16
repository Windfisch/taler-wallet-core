const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const { CheckerPlugin } = require('awesome-typescript-loader')
const TerserPlugin = require('terser-webpack-plugin');


function externalsCb(context, request, callback) {
  if (/.*taler-emscripten-lib.*/.test(request)) {
    callback(null, "undefined");
    return;
  }
  callback();
}

module.exports = function (env) {
  env = env || {};
  const base = {
    output: {
      filename: '[name]-bundle.js',
      chunkFilename: "[name]-bundle.js",
      path: path.resolve(__dirname, "dist"),
    },
    module: {
      noParse: /taler-emscripten-lib/,
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'awesome-typescript-loader',
          exclude: /node_modules|taler-emscripten-lib|nodeEmscriptenLoader|synchronousWorker/,
        }
      ]
    },
    resolve: {
      modules: [path.resolve(__dirname, "./"), "node_modules"],
      extensions: [".tsx", ".ts", ".js"]
    },
    plugins: [
      new CheckerPlugin(),
    ],
    devtool: "source-map",
    externals: [
      externalsCb,
      "child_process",
    ],
    optimization: {
      minimize: false,
      minimizer: [
        new TerserPlugin({
          sourceMap: true,
          terserOptions: {
            keep_classnames: true,
            keep_fnames: true,
          }
        }),
      ],
    }
  }
  const configWebWorker = {
    entry: {"cryptoWorker": "./src/crypto/browserWorkerEntry.ts"},
    target: "webworker",
    name: "webworker",
  };

  const configBackground = {
    entry: {"background": "./src/webex/background.ts"},
    name: "background",
  };

  const configContentScript = {
    entry: {"contentScript": "./src/webex/notify.ts"},
    name: "contentScript",
  };

  const configExtensionPages = {
    entry: {
      "add-auditor": "./src/webex/pages/add-auditor.tsx",
      "auditors": "./src/webex/pages/auditors.tsx",
      "benchmark": "./src/webex/pages/benchmark.tsx",
      "confirm-contract": "./src/webex/pages/confirm-contract.tsx",
      "confirm-create-reserve": "./src/webex/pages/confirm-create-reserve.tsx",
      "error": "./src/webex/pages/error.tsx",
      "logs": "./src/webex/pages/logs.tsx",
      "payback": "./src/webex/pages/payback.tsx",
      "popup": "./src/webex/pages/popup.tsx",
      "reset-required": "./src/webex/pages/reset-required.tsx",
      "return-coins": "./src/webex/pages/return-coins.tsx",
      "refund": "./src/webex/pages/refund.tsx",
      "show-db": "./src/webex/pages/show-db.ts",
      "tip": "./src/webex/pages/tip.tsx",
      "tree": "./src/webex/pages/tree.tsx",
    },
    name: "pages",
    optimization: {
      splitChunks: {
        cacheGroups: {
          commons: {
            name: 'page-common',
            chunks: 'all',
            minChunks: 2,
          },
        },
      },
    },
  };

  return [
    merge(base, configBackground),
    merge(base, configWebWorker),
    merge(base, configExtensionPages),
    merge(base, configContentScript)
  ];
}
