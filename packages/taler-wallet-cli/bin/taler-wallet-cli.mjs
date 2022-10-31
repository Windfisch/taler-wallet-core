#!/usr/bin/env node

import { main } from '../lib/index.js';

async function run() {
  try {
    (await import('source-map-support')).install();
  } catch (e) {
    // Do nothing.
  }
  main();
}

run();

