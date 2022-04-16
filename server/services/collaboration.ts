import http from "http";
import url from "url";
import { Server } from "@hocuspocus/server";
import invariant from "invariant";
import Koa from "koa";
import WebSocket from "ws";
import AuthenticationExtension from "../collaboration/authentication";
import LoggerExtension from "../collaboration/logger";
import PersistenceExtension from "../collaboration/persistence";
import TracingExtension from "../collaboration/tracing";

export default function init(app: Koa, server: http.Server) {
  const path = "/collaboration";
  const wss = new WebSocket.Server({
    noServer: true,
  });

  const hocuspocus = Server.configure({
    debounce: 3000,
    maxDebounce: 10000,
    extensions: [
      new AuthenticationExtension(),
      new PersistenceExtension(),
      new LoggerExtension(),
      new TracingExtension(),
    ],
  });

  server.on("upgrade", function (req, socket, head) {
    if (req.url && req.url.indexOf(path) > -1) {
      const documentName = url.parse(req.url).pathname?.split("/").pop();
      invariant(documentName, "Document name must be provided");

      wss.handleUpgrade(req, socket, head, (client) => {
        hocuspocus.handleConnection(client, req, documentName);
      });
    }
  });

  server.on("shutdown", () => {
    return hocuspocus.destroy();
  });
}
