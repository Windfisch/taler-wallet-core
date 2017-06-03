const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');


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
      chunkFilename: "[id].chunk.js",
      path: path.resolve(__dirname, "dist"),
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
    externals: [
      externalsCb,
      "child_process",
    ],
  }
  if (env.prod) {
    //base.plugins.push(new webpack.optimize.UglifyJsPlugin({sourceMap: true}));
    base.plugins.push(new webpack.LoaderOptionsPlugin({minimize: true}));
    base.plugins.push(new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("production")
    }));
  }
  const configWebWorker = {
    entry: {"cryptoWorker": "./src/crypto/cryptoWorker.ts"},
    target: "webworker",
  };

  const configBackground = {
    entry: {"background": "./src/webex/background.ts"},
  };

  const configContentScript = {
    entry: {"contentScript": "./src/webex/notify.ts"},
  };

  const configExtensionPages = {
    entry: {
      "add-auditor": "./src/webex/pages/add-auditor.tsx",
      "auditors": "./src/webex/pages/auditors.tsx",
      "confirm-contract": "./src/webex/pages/confirm-contract.tsx",
      "confirm-create-reserve": "./src/webex/pages/confirm-create-reserve.tsx",
      "error": "./src/webex/pages/error.tsx",
      "logs": "./src/webex/pages/logs.tsx",
      "popup": "./src/webex/pages/popup.tsx",
      "show-db": "./src/webex/pages/show-db.ts",
      "tree": "./src/webex/pages/tree.tsx",
      "payback": "./src/webex/pages/payback.tsx",
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
