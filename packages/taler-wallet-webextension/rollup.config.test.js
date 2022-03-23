// rollup.config.js
import fs from 'fs';
import path from 'path';
import css from 'rollup-plugin-css-only';
import { makePlugins } from "./rollup.config"

function fromDir(startPath, regex) {
  if (!fs.existsSync(startPath)) {
    return;
  }
  const files = fs.readdirSync(startPath);
  const result = files.flatMap(file => {
    const filename = path.join(startPath, file);

    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      return fromDir(filename, regex);
    }
    else if (regex.test(filename)) {
      return filename
    }
  }).filter(x => !!x)

  return result
}

const tests = fromDir('./src', /.test.ts$/)
  .filter(t => t === 'src/wallet/CreateManualWithdraw.test.ts')
  .map(test => ({
    input: test,
    output: {
      file: test.replace(/^src/, 'dist').replace(/\.ts$/, '.js'),
      format: "iife",
      exports: "none",
      name: test,
    },
    plugins: [
      ...makePlugins(),
      css({
        output: 'walletEntryPoint.css',
      }),
    ],
  }))

export default [
  ...tests,
];
