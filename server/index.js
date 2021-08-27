// @flow
import env from "./env"; // eslint-disable-line import/order
import http from "http";
import debug from "debug";
import Koa from "koa";
import compress from "koa-compress";
import helmet from "koa-helmet";
import logger from "koa-logger";
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
// e.g. services=web,worker
const normalizedServiceFlag = process.argv
  .slice(2)
  .filter((arg) => arg.startsWith("--services="))
  .map((arg) => arg.split("=")[1])
  .join(",");

// Set is used here to ensure that the array of services is unique
const serviceNames = [
  ...new Set(
    (normalizedServiceFlag || env.SERVICES || "web,websockets,worker")
      .split(",")
      .map((service) => service.trim())
  ),
];

async function start() {
  const app = new Koa();
  const server = http.createServer(app.callback());
  const log = debug("http");

  app.use(logger((str, args) => log(str)));
  app.use(compress());
  app.use(helmet());

  const initializers = serviceNames.map((name) => {
    if (["web", "websockets", "worker"].includes(name)) {
      return services[name];
    }
    throw new Error(`Unknown service ${name}`);
  });

  for (const init of initializers) {
    await init(app, server);
  }

  server.on("error", (err) => {
    throw err;
  });

  server.on("listening", () => {
    const address = server.address();
    console.log(`\n> Listening on http://localhost:${address.port}\n`);
  });

  server.listen(env.PORT || "3000");
}

throng({
  worker: start,

  // The number of workers to run, defaults to the number of CPUs available
  count: process.env.WEB_CONCURRENCY || undefined,
});

if (env.ENABLE_UPDATES !== "false" && process.env.NODE_ENV === "production") {
  checkUpdates();
  setInterval(checkUpdates, 24 * 3600 * 1000);
}
