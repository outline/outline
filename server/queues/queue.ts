/* eslint-disable @typescript-eslint/no-misused-promises */
import Queue from "bull";
import snakeCase from "lodash/snakeCase";
import { Second } from "@shared/utils/time";
import env from "@server/env";
import Metrics from "@server/logging/Metrics";
import Redis from "@server/storage/redis";
import ShutdownHelper, { ShutdownOrder } from "@server/utils/ShutdownHelper";

export function createQueue(
  name: string,
  defaultJobOptions?: Partial<Queue.JobOptions>
) {
  const prefix = `queue.${snakeCase(name)}`;

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

  if (env.ENVIRONMENT !== "test") {
    setInterval(async () => {
      Metrics.gauge(`${prefix}.count`, await queue.count());
      Metrics.gauge(`${prefix}.delayed_count`, await queue.getDelayedCount());
    }, 5 * Second.ms);
  }

  ShutdownHelper.add(name, ShutdownOrder.normal, async () => {
    await queue.close();
  });

  return queue;
}
