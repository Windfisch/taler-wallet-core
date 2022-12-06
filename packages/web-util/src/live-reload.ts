/* eslint-disable no-undef */

function setupLiveReload(): void {
  const ws = new WebSocket("wss://localhost:8080/ws");

  ws.addEventListener("message", (message) => {
    try {
      const event = JSON.parse(message.data);
      if (event.type === "file-updated-start") {
        showReloadOverlay();
        return;
      }
      if (event.type === "file-updated-done") {
        window.location.reload();
        return;
      }
    } catch (e) {
      return;
    }
    console.log("unsupported", event);
  });

  ws.addEventListener("error", (error) => {
    console.error(error);
  });
  ws.addEventListener("close", (message) => {
    setTimeout(setupLiveReload, 1500);
  });
}
setupLiveReload();

function showReloadOverlay(): void {
  const d = document.createElement("div");
  d.style.position = "absolute";
  d.style.width = "100%";
  d.style.height = "100%";
  d.style.color = "white";
  d.style.backgroundColor = "rgba(0,0,0,0.5)";
  d.style.display = "flex";
  d.style.justifyContent = "center";
  const h = document.createElement("h1");
  h.style.margin = "auto";
  h.innerHTML = "reloading...";
  d.appendChild(h);
  if (document.body.firstChild) {
    document.body.insertBefore(d, document.body.firstChild);
  } else {
    document.body.appendChild(d);
  }
}
