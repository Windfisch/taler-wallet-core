onmessage = function(e) {
  self.setInterval(() => postMessage(true), e.data.interval);
}
