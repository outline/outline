/* oxlint-disable @typescript-eslint/no-misused-promises */
/* oxlint-disable import/order */
import "./logging/tracer"; // must come before importing any instrumented module

import os from "node:os";
import throng from "throng";
import env from "./env";
import Logger from "./logging/Logger";
import {
  printEnv,
  checkPendingMigrations,
  configureChildHeapLimit,
} from "./utils/startup";

// The number of processes to run, defaults to the number of CPU's available
// for the web service, and 1 for collaboration unless REDIS_COLLABORATION_URL is set.
let webProcessCount = env.WEB_CONCURRENCY;

if (env.SERVICES.includes("collaboration") && !env.REDIS_COLLABORATION_URL) {
  if (webProcessCount !== 1) {
    Logger.info(
      "lifecycle",
      "Note: Restricting process count to 1 due to use of collaborative service without REDIS_COLLABORATION_URL"
    );
  }

  webProcessCount = 1;
}

// This function will only be called once in the original process. The database
// connection and migration checks run in a short-lived child process so that
// the long-lived master never loads the (heavy) Sequelize models graph.
async function master() {
  await checkPendingMigrations();
  await printEnv();
}

const isWebProcess =
  env.SERVICES.includes("web") ||
  env.SERVICES.includes("api") ||
  env.SERVICES.includes("collaboration");

const isWorkerProcess =
  env.SERVICES.length === 1 && env.SERVICES.includes("worker");

// Mirrors the `count` passed to throng below, where undefined falls back to
// throng's default of one process per CPU.
const processCount = isWorkerProcess
  ? 1
  : isWebProcess
    ? (webProcessCount ?? os.cpus().length)
    : os.cpus().length;

configureChildHeapLimit(processCount);

void throng({
  master,
  // The worker's heavy dependency graph is loaded lazily so it never enters the
  // master process, which only supervises the forked workers.
  worker: (id, disconnect) =>
    import("./main").then(({ start }) => start(id, disconnect)),
  count: isWorkerProcess ? 1 : isWebProcess ? webProcessCount : undefined,
});
