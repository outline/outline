import type { IncomingMessage } from "http";
import type http from "http";
import type { Duplex } from "stream";
import url from "url";
import { Redis } from "@hocuspocus/extension-redis";
import { Throttle } from "@hocuspocus/extension-throttle";
import { Server } from "@hocuspocus/server";
import type Koa from "koa";
import WebSocket from "ws";
import { DocumentValidation } from "@shared/validations";
import { APIUpdateExtension } from "@server/collaboration/APIUpdateExtension";
import { ConnectionLimitExtension } from "@server/collaboration/ConnectionLimitExtension";
import { ViewsExtension } from "@server/collaboration/ViewsExtension";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import RedisAdapter from "@server/storage/redis";
import ShutdownHelper, { ShutdownOrder } from "@server/utils/ShutdownHelper";
import AuthenticationExtension from "../collaboration/AuthenticationExtension";
import { EditorVersionExtension } from "../collaboration/EditorVersionExtension";
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

  // Handle WebSocket server errors to prevent crashes when maxPayload is exceeded
  wss.on("error", (error) => {
    Logger.error("WebSocket server error", error);
  });

  const hocuspocus = Server.configure({
    debounce: 3000,
    timeout: 30000,
    maxDebounce: 10000,
    extensions: [
      ...(env.REDIS_COLLABORATION_URL
        ? [
            new Redis({
              redis: RedisAdapter.collaborationClient,
            }),
          ]
        : []),
      new Throttle({
        throttle: env.RATE_LIMITER_COLLABORATION_REQUESTS,
        consideredSeconds: env.RATE_LIMITER_DURATION_WINDOW,
        // Ban time is defined in minutes
        banTime: 5,
      }),
      new ConnectionLimitExtension(),
      new EditorVersionExtension(),
      new AuthenticationExtension(),
      new PersistenceExtension(),
      new APIUpdateExtension(),
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
          // Handle socket errors that may occur during upgrade (e.g., maxPayload exceeded)
          socket.on("error", (error) => {
            Logger.error(
              "Socket error during WebSocket upgrade",
              error,
              {
                documentId,
              },
              req
            );
          });

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
