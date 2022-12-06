//`ws://localhost:8003/socket`
export function setupLiveReload(wsURL: string | undefined) {
  if (!wsURL) return;
  const ws = new WebSocket(wsURL);
  ws.addEventListener("message", (message) => {
    const event = JSON.parse(message.data);
    if (event.type === "LOG") {
      console.log(event.message);
    }
    if (event.type === "RELOAD") {
      window.location.reload();
    }
    if (event.type === "UPDATE") {
      const c = document.getElementById("container");
      if (c) {
        document.body.removeChild(c);
      }
      const d = document.createElement("div");
      d.setAttribute("id", "container");
      d.setAttribute("class", "app-container");
      document.body.appendChild(d);
      const s = document.createElement("script");
      s.setAttribute("id", "code");
      s.setAttribute("type", "application/javascript");
      s.textContent = atob(event.content);
      document.body.appendChild(s);
    }
  });
  ws.onerror = (error) => {
    console.error(error);
  };
  ws.onclose = (e) => {
    setTimeout(setupLiveReload, 500);
  };
}

export { renderStories, parseGroupImport } from "./stories.js";
