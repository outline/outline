import http from "http";
import url from "url";
import { Server } from "@hocuspocus/server";
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
    extensions: [
      new AuthenticationExtension(),
      // @ts-expect-error ts-migrate(2322) FIXME: Type 'Persistence' is not assignable to type 'Exte... Remove this comment to see the full error message
      new PersistenceExtension(),
      // @ts-expect-error ts-migrate(2322) FIXME: Type 'CollaborationLogger' is not assignable to ty... Remove this comment to see the full error message
      new LoggerExtension(),
      // @ts-expect-error ts-migrate(2322) FIXME: Type 'Tracing' is not assignable to type 'Extensio... Remove this comment to see the full error message
      new TracingExtension(),
    ],
  });
  server.on("upgrade", function (req, socket, head) {
    // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
    if (req.url.indexOf(path) > -1) {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string | undefined' is not assig... Remove this comment to see the full error message
      const documentName = url.parse(req.url).pathname?.split("/").pop();

      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'Duplex' is not assignable to par... Remove this comment to see the full error message
      wss.handleUpgrade(req, socket, head, (client) => {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string | undefined' is not assig... Remove this comment to see the full error message
        hocuspocus.handleConnection(client, req, documentName);
      });
    }
  });
  server.on("shutdown", () => {
    hocuspocus.destroy();
  });
}
