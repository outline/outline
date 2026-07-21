import type { QueueEvents } from "bullmq";
import { createQueue, createQueueEvents } from "@server/queues/queue";
import { Second } from "@shared/utils/time";

let cachedGlobalEventQueue: ReturnType<typeof createQueue> | undefined;
export const globalEventQueue = () => {
  if (!cachedGlobalEventQueue) {
    cachedGlobalEventQueue = createQueue("globalEvents", {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: Second.ms,
      },
    });
  }
  return cachedGlobalEventQueue;
};

let cachedProcessorEventQueue: ReturnType<typeof createQueue> | undefined;
export const processorEventQueue = () => {
  if (!cachedProcessorEventQueue) {
    cachedProcessorEventQueue = createQueue("processorEvents", {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 10 * Second.ms,
      },
    });
  }
  return cachedProcessorEventQueue;
};

let cachedWebsocketQueue: ReturnType<typeof createQueue> | undefined;
export const websocketQueue = () => {
  if (!cachedWebsocketQueue) {
    cachedWebsocketQueue = createQueue("websockets");
  }
  return cachedWebsocketQueue;
};

let cachedTaskQueue: ReturnType<typeof createQueue> | undefined;
export const taskQueue = () => {
  if (!cachedTaskQueue) {
    cachedTaskQueue = createQueue("tasks", {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 10 * Second.ms,
      },
    });
  }
  return cachedTaskQueue;
};

let cachedTaskQueueEvents: QueueEvents | undefined;

/**
 * Events listener for the task queue, used to wait on job results with
 * `job.waitUntilFinished`. Resolves once the listener is connected, so jobs
 * scheduled afterwards cannot miss their completion events.
 *
 * @returns A promise resolving to the queue events instance.
 */
export const taskQueueEvents = async () => {
  if (!cachedTaskQueueEvents) {
    cachedTaskQueueEvents = createQueueEvents(taskQueue());
  }
  await cachedTaskQueueEvents.waitUntilReady();
  return cachedTaskQueueEvents;
};
