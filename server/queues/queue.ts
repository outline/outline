import type { JobsOptions, Processor, WorkerOptions } from "bullmq";
import { Queue, QueueEvents, Worker } from "bullmq";
import { snakeCase } from "es-toolkit/compat";
import { toError } from "@shared/utils/error";
import { Second } from "@shared/utils/time";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import Metrics from "@server/logging/Metrics";
import Redis from "@server/storage/redis";
import ShutdownHelper, { ShutdownOrder } from "@server/utils/ShutdownHelper";

/**
 * The Redis key prefix for all queue data. Deliberately different from the
 * "bull" prefix used before the BullMQ migration, as the data structures are
 * incompatible – legacy workers must never pick up BullMQ jobs or vice versa.
 */
const keyPrefix = "bmq";

let blockingConnection: Redis | undefined;

/**
 * A shared Redis connection for blocking consumers (workers and queue event
 * listeners), which require maxRetriesPerRequest to be disabled and so cannot
 * share the default Redis connection. BullMQ uses this instance for regular
 * commands and internally duplicates it per consumer for blocking commands.
 */
function getBlockingConnection() {
  if (!blockingConnection) {
    blockingConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      connectionNameSuffix: "queue",
    });

    // BullMQ does not close shared connections, so disconnect it ourselves
    // once all workers and queues have finished closing.
    ShutdownHelper.add("queue-connection", ShutdownOrder.last, async () => {
      blockingConnection?.disconnect();
    });
  }
  return blockingConnection;
}

/**
 * Create a BullMQ queue for adding jobs, with metrics and graceful shutdown
 * wired up.
 *
 * @param name the name of the queue.
 * @param defaultJobOptions default options applied to every job added to the queue.
 * @returns the queue instance.
 */
export function createQueue(name: string, defaultJobOptions?: JobsOptions) {
  const prefix = `queue.${snakeCase(name)}`;

  const queue = new Queue(name, {
    prefix: keyPrefix,
    // Non-blocking queue operations can share the default Redis connection.
    connection: Redis.defaultClient,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: true,
      ...defaultJobOptions,
    },
  });

  queue.on("error", () => {
    Metrics.increment(`${prefix}.jobs.errored`);
  });

  let metricsTimer: NodeJS.Timeout | undefined;
  if (env.ENVIRONMENT !== "test") {
    metricsTimer = setInterval(async () => {
      try {
        Metrics.gauge(`${prefix}.count`, await queue.count());
        Metrics.gauge(`${prefix}.delayed_count`, await queue.getDelayedCount());
      } catch (err) {
        // A transient error querying the queue (eg Redis blip or a queue closing
        // during shutdown) should not crash the process with an unhandled rejection.
        Logger.warn("Failed to gather queue metrics", {
          queue: name,
          error: err,
        });
      }
    }, 5 * Second.ms);

    metricsTimer.unref();
  }

  ShutdownHelper.add(name, ShutdownOrder.normal, async () => {
    if (metricsTimer) {
      clearInterval(metricsTimer);
    }
    await queue.close();
  });

  return queue;
}

/**
 * Create a BullMQ queue events listener for the given queue, used to wait on
 * job results from processes other than the worker.
 *
 * @param queue the queue to listen to events from.
 * @returns the queue events instance.
 */
export function createQueueEvents(queue: Queue) {
  const name = queue.name;

  const events = new QueueEvents(name, {
    prefix: keyPrefix,
    connection: getBlockingConnection(),
  });

  events.on("error", (err) => {
    Logger.error(`Error in ${name} queue events`, toError(err));
  });

  ShutdownHelper.add(`${name}-events`, ShutdownOrder.normal, () =>
    events.close()
  );

  return events;
}

/**
 * Create a BullMQ worker to process jobs on the given queue, with metrics,
 * failure logging, and graceful shutdown wired up.
 *
 * @param queue the queue to process jobs from.
 * @param processor the function to process each job.
 * @param options additional worker options, such as concurrency.
 * @returns the worker instance.
 */
export function createWorker(
  queue: Queue,
  processor: Processor,
  options?: Partial<WorkerOptions>
) {
  const name = queue.name;
  const prefix = `queue.${snakeCase(name)}`;

  const worker = new Worker(name, processor, {
    prefix: keyPrefix,
    connection: getBlockingConnection(),
    ...options,
  });

  worker.on("stalled", () => {
    Metrics.increment(`${prefix}.jobs.stalled`);
  });
  worker.on("completed", () => {
    Metrics.increment(`${prefix}.jobs.completed`);
  });
  worker.on("error", (err) => {
    Metrics.increment(`${prefix}.jobs.errored`);
    Logger.error(`Error in ${name} queue worker`, toError(err));
  });
  worker.on("failed", (job, err) => {
    Metrics.increment(`${prefix}.jobs.failed`);

    // Report on the final attempt to avoid noise from intermediate retries.
    // Note `attemptsMade` includes the attempt that just failed.
    if (!job || job.attemptsMade >= (job.opts.attempts ?? 1)) {
      Logger.error(`Job failed in ${name} queue`, toError(err), {
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        data: job?.data,
      });
    }
  });

  // Close workers before queues so in-flight jobs finish processing first.
  ShutdownHelper.add(`${name}-worker`, ShutdownOrder.first, () =>
    worker.close()
  );

  return worker;
}
