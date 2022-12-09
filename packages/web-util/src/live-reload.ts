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
      if (event.type === "file-updated-failed") {
        const h1 = document.getElementById("overlay-text")
        if (h1) {
          h1.innerHTML = "compilation failed"
          h1.style.color = 'red'
          h1.style.margin = ''
        }
        const div = document.getElementById("overlay")
        if (div) {
          const content = JSON.stringify(event.data, undefined, 2)
          const pre = document.createElement("pre");
          pre.id = "error-text"
          pre.style.margin = "";
          pre.textContent = content;
          div.style.backgroundColor = "rgba(0,0,0,0.8)";
          div.style.flexDirection = 'column'
          div.appendChild(pre);
        }
        console.error(event.data.error)
        return;
      }
      if (event.type === "file-updated") {
        window.location.reload();
        return;
      }
    } catch (e) {
      return;
    }
    console.log("unsupported", message);
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
  d.id = "overlay"
  d.style.position = "absolute";
  d.style.width = "100%";
  d.style.height = "100%";
  d.style.color = "white";
  d.style.backgroundColor = "rgba(0,0,0,0.5)";
  d.style.display = "flex";
  d.style.zIndex = String(Number.MAX_SAFE_INTEGER)
  d.style.justifyContent = "center";
  const h = document.createElement("h1");
  h.id = "overlay-text"
  h.style.margin = "auto";
  h.innerHTML = "reloading...";
  d.appendChild(h);
  if (document.body.firstChild) {
    document.body.insertBefore(d, document.body.firstChild);
  } else {
    document.body.appendChild(d);
  }
}
