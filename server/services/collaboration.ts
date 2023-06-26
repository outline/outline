import http, { IncomingMessage } from "http";
import { Duplex } from "stream";
import url from "url";
import { Throttle } from "@hocuspocus/extension-throttle";
import { Server } from "@hocuspocus/server";
import Koa from "koa";
import WebSocket from "ws";
import { DocumentValidation } from "@shared/validations";
import { ConnectionLimitExtension } from "@server/collaboration/ConnectionLimitExtension";
import { ViewsExtension } from "@server/collaboration/ViewsExtension";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import ShutdownHelper, { ShutdownOrder } from "@server/utils/ShutdownHelper";
import AuthenticationExtension from "../collaboration/AuthenticationExtension";
import LoggerExtension from "../collaboration/LoggerExtension";
import MetricsExtension from "../collaboration/MetricsExtension";
import PersistenceExtension from "../collaboration/PersistenceExtension";

export default function init(
  app: Koa,
  server: http.Server,
  serviceNames: string[]
) {
  const path = "/collaboration";
  const wss = new WebSocket.Server({
    noServer: true,
    maxPayload: DocumentValidation.maxStateLength,
  });

  const hocuspocus = Server.configure({
    debounce: 3000,
    timeout: 30000,
    maxDebounce: 10000,
    extensions: [
      new Throttle({
        throttle: env.RATE_LIMITER_COLLABORATION_REQUESTS,
        consideredSeconds: env.RATE_LIMITER_DURATION_WINDOW,
        // Ban time is defined in minutes
        banTime: 5,
      }),
      new ConnectionLimitExtension(),
      new AuthenticationExtension(),
      new PersistenceExtension(),
      new ViewsExtension(),
      new LoggerExtension(),
      new MetricsExtension(),
    ],
  });

  server.on(
    "upgrade",
    function (req: IncomingMessage, socket: Duplex, head: Buffer) {
      if (req.url?.startsWith(path)) {
        // parse document id and close connection if not present in request
        const documentId = url
          .parse(req.url)
          .pathname?.replace(path, "")
          .split("/")
          .pop();

        if (documentId) {
          wss.handleUpgrade(req, socket, head, (client) => {
            // Handle websocket connection errors as soon as the client is upgraded
            client.on("error", (error) => {
              Logger.error(
                `Websocket error`,
                error,
                {
                  documentId,
                },
                req
              );
            });

            hocuspocus.handleConnection(client, req, documentId);
          });
          return;
        }
      }

      if (
        req.url?.startsWith("/realtime") &&
        serviceNames.includes("websockets")
      ) {
        // Nothing to do, the websockets service will handle this request
        return;
      }

      // If the collaboration service is running it will close the connection
      socket.end(`HTTP/1.1 400 Bad Request\r\n`);
    }
  );

  ShutdownHelper.add("collaboration", ShutdownOrder.normal, () =>
    hocuspocus.destroy()
  );
}
