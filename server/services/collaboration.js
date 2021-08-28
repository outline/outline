// @flow
import http from "http";
import { Logger } from "@hocuspocus/extension-logger";
import { Server } from "@hocuspocus/server";
import Koa from "koa";
import websocket from "koa-easy-ws";
import Router from "koa-router";
import AuthenticationExtension from "../collaboration/authentication";
import PersistenceExtension from "../collaboration/persistence";

export default function init(app: Koa, server: http.Server) {
  const router = new Router();

  const hocuspocus = Server.configure({
    extensions: [
      new AuthenticationExtension(),
      new PersistenceExtension(),
      new Logger(),
    ],
  });

  // Websockets for collaborative editing
  router.get("/collaboration/:documentName", async (ctx) => {
    let { documentName } = ctx.params;

    if (ctx.ws) {
      const ws = await ctx.ws();
      hocuspocus.handleConnection(ws, ctx.request, documentName);
    }

    ctx.body = "this is a websocket route";
    ctx.response.status = 400;
  });

  app.use(websocket());
  app.use(router.routes());
  app.use(router.allowedMethods());
}
