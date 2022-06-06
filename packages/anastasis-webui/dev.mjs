#!/usr/bin/env node
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


fs.writeFileSync("dist/stories.html", fs.readFileSync("stories.html"))
fs.writeFileSync("dist/mocha.css", fs.readFileSync("node_modules/mocha/mocha.css"))
fs.writeFileSync("dist/mocha.js", fs.readFileSync("node_modules/mocha/mocha.js"))
fs.writeFileSync("dist/mocha.js.map", fs.readFileSync("node_modules/mocha/mocha.js.map"))

export const buildConfig = {
  entryPoints: ['src/stories.tsx'],
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
http://localhost:${server.port}/stories.html for the components stories.
The server is running a using websocket at ${devServerPort} to notify code change and live reload.
`);



