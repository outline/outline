// @flow
import Queue from "bull";
import Redis from "ioredis";
import { snakeCase } from "lodash";
import { client, subscriber } from "../redis";
import Sentry from "../sentry";
import * as metrics from "../utils/metrics";

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
    metrics.increment(`${prefix}.jobs.stalled`);
  });

  queue.on("completed", () => {
    metrics.increment(`${prefix}.jobs.completed`);
  });

  queue.on("error", (err) => {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    } else {
      console.error(err);
    }
    metrics.increment(`${prefix}.jobs.errored`);
  });

  queue.on("failed", () => {
    metrics.increment(`${prefix}.jobs.failed`);
  });

  setInterval(async () => {
    metrics.gauge(`${prefix}.count`, await queue.count());
    metrics.gauge(`${prefix}.delayed_count`, await queue.getDelayedCount());
  }, 5 * 1000);

  return queue;
}
