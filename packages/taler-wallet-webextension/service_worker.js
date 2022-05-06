/* eslint-disable no-undef */
/**
 * Wrapper to catch any initialization error and show it in the logs
 */
try {
  importScripts("dist/background.js");
  self.skipWaiting();
  console.log("SERVICE WORKER init: ok");
} catch (e) {
  console.error("SERVICE WORKER failed:", e);
}
