import Queue from "bull";
import { snakeCase } from "lodash";
import env from "@server/env";
import Metrics from "@server/logging/metrics";
import Redis from "../redis";

export function createQueue(
  name: string,
  defaultJobOptions?: Partial<Queue.JobOptions>
) {
  const prefix = `queue.${snakeCase(name)}`;
  const queue = new Queue(name, {
    createClient(type) {
      switch (type) {
        case "client":
          return Redis.defaultClient;

        case "subscriber":
          return Redis.defaultSubscriber;

        default:
          return new Redis(env.REDIS_URL);
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
  setInterval(async () => {
    Metrics.gauge(`${prefix}.count`, await queue.count());
    Metrics.gauge(`${prefix}.delayed_count`, await queue.getDelayedCount());
  }, 5 * 1000);
  return queue;
}
