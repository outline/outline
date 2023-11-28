import { createQueue } from "@server/queues/queue";

export const globalEventQueue = createQueue("globalEvents", {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 1000,
  },
});

export const processorEventQueue = createQueue("processorEvents", {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 10 * 1000,
  },
});

export const websocketQueue = createQueue("websockets", {
  timeout: 10 * 1000,
});

export const taskQueue = createQueue("tasks", {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 10 * 1000,
  },
});
