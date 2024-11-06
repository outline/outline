/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable import/order */
import env from "./env";

import "./logging/tracer"; // must come before importing any instrumented module

import http from "http";
import https from "https";
import Koa from "koa";
import helmet from "koa-helmet";
import logger from "koa-logger";
import Router from "koa-router";
import { AddressInfo } from "net";
import stoppable from "stoppable";
import throng from "throng";
import Logger from "./logging/Logger";
import services from "./services";
import { getArg } from "./utils/args";
import { getSSLOptions } from "./utils/ssl";
import { defaultRateLimiter } from "@server/middlewares/rateLimiter";
import { printEnv, checkPendingMigrations } from "./utils/startup";
import { checkUpdates } from "./utils/updates";
import onerror from "./onerror";
import ShutdownHelper, { ShutdownOrder } from "./utils/ShutdownHelper";
import { checkConnection, sequelize } from "./storage/database";
import RedisAdapter from "./storage/redis";
import Metrics from "./logging/Metrics";
import { PluginManager } from "./utils/PluginManager";

// The number of processes to run, defaults to the number of CPU's available
// for the web service, and 1 for collaboration during the beta period.
let webProcessCount = env.WEB_CONCURRENCY;

if (env.SERVICES.includes("collaboration")) {
  if (webProcessCount !== 1) {
    Logger.info(
      "lifecycle",
      "Note: Restricting process count to 1 due to use of collaborative service"
    );
  }

  webProcessCount = 1;
}

// This function will only be called once in the original process
async function master() {
  await checkConnection(sequelize);
  await checkPendingMigrations();
  await printEnv();

  if (env.TELEMETRY && env.isProduction) {
    void checkUpdates();
    setInterval(checkUpdates, 24 * 3600 * 1000);
  }
}

// This function will only be called in each forked process
async function start(_id: number, disconnect: () => void) {
  // Ensure plugins are loaded
  PluginManager.loadPlugins();

  // Find if SSL certs are available
  const ssl = getSSLOptions();
  const useHTTPS = !!ssl.key && !!ssl.cert;

  // If a --port flag is passed then it takes priority over the env variable
  const normalizedPort = getArg("port", "p") || env.PORT;
  const app = new Koa();
  const server = stoppable(
    useHTTPS
      ? https.createServer(ssl, app.callback())
      : http.createServer(app.callback()),
    ShutdownHelper.connectionGraceTimeout
  );
  const router = new Router();

  // install basic middleware shared by all services
  if (env.DEBUG.includes("http")) {
    app.use(logger((str) => Logger.info("http", str)));
  }

  app.use(helmet());

  // catch errors in one place, automatically set status and response headers
  onerror(app);

  // Apply default rate limit to all routes
  app.use(defaultRateLimiter());

  /** Perform a redirect on the browser so that the user's auth cookies are included in the request. */
  app.context.redirectOnClient = function (url: string) {
    this.type = "text/html";
    this.body = `
<html>
<head>
<meta http-equiv="refresh" content="0;URL='${url}'"/>
</head>`;
  };

  // Add a health check endpoint to all services
  router.get("/_health", async (ctx) => {
    try {
      await sequelize.query("SELECT 1");
    } catch (err) {
      Logger.error("Database connection failed", err);
      ctx.status = 500;
      return;
    }

    try {
      await RedisAdapter.defaultClient.ping();
    } catch (err) {
      Logger.error("Redis ping failed", err);
      ctx.status = 500;
      return;
    }

    ctx.body = "OK";
  });

  app.use(router.routes());

  // loop through requested services at startup
  for (const name of env.SERVICES) {
    if (!Object.keys(services).includes(name)) {
      throw new Error(`Unknown service ${name}`);
    }

    Logger.info("lifecycle", `Starting ${name} service`);
    const init = services[name as keyof typeof services];
    init(app, server as https.Server, env.SERVICES);
  }

  server.on("error", (err) => {
    if ("code" in err && err.code === "EADDRINUSE") {
      Logger.error(`Port ${normalizedPort}  is already in use. Exiting…`, err);
      process.exit(0);
    }

    if ("code" in err && err.code === "EACCES") {
      Logger.error(
        `Port ${normalizedPort} requires elevated privileges. Exiting…`,
        err
      );
      process.exit(0);
    }

    throw err;
  });
  server.on("listening", () => {
    const address = server.address();
    const port = (address as AddressInfo).port;

    Logger.info(
      "lifecycle",
      `Listening on ${useHTTPS ? "https" : "http"}://localhost:${port} / ${
        env.URL
      }`
    );
  });

  server.listen(normalizedPort);
  server.setTimeout(env.REQUEST_TIMEOUT);

  ShutdownHelper.add(
    "server",
    ShutdownOrder.last,
    () =>
      new Promise((resolve, reject) => {
        // Calling stop prevents new connections from being accepted and waits for
        // existing connections to close for the grace period before forcefully
        // closing them.
        server.stop((err, gracefully) => {
          disconnect();

          if (err) {
            reject(err);
          } else {
            resolve(gracefully);
          }
        });
      })
  );

  ShutdownHelper.add("metrics", ShutdownOrder.last, () => Metrics.flush());

  // Handle uncaught promise rejections
  process.on("unhandledRejection", (error: Error) => {
    Logger.error("Unhandled promise rejection", error, {
      stack: error.stack,
    });
  });

  // Handle shutdown signals
  process.once("SIGTERM", () => ShutdownHelper.execute());
  process.once("SIGINT", () => ShutdownHelper.execute());
}

const isWebProcess =
  env.SERVICES.includes("web") ||
  env.SERVICES.includes("api") ||
  env.SERVICES.includes("collaboration");

void throng({
  master,
  worker: start,
  count: isWebProcess ? webProcessCount : undefined,
});
