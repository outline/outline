// @flow
import env from "./env"; // eslint-disable-line import/order
import http from "http";
import debug from "debug";
import Koa from "koa";
import compress from "koa-compress";
import helmet from "koa-helmet";
import logger from "koa-logger";
import Router from "koa-router";
import { uniq } from "lodash";
import stoppable from "stoppable";
import throng from "throng";
import "./sentry";
import services from "./services";
import { initTracing } from "./tracing";
import { checkEnv, checkMigrations } from "./utils/startup";
import { checkUpdates } from "./utils/updates";

checkEnv();
initTracing();
checkMigrations();

// If a services flag is passed it takes priority over the enviroment variable
// for example: --services=web,worker
const normalizedServiceFlag = process.argv
  .slice(2)
  .filter((arg) => arg.startsWith("--services="))
  .map((arg) => arg.split("=")[1])
  .join(",");

// The default is to run all services to make development and OSS installations
// easier to deal with. Separate services are only needed at scale.
const serviceNames = uniq(
  (normalizedServiceFlag || env.SERVICES || "web,websockets,worker")
    .split(",")
    .map((service) => service.trim())
);

async function start(id, disconnect) {
  const app = new Koa();
  const server = stoppable(http.createServer(app.callback()));
  const httpLogger = debug("http");
  const log = debug("server");
  const router = new Router();

  // install basic middleware shared by all services
  app.use(logger((str, args) => httpLogger(str)));
  app.use(compress());
  app.use(helmet());

  // loop through requestsed services at startup
  for (const name of serviceNames) {
    if (!Object.keys(services).includes(name)) {
      throw new Error(`Unknown service ${name}`);
    }

    log(`Starting ${name} service`);
    const init = services[name];
    await init(app, server);
  }

  // install health check endpoint for all services
  router.get("/_health", (ctx) => (ctx.body = "OK"));
  app.use(router.routes());

  server.on("error", (err) => {
    throw err;
  });

  server.on("listening", () => {
    const address = server.address();
    console.log(`\n> Listening on http://localhost:${address.port}\n`);
  });

  server.listen(env.PORT || "3000");

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  function shutdown() {
    console.log("\n> Stopping server");
    server.stop(disconnect);
  }
}

throng({
  worker: start,

  // The number of workers to run, defaults to the number of CPU's available
  count: process.env.WEB_CONCURRENCY || undefined,
});

if (env.ENABLE_UPDATES !== "false" && process.env.NODE_ENV === "production") {
  checkUpdates();
  setInterval(checkUpdates, 24 * 3600 * 1000);
}
