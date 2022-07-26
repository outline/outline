/* eslint-disable import/order */
import env from "./env";

import "./logging/tracing"; // must come before importing any instrumented module

import http from "http";
import https from "https";
import Koa from "koa";
import compress from "koa-compress";
import helmet from "koa-helmet";
import logger from "koa-logger";
import onerror from "koa-onerror";
import Router from "koa-router";
import { uniq } from "lodash";
import { AddressInfo } from "net";
import stoppable from "stoppable";
import throng from "throng";
import Logger from "./logging/Logger";
import { requestErrorHandler } from "./logging/sentry";
import services from "./services";
import { getArg } from "./utils/args";
import { getSSLOptions } from "./utils/ssl";
import {
  checkEnv,
  checkMigrations,
  checkPendingMigrations,
} from "./utils/startup";
import { checkUpdates } from "./utils/updates";

// If a services flag is passed it takes priority over the environment variable
// for example: --services=web,worker
const normalizedServiceFlag = getArg("services");

// The default is to run all services to make development and OSS installations
// easier to deal with. Separate services are only needed at scale.
const serviceNames = uniq(
  (normalizedServiceFlag || env.SERVICES)
    .split(",")
    .map((service) => service.trim())
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
  checkPendingMigrations();
  await checkMigrations();

  if (env.TELEMETRY && env.ENVIRONMENT === "production") {
    checkUpdates();
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
      : http.createServer(app.callback())
  );
  const router = new Router();

  // install basic middleware shared by all services
  if (env.DEBUG.includes("http")) {
    app.use(logger((str) => Logger.info("http", str)));
  }

  app.use(compress());
  app.use(helmet());

  // catch errors in one place, automatically set status and response headers
  onerror(app);
  app.on("error", requestErrorHandler);

  // install health check endpoint for all services
  router.get("/_health", (ctx) => (ctx.body = "OK"));
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
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  function shutdown() {
    Logger.info("lifecycle", "Stopping server");
    server.emit("shutdown");
    server.stop(disconnect);
  }
}

throng({
  master,
  worker: start,
  count: processCount,
});
