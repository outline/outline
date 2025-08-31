import { createQueue } from "@server/queues/queue";
import { Second } from "@shared/utils/time";

export const globalEventQueue = createQueue("globalEvents", {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: Second.ms,
  },
});

export const processorEventQueue = createQueue("processorEvents", {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 10 * Second.ms,
  },
});

export const websocketQueue = createQueue("websockets", {
  timeout: 10 * Second.ms,
});

export const taskQueue = createQueue("tasks", {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 10 * Second.ms,
  },
});
