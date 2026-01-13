/* oxlint-disable @typescript-eslint/no-misused-promises */
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
  const metricsPrefix = `queue.${snakeCase(name)}`;

  // Bull's prefix for Redis keys. If REDIS_KEY_PREFIX is set, prepend it to
  // the default 'bull' prefix, otherwise use 'bull' as the default.
  const bullKeyPrefix = env.REDIS_KEY_PREFIX
    ? `${env.REDIS_KEY_PREFIX}:bull`
    : "bull";

  // Notes on reusing Redis connections for Bull:
  // https://github.com/OptimalBits/bull/blob/b6d530f72a774be0fd4936ddb4ad9df3b183f4b6/PATTERNS.md#reusing-redis-connections
  const queue = new Queue(name, {
    prefix: bullKeyPrefix,
    createClient(type) {
      switch (type) {
        case "client":
          return Redis.defaultBullClient;

        case "subscriber":
          return Redis.defaultBullSubscriber;

        case "bclient":
          return new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: null,
            connectionNameSuffix: "bull",
            skipKeyPrefix: true,
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
    Metrics.increment(`${metricsPrefix}.jobs.stalled`);
  });
  queue.on("completed", () => {
    Metrics.increment(`${metricsPrefix}.jobs.completed`);
  });
  queue.on("error", () => {
    Metrics.increment(`${metricsPrefix}.jobs.errored`);
  });
  queue.on("failed", () => {
    Metrics.increment(`${metricsPrefix}.jobs.failed`);
  });

  if (env.ENVIRONMENT !== "test") {
    setInterval(async () => {
      Metrics.gauge(`${metricsPrefix}.count`, await queue.count());
      Metrics.gauge(`${metricsPrefix}.delayed_count`, await queue.getDelayedCount());
    }, 5 * Second.ms);
  }

  ShutdownHelper.add(name, ShutdownOrder.normal, async () => {
    await queue.close();
  });

  return queue;
}
