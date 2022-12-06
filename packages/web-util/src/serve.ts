import { Logger } from "@gnu-taler/taler-util";
import chokidar from "chokidar";
import express from "express";
import https from "https";
import { parse } from "url";
import WebSocket, { Server } from "ws";

import locahostCrt from "./keys/localhost.crt";
import locahostKey from "./keys/localhost.key";
import storiesHtml from "./stories.html";

import path from "path";

const httpServerOptions = {
  key: locahostKey,
  cert: locahostCrt,
};

const logger = new Logger("serve.ts");

const PATHS = {
  WS: "/ws",
  NOTIFY: "/notify",
  EXAMPLE: "/examples",
  APP: "/app",
};

export async function serve(opts: {
  folder: string;
  port: number;
  source?: string;
  development?: boolean;
  examplesLocationJs?: string;
  examplesLocationCss?: string;
  onUpdate?: () => Promise<void>;
}): Promise<void> {
  const app = express();

  app.use(PATHS.APP, express.static(opts.folder));
  const server = https.createServer(httpServerOptions, app);
  server.listen(opts.port);
  logger.info(`serving ${opts.folder} on ${opts.port}`);
  logger.info(`  ${PATHS.APP}: application`);
  logger.info(`  ${PATHS.EXAMPLE}: examples`);
  logger.info(`  ${PATHS.WS}: websocket`);
  logger.info(`  ${PATHS.NOTIFY}: broadcast`);

  if (opts.development) {
    const wss = new Server({ noServer: true });

    wss.on("connection", function connection(ws) {
      ws.send("welcome");
    });

    server.on("upgrade", function upgrade(request, socket, head) {
      const { pathname } = parse(request.url || "");
      if (pathname === PATHS.WS) {
        wss.handleUpgrade(request, socket, head, function done(ws) {
          wss.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    const sendToAllClients = function (data: object): void {
      wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    };
    const watchingFolder = opts.source ?? opts.folder;
    logger.info(`watching ${watchingFolder} for change`);

    chokidar.watch(watchingFolder).on("change", (path, stats) => {
      logger.trace(`changed ${path}`);

      sendToAllClients({ type: "file-updated-start", data: { path } });
      if (opts.onUpdate) {
        opts.onUpdate().then((result) => {
          sendToAllClients({
            type: "file-updated-done",
            data: { path, result },
          });
        });
      } else {
        sendToAllClients({ type: "file-change-done", data: { path } });
      }
    });

    app.get(PATHS.EXAMPLE, function (req: any, res: any) {
      res.set("Content-Type", "text/html");
      res.send(
        storiesHtml
          .replace(
            "__EXAMPLES_JS_FILE_LOCATION__",
            opts.examplesLocationJs ?? `.${PATHS.APP}/stories.js`,
          )
          .replace(
            "__EXAMPLES_CSS_FILE_LOCATION__",
            opts.examplesLocationCss ?? `.${PATHS.APP}/stories.css`,
          ),
      );
    });

    app.get(PATHS.NOTIFY, function (req: any, res: any) {
      res.send("ok");
    });
  }
}
