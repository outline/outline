// @flow
import env from "./env"; // eslint-disable-line import/order
import "./tracing"; // must come before importing any instrumented module

import { uniq } from "lodash";
import throng from "throng";
import start from "./start";
import { getArg } from "./utils/args";
import { checkEnv, checkMigrations } from "./utils/startup";
import { checkUpdates } from "./utils/updates";

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

// The number of processes to run, defaults to the number of CPU's available
// for the web service, and 1 for collaboration during the beta period.
const processCount = serviceNames.includes("collaboration")
  ? 1
  : env.WEB_CONCURRENCY || undefined;

// This function will only be called once in the original process
function master() {
  checkEnv();
  checkMigrations();

  if (env.ENABLE_UPDATES !== "false" && process.env.NODE_ENV === "production") {
    checkUpdates();
    setInterval(checkUpdates, 24 * 3600 * 1000);
  }
}

throng({
  master,
  worker: start(serviceNames),
  count: processCount,
});
