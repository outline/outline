/* oxlint-disable @typescript-eslint/no-misused-promises */
import http from "node:http";
import https from "node:https";
import type { AddressInfo } from "node:net";
import Koa from "koa";
import helmet from "koa-helmet";
import logger from "koa-logger";
import Router from "koa-router";
import stoppable from "stoppable";
import { toError } from "@shared/utils/error";
import env from "./env";
import Metrics from "@server/logging/Metrics";
import Redis from "@server/storage/redis";
import Logger from "./logging/Logger";
import { defaultRateLimiter } from "@server/middlewares/rateLimiter";
import onerror from "./onerror";
import services from "./services";
import { sequelize } from "./storage/database";
import { getArg } from "./utils/args";
import { CacheHelper } from "./utils/CacheHelper";
import { PluginManager } from "./utils/PluginManager";
import { redirectOnClient } from "./utils/redirectOnClient";
import { RedisPrefixHelper } from "./utils/RedisPrefixHelper";
import ShutdownHelper, { ShutdownOrder } from "./utils/ShutdownHelper";
import { getSSLOptions } from "./utils/ssl";
import { checkUpdates } from "./utils/updates";

/**
 * Starts a single forked service process. This is where the heavy dependency
 * graph (Sequelize models, services, middleware) is loaded, so it is imported
 * dynamically from the entry point to keep the supervising master process lean.
 *
 * @param id the cluster worker id assigned by throng.
 * @param disconnect callback used to signal the worker has stopped.
 */
export async function start(id: number, disconnect: () => void) {
  // Ensure plugins are loaded
  PluginManager.loadPlugins();

  // Clear unfurl cache in development so code changes take effect immediately
  if (env.isDevelopment) {
    void CacheHelper.clearData(RedisPrefixHelper.getUnfurlKey(""));
  }

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

  // Allow browser-side redirects that include the user's auth cookies.
  app.context.redirectOnClient = redirectOnClient;

  // Add a health check endpoint to all services
  router.get("/_health", async (ctx) => {
    try {
      await sequelize.query("SELECT 1");
    } catch (err) {
      Logger.error("Database connection failed", toError(err));
      ctx.status = 500;
      return;
    }

    try {
      await Redis.defaultClient.ping();
    } catch (err) {
      Logger.error("Redis ping failed", toError(err));
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
    const { default: init } = await services[name as keyof typeof services]();
    await Promise.resolve(init(app, server as https.Server, env.SERVICES));
  }

  server.on("error", (err) => {
    if ("code" in err && err.code === "EADDRINUSE") {
      Logger.error(`Port ${normalizedPort} is already in use. Exiting…`, err);
      process.exit(1);
    }

    if ("code" in err && err.code === "EACCES") {
      Logger.error(
        `Port ${normalizedPort} requires elevated privileges. Exiting…`,
        err
      );
      process.exit(1);
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

  // Run telemetry from a single worker only. This keeps the supervising master
  // process free of the models graph that the update check requires, while
  // avoiding duplicate reporting when multiple workers are running.
  if (id === 1 && env.TELEMETRY && env.isProduction) {
    void checkUpdates();
    setInterval(checkUpdates, 24 * 3600 * 1000).unref();
  }

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
