// rollup.config.js
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import json from '@rollup/plugin-json';
import builtins from 'builtin-modules'


const walletCli = {
  input: 'dist/node/headless/taler-wallet-cli.js',
  output: {
    file: 'dist/standalone/taler-wallet-cli.js',
    format: 'cjs'
  },
  plugins: [
    json(),

    nodeResolve({
      external: builtins,
      preferBuiltins: true
    }),

    commonjs({
      include: ['node_modules/**', 'dist/node/**'],
      extensions: [ '.js' ],
      ignoreGlobal: false,  // Default: false
      sourceMap: false,
      ignore: [ 'taler-wallet' ]
    })
  ]
};

export default [walletCli];
