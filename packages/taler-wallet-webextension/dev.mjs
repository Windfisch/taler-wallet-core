#!/usr/bin/env node
/* eslint-disable no-undef */

import linaria from '@linaria/esbuild'
import esbuild from 'esbuild'
import { buildConfig } from "./build-fast-with-linaria.mjs"
import fs from 'fs';
import WebSocket from "ws";
import chokidar from "chokidar";
import path from "path"

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


fs.writeFileSync("dev-html/manifest.json", fs.readFileSync("manifest-v2.json"))
fs.writeFileSync("dev-html/mocha.css", fs.readFileSync("node_modules/mocha/mocha.css"))
fs.writeFileSync("dev-html/mocha.js", fs.readFileSync("node_modules/mocha/mocha.js"))
fs.writeFileSync("dev-html/mocha.js.map", fs.readFileSync("node_modules/mocha/mocha.js.map"))

const server = await esbuild
  .serve({ servedir: 'dev-html' }, {
    ...buildConfig, outdir: 'dev-html/dist'
  })
  .catch((e) => {
    console.log(e)
    process.exit(1)
  });

console.log(`Dev server is ready at http://localhost:${server.port}/.
http://localhost:${server.port}/stories.html for the components stories.
The server is running a using websocket at ${devServerPort} to notify code change and live reload.
`);

