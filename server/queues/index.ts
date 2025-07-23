import { createQueue } from "@server/queues/queue";

let _globalEventQueue: ReturnType<typeof createQueue> | undefined;
let _processorEventQueue: ReturnType<typeof createQueue> | undefined;
let _websocketQueue: ReturnType<typeof createQueue> | undefined;
let _taskQueue: ReturnType<typeof createQueue> | undefined;

export const globalEventQueue = new Proxy(
  {} as ReturnType<typeof createQueue>,
  {
    get(_target, prop) {
      _globalEventQueue ||= createQueue("globalEvents", {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      });
      return _globalEventQueue[prop as keyof typeof _globalEventQueue];
    },
  }
);

export const processorEventQueue = new Proxy(
  {} as ReturnType<typeof createQueue>,
  {
    get(_target, prop) {
      _processorEventQueue ||= createQueue("processorEvents", {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 10 * 1000,
        },
      });
      return _processorEventQueue[prop as keyof typeof _processorEventQueue];
    },
  }
);

export const websocketQueue = new Proxy({} as ReturnType<typeof createQueue>, {
  get(_target, prop) {
    _websocketQueue ||= createQueue("websockets", {
      timeout: 10 * 1000,
    });
    return _websocketQueue[prop as keyof typeof _websocketQueue];
  },
});

export const taskQueue = new Proxy({} as ReturnType<typeof createQueue>, {
  get(_target, prop) {
    _taskQueue ||= createQueue("tasks", {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 10 * 1000,
      },
    });
    return _taskQueue[prop as keyof typeof _taskQueue];
  },
});
