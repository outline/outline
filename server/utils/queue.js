// @flow
import Queue from "bull";
import Redis from "ioredis";
import { snakeCase } from "lodash";
import { client, subscriber } from "../redis";
import * as metrics from "../utils/metrics";

export function createQueue(name: string) {
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
  });

  queue.on("completed", () => {
    metrics.increment("events.completed", 1, {
      queue: name,
    });
  });

  queue.on("error", () => {
    metrics.increment("events.errored", 1, {
      queue: name,
    });
  });

  queue.on("failed", () => {
    metrics.increment("events.failed", 1, {
      queue: name,
    });
  });

  setInterval(async () => {
    metrics.gauge(`queue.${snakeCase(name)}.count`, await queue.count());
    metrics.gauge(
      `queue.${snakeCase(name)}.delayed_count`,
      await queue.getDelayedCount()
    );
  }, 5 * 1000);

  return queue;
}
