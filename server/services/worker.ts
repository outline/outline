import Logger from "@server/logging/logger";
import { APM } from "@server/logging/tracing";
import {
  globalEventQueue,
  processorEventQueue,
  websocketQueue,
  taskQueue,
} from "../queues";
import processors from "../queues/processors";
import tasks from "../queues/tasks";

export default function init() {
  // This queue processes the global event bus
  globalEventQueue.process(
    APM.traceFunction({
      serviceName: "worker",
      spanName: "processGlobalEvent",
      isRoot: true,
    })(function (job) {
      const event = job.data;

      // For each registered processor we check to see if it wants to handle the
      // event (applicableEvents), and if so add a new queued job specifically
      // for that processor.
      for (const name in processors) {
        const ProcessorClass = processors[name];

        if (name === "WebsocketsProcessor") {
          // websockets are a special case on their own queue because they must
          // only be consumed by the websockets service rather than workers.
          websocketQueue.add(job.data);
        } else if (
          ProcessorClass.applicableEvents.length === 0 ||
          ProcessorClass.applicableEvents.includes(event.name)
        ) {
          processorEventQueue.add({ event, name });
        }
      }
    })
  );

  // Jobs for individual processors are processed here. Only applicable events
  // as unapplicable events were filtered in the global event queue above.
  processorEventQueue.process(
    APM.traceFunction({
      serviceName: "worker",
      spanName: "processEvent",
      isRoot: true,
    })(function (job) {
      const { event, name } = job.data;
      const ProcessorClass = processors[name];

      if (!ProcessorClass) {
        throw new Error(
          `Received event "${event.name}" for processor (${name}) that isn't registered. Check the file name matches the class name.`
        );
      }

      const processor = new ProcessorClass();

      if (processor.perform) {
        Logger.info("processor", `${name} processing ${event.name}`, {
          name: event.name,
          modelId: event.modelId,
        });
        processor.perform(event).catch((error: Error) => {
          Logger.error(
            `Error processing ${event.name} in ${name}`,
            error,
            event
          );
        });
      }
    })
  );

  // Jobs for async tasks are processed here.
  taskQueue.process(
    APM.traceFunction({
      serviceName: "worker",
      spanName: "processTask",
      isRoot: true,
    })(function (job) {
      const { name, props } = job.data;
      const TaskClass = tasks[name];

      if (!TaskClass) {
        throw new Error(
          `Task "${name}" is not registered. Check the file name matches the class name.`
        );
      }

      Logger.info("task", `${name} triggered`, props);

      const task = new TaskClass();
      task.perform(props).catch((error: Error) => {
        Logger.error(`Error processing task  in ${name}`, error, props);
      });
    })
  );
}
