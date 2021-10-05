// @flow
import http from "http";
import { Server } from "@hocuspocus/server";
import Koa from "koa";
import websocket from "koa-easy-ws";
import Router from "koa-router";
import AuthenticationExtension from "../collaboration/authentication";
import LoggerExtension from "../collaboration/logger";
import PersistenceExtension from "../collaboration/persistence";
import TracingExtension from "../collaboration/tracing";

export default function init(app: Koa, server: http.Server) {
  const router = new Router();

  const hocuspocus = Server.configure({
    extensions: [
      new AuthenticationExtension(),
      new PersistenceExtension(),
      new LoggerExtension(),
      new TracingExtension(),
    ],
  });

  // Websockets for collaborative editing
  router.get("/collaboration/:documentName", async (ctx) => {
    let { documentName } = ctx.params;

    if (ctx.ws) {
      const ws = await ctx.ws();
      hocuspocus.handleConnection(ws, ctx.request, documentName);
    }

    ctx.response.status = 101;
  });

  app.use(websocket());
  app.use(router.routes());
  app.use(router.allowedMethods());

  server.on("shutdown", () => {
    hocuspocus.destroy();
  });
}
