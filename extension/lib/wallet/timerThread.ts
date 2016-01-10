/**
 * This file should be used as a WebWorker.
 * Background pages in the WebExtensions model do
 * not allow to schedule callbacks that should be called
 * after a timeout.  We can emulate this with WebWorkers.
 */

onmessage = function(e) {
  self.setInterval(() => postMessage(true, "timerThread"), e.data.interval);
};