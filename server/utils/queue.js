// @flow
import Queue from "bull";
import Redis from "ioredis";
import { snakeCase } from "lodash";
import Metrics from "../logging/metrics";
import { client, subscriber } from "../redis";

export function createQueue(name: string) {
  const prefix = `queue.${snakeCase(name)}`;
  const queue = new Queue(name, {
    createClient(type) {
      switch (type) {
        case "client":
          return client;
        case "subscriber":
          return subscriber;
        default:
          return new Redis(process.env.REDIS_URL);
      }
    },
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: true,
    },
  });

  queue.on("stalled", () => {
    Metrics.increment(`${prefix}.jobs.stalled`);
  });

  queue.on("completed", () => {
    Metrics.increment(`${prefix}.jobs.completed`);
  });

  queue.on("error", (err) => {
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
