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
import { uniq } from "lodash";
import { AddressInfo } from "net";
import stoppable from "stoppable";
import throng from "throng";
import Logger from "./logging/Logger";
import services from "./services";
import { getArg } from "./utils/args";
import { getSSLOptions } from "./utils/ssl";
import { defaultRateLimiter } from "@server/middlewares/rateLimiter";
import { checkEnv, checkPendingMigrations } from "./utils/startup";
import { checkUpdates } from "./utils/updates";
import onerror from "./onerror";
import ShutdownHelper, { ShutdownOrder } from "./utils/ShutdownHelper";
import { sequelize } from "./database/sequelize";
import RedisAdapter from "./redis";
import Metrics from "./logging/Metrics";

// The default is to run all services to make development and OSS installations
// easier to deal with. Separate services are only needed at scale.
const serviceNames = uniq(
  env.SERVICES.split(",").map((service) => service.trim())
);

// The number of processes to run, defaults to the number of CPU's available
// for the web service, and 1 for collaboration during the beta period.
let processCount = env.WEB_CONCURRENCY;

if (serviceNames.includes("collaboration")) {
  if (processCount !== 1) {
    Logger.info(
      "lifecycle",
      "Note: Restricting process count to 1 due to use of collaborative service"
    );
  }

  processCount = 1;
}

// This function will only be called once in the original process
async function master() {
  await checkEnv();
  await checkPendingMigrations();

  if (env.TELEMETRY && env.ENVIRONMENT === "production") {
    void checkUpdates();
    setInterval(checkUpdates, 24 * 3600 * 1000);
  }
}

// This function will only be called in each forked process
async function start(id: number, disconnect: () => void) {
  // Find if SSL certs are available
  const ssl = getSSLOptions();
  const useHTTPS = !!ssl.key && !!ssl.cert;

  // If a --port flag is passed then it takes priority over the env variable
  const normalizedPortFlag = getArg("port", "p");
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
  for (const name of serviceNames) {
    if (!Object.keys(services).includes(name)) {
      throw new Error(`Unknown service ${name}`);
    }

    Logger.info("lifecycle", `Starting ${name} service`);
    const init = services[name];
    await init(app, server, serviceNames);
  }

  server.on("error", (err) => {
    throw err;
  });
  server.on("listening", () => {
    const address = server.address();

    Logger.info(
      "lifecycle",
      `Listening on ${useHTTPS ? "https" : "http"}://localhost:${
        (address as AddressInfo).port
      }`
    );
  });

  server.listen(normalizedPortFlag || env.PORT || "3000");
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

  // Handle shutdown signals
  process.once("SIGTERM", () => ShutdownHelper.execute());
  process.once("SIGINT", () => ShutdownHelper.execute());
}

void throng({
  master,
  worker: start,
  count: processCount,
});
