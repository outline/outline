// @flow
import env from "./env"; // eslint-disable-line import/order
import http from "http";
import debug from "debug";
import Koa from "koa";
import compress from "koa-compress";
import helmet from "koa-helmet";
import logger from "koa-logger";
import onerror from "koa-onerror";
import { uniq } from "lodash";
import throng from "throng";
import services from "./services";
import { initTracing } from "./tracing";
import { getArg } from "./utils/args";
import { requestErrorHandler } from "./utils/sentry";
import { checkEnv, checkMigrations } from "./utils/startup";
import { checkUpdates } from "./utils/updates";

checkEnv();
initTracing();
checkMigrations();

// If a --port flag is passed then it takes priority over the env variable
const normalizedPortFlag = getArg("port", "p");

// If a services flag is passed it takes priority over the enviroment variable
// for example: --services=web,worker
const normalizedServiceFlag = getArg("services");

// The default is to run all services to make development and OSS installations
// easier to deal with. Separate services are only needed at scale.
const serviceNames = uniq(
  (normalizedServiceFlag || env.SERVICES || "websockets,worker,web")
    .split(",")
    .map((service) => service.trim())
);

async function start() {
  const app = new Koa();
  const server = http.createServer(app.callback());
  const httpLogger = debug("http");
  const log = debug("server");

  app.use(logger((str, args) => httpLogger(str)));
  app.use(compress());
  app.use(helmet());

  // catch errors in one place, automatically set status and response headers
  onerror(app);
  app.on("error", requestErrorHandler);

  if (
    serviceNames.includes("websockets") &&
    serviceNames.includes("collaboration")
  ) {
    throw new Error(
      "Cannot run websockets and collaboration services in the same process"
    );
  }

  // loop through requestsed services at startup
  for (const name of serviceNames) {
    if (!Object.keys(services).includes(name)) {
      throw new Error(`Unknown service ${name}`);
    }

    log(`Starting ${name} service`);
    const init = services[name];
    await init(app, server);
  }

  server.on("error", (err) => {
    throw err;
  });

  server.on("listening", () => {
    const address = server.address();
    console.log(`\n> Listening on http://localhost:${address.port}\n`);
  });

  server.listen(normalizedPortFlag || env.PORT || "3000");
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
