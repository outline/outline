// @flow
import http from "http";
import debug from "debug";
import Koa from "koa";
import compress from "koa-compress";
import helmet from "koa-helmet";
import logger from "koa-logger";
import onerror from "koa-onerror";
import Router from "koa-router";
import stoppable from "stoppable";
import env from "./env";
import services from "./services";
import { getArg } from "./utils/args";
import { requestErrorHandler } from "./utils/sentry";

const start = (serviceNames: string[]) => async (
  id: string,
  disconnect: () => void
) => {
  // If a --port flag is passed then it takes priority over the env variable
  const normalizedPortFlag = getArg("port", "p");

  const app = new Koa();
  const server = stoppable(http.createServer(app.callback()));
  const httpLogger = debug("http");
  const log = debug("server");
  const router = new Router();

  // install basic middleware shared by all services
  app.use(logger((str, args) => httpLogger(str)));
  app.use(compress());
  app.use(helmet());

  // catch errors in one place, automatically set status and response headers
  onerror(app);
  app.on("error", requestErrorHandler);

  // install health check endpoint for all services
  router.get("/_health", (ctx) => (ctx.body = "OK"));
  app.use(router.routes());

  if (
    serviceNames.includes("websockets") &&
    serviceNames.includes("collaboration")
  ) {
    throw new Error(
      "Cannot run websockets and collaboration services in the same process"
    );
  }

  // loop through requested services at startup
  for (const name of serviceNames) {
    if (!Object.keys(services).includes(name)) {
      throw new Error(`Unknown service ${name}`);
    }

    log(`Starting ${name} service…`);
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

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  function shutdown() {
    console.log("\n> Stopping server");
    server.stop(disconnect);
  }
};

export default start;
