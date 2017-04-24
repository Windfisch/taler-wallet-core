const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');


module.exports = function (env) {
  const base = {
    output: {
      filename: '[name]-bundle.js',
      chunkFilename: "[id].chunk.js",
      path: path.resolve(__dirname, "dist")
    },
    module: {
      noParse: /taler-emscripten-lib/,
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          exclude: /node_modules/,
          exclude: /taler-emscripten-lib/,
        }
      ]
    },
    resolve: {
      modules: [path.resolve(__dirname, "./"), "node_modules"],
      extensions: [".tsx", ".ts", ".js"]
    },
    plugins: [],
    devtool: "source-map",
  }
  if (env.prod) {
    base.plugins.push(new webpack.optimize.UglifyJsPlugin());
    base.plugins.push(new webpack.LoaderOptionsPlugin({minimize: true}));
  }
  const configWebWorker = {
    entry: {"cryptoWorker": "./src/cryptoWorker.ts"},
    target: "webworker",
    externals: {
      // A big hack to load taler-emscripten-lib from the environment,
      // because we exclude it from the bundle.
      "./emscripten/taler-emscripten-lib": "(self.TalerEmscriptenLib = {}, importScripts('/src/emscripten/taler-emscripten-lib.js'), TalerEmscriptenLib)",
    },
  };

  const configBackground = {
    entry: {"background": "./src/background/background.ts"},
  };

  const configContentScript = {
    entry: {"contentScript": "./src/content_scripts/notify.ts"},
  };

  const configExtensionPages = {
    entry: {
      "add-auditor": "./src/pages/add-auditor.tsx",
      "auditors": "./src/pages/auditors.tsx",
      "confirm-contract": "./src/pages/confirm-contract.tsx",
      "confirm-create-reserve": "./src/pages/confirm-create-reserve.tsx",
      "error": "./src/pages/error.tsx",
      "logs": "./src/pages/logs.tsx",
      "popup": "./src/pages/popup.tsx",
      "show-db": "./src/pages/show-db.ts",
      "tree": "./src/pages/tree.tsx",
    },
    plugins: [
      new webpack.optimize.CommonsChunkPlugin({
        name: "page-common",
        minChunks: 2,
      }),
    ],
  };

  return [
    merge(base, configBackground),
    merge(base, configWebWorker),
    merge(base, configExtensionPages),
    merge(base, configContentScript)
  ];
}
