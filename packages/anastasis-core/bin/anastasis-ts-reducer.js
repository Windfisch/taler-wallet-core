#!/usr/bin/env node

async function r() {
  (await import("../dist/anastasis-cli.js")).reducerCliMain();
}

r();
