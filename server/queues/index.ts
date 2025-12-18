import { createQueue } from "@server/queues/queue";
import { Second } from "@shared/utils/time";

let _globalEventQueue: ReturnType<typeof createQueue> | undefined;
export const globalEventQueue = () => {
  if (!_globalEventQueue) {
    _globalEventQueue = createQueue("globalEvents", {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: Second.ms,
      },
    });
  }
  return _globalEventQueue;
};

let _processorEventQueue: ReturnType<typeof createQueue> | undefined;
export const processorEventQueue = () => {
  if (!_processorEventQueue) {
    _processorEventQueue = createQueue("processorEvents", {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 10 * Second.ms,
      },
    });
  }
  return _processorEventQueue;
};

let _websocketQueue: ReturnType<typeof createQueue> | undefined;
export const websocketQueue = () => {
  if (!_websocketQueue) {
    _websocketQueue = createQueue("websockets", {
      timeout: 10 * Second.ms,
    });
  }
  return _websocketQueue;
};

let _taskQueue: ReturnType<typeof createQueue> | undefined;
export const taskQueue = () => {
  if (!_taskQueue) {
    _taskQueue = createQueue("tasks", {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 10 * Second.ms,
      },
    });
  }
  return _taskQueue;
};
