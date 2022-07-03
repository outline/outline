import http, { IncomingMessage } from "http";
import { Duplex } from "stream";
import url from "url";
import { Server } from "@hocuspocus/server";
import invariant from "invariant";
import Koa from "koa";
import WebSocket from "ws";
import Logger from "@server/logging/Logger";
import AuthenticationExtension from "../collaboration/AuthenticationExtension";
import LoggerExtension from "../collaboration/LoggerExtension";
import MetricsExtension from "../collaboration/MetricsExtension";
import PersistenceExtension from "../collaboration/PersistenceExtension";

export default function init(app: Koa, server: http.Server) {
  const path = "/collaboration";
  const wss = new WebSocket.Server({
    noServer: true,
  });

  const hocuspocus = Server.configure({
    debounce: 3000,
    timeout: 30000,
    maxDebounce: 10000,
    extensions: [
      new AuthenticationExtension(),
      new PersistenceExtension(),
      new LoggerExtension(),
      new MetricsExtension(),
    ],
  });

  server.on("upgrade", function (
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ) {
    if (req.url?.startsWith(path)) {
      const documentName = url
        .parse(req.url)
        .pathname?.replace(path, "")
        .split("/")
        .pop();
      invariant(documentName, "Document name must be provided");

      wss.handleUpgrade(req, socket, head, (client) => {
        // Handle websocket connection errors as soon as the client is upgraded
        client.on("error", (error) => {
          Logger.error(
            `Websocket error`,
            error,
            {
              documentName,
            },
            req
          );
        });

        hocuspocus.handleConnection(client, req, documentName);
      });
    }
  });

  server.on("shutdown", () => {
    return hocuspocus.destroy();
  });
}
