#!/usr/bin/env node

import { main } from '../dist/taler-wallet-cli.js';

async function run() {
  try {
    (await import('source-map-support')).install();
  } catch (e) {
    // Do nothing.
  }
  main();
}

run();

