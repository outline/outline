import env from "@server/env";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import Router from "koa-router";

if (env.HEADER_AUTH_ENABLED && env.HEADER_AUTH_LOGIN_URL) {
  let url = env.HEADER_AUTH_LOGIN_URL;
  let router = new Router().get("header", async (ctx) => { ctx.redirect(url); });
  PluginManager.add({
    ...config,
    type: Hook.AuthProvider,
    name: env.HEADER_AUTH_LOGIN_NAME,
    value: { router, id: "header" },
  });
}
