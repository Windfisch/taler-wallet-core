#!/usr/bin/env node
/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
/* eslint-disable no-undef */
import esbuild from 'esbuild'
import fs from 'fs';
import WebSocket from "ws";
import chokidar from "chokidar";

const devServerBroadcastDelay = 500
const devServerPort = 8002
const wss = new WebSocket.Server({ port: devServerPort });
const toWatch = ["./src"]

function broadcast(file, event) {
  setTimeout(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        console.log(new Date(), file)
        client.send(JSON.stringify(event));
      }
    });
  }, devServerBroadcastDelay);
}

const watcher = chokidar
  .watch(toWatch, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 100,
    },
  })
  .on("error", (error) => console.error(error))
  .on("change", async (file) => {
    broadcast(file, { type: "RELOAD" });
  })
  .on("add", async (file) => {
    broadcast(file, { type: "RELOAD" });
  })
  .on("unlink", async (file) => {
    broadcast(file, { type: "RELOAD" });
  });

/**
 * Just bundling UI Stories.
 * FIXME: add linaria CSS after implementing Material so CSS will be bundled
 */
fs.writeFileSync("dist/index.html", fs.readFileSync("html/stories.html"))
fs.writeFileSync("dist/mocha.css", fs.readFileSync("node_modules/mocha/mocha.css"))
fs.writeFileSync("dist/mocha.js", fs.readFileSync("node_modules/mocha/mocha.js"))
fs.writeFileSync("dist/mocha.js.map", fs.readFileSync("node_modules/mocha/mocha.js.map"))

export const buildConfig = {
  entryPoints: ['src/main.ts', 'src/stories.tsx'],
  bundle: true,
  outdir: 'dist',
  minify: false,
  loader: {
    '.svg': 'dataurl',
  },
  target: [
    'es6'
  ],
  format: 'iife',
  platform: 'browser',
  sourcemap: true,
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
}

const server = await esbuild
  .serve({ servedir: 'dist' }, {
    ...buildConfig, outdir: 'dist'
  })
  .catch((e) => {
    console.log(e)
    process.exit(1)
  });

console.log(`Dev server is ready at http://localhost:${server.port}/.
The server is running a using websocket at ${devServerPort} to notify code change and live reload.
`);



