#!/usr/bin/env node
/* eslint-disable no-undef */

import linaria from '@linaria/esbuild'
import esbuild from 'esbuild'
import { buildConfig } from "./build-fast-with-linaria.mjs"
import fs from 'fs';

fs.writeFileSync("dev-html/manifest.json", fs.readFileSync("manifest-v2.json"))
fs.writeFileSync("dev-html/mocha.css", fs.readFileSync("node_modules/mocha/mocha.css"))
fs.writeFileSync("dev-html/mocha.js", fs.readFileSync("node_modules/mocha/mocha.js"))
fs.writeFileSync("dev-html/mocha.js.map", fs.readFileSync("node_modules/mocha/mocha.js.map"))

const server = await esbuild
  .serve({
    servedir: 'dev-html',
  }, { ...buildConfig, outdir: 'dev-html/dist' })
  .catch((e) => {
    console.log(e)
    process.exit(1)
  });

console.log("ready!", server.port);

