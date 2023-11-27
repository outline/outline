/* eslint-disable @typescript-eslint/no-misused-promises */
import Queue from "bull";
import snakeCase from "lodash/snakeCase";
import { Second } from "@shared/utils/time";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import Metrics from "@server/logging/Metrics";
import Redis from "@server/storage/redis";
import ShutdownHelper, { ShutdownOrder } from "./ShutdownHelper";

export function createQueue(
  name: string,
  defaultJobOptions?: Partial<Queue.JobOptions>
) {
  const prefix = `queue.${snakeCase(name)}`;
  let processedJobsSinceCheck = 0;

  // Notes on reusing Redis connections for Bull:
  // https://github.com/OptimalBits/bull/blob/b6d530f72a774be0fd4936ddb4ad9df3b183f4b6/PATTERNS.md#reusing-redis-connections
  const queue = new Queue(name, {
    createClient(type) {
      switch (type) {
        case "client":
          return Redis.defaultClient;

        case "subscriber":
          return Redis.defaultSubscriber;

        case "bclient":
          return new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: null,
            connectionNameSuffix: "bull",
          });

        default:
          throw new Error(`Unexpected connection type: ${type}`);
      }
    },
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: true,
      ...defaultJobOptions,
    },
  });
  queue.on("stalled", () => {
    Metrics.increment(`${prefix}.jobs.stalled`);
  });
  queue.on("completed", () => {
    Metrics.increment(`${prefix}.jobs.completed`);
  });
  queue.on("error", () => {
    Metrics.increment(`${prefix}.jobs.errored`);
  });
  queue.on("failed", () => {
    Metrics.increment(`${prefix}.jobs.failed`);
  });
  queue.on("active", () => {
    processedJobsSinceCheck += 1;
  });

  if (env.ENVIRONMENT !== "test") {
    setInterval(async () => {
      Metrics.gauge(`${prefix}.count`, await queue.count());
      Metrics.gauge(`${prefix}.delayed_count`, await queue.getDelayedCount());
    }, 5 * Second);

    setInterval(async () => {
      if (processedJobsSinceCheck > 0) {
        processedJobsSinceCheck = 0;
        return;
      }

      processedJobsSinceCheck = 0;
      const waiting = await queue.getWaitingCount();
      if (waiting > 50) {
        Logger.fatal(
          "Queue has stopped processing jobs",
          new Error(`${waiting} jobs are waiting in the ${name} queue`)
        );
      }
    }, 30 * Second);
  }

  ShutdownHelper.add(name, ShutdownOrder.normal, async () => {
    await queue.close();
  });

  return queue;
}
