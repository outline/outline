import { toError } from "@shared/utils/error";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { setResource, addTags } from "@server/logging/tracer";
import { traceFunction } from "@server/logging/tracing";
import HealthMonitor from "@server/queues/HealthMonitor";
import { createWorker } from "@server/queues/queue";
import type { Event } from "@server/types";
import { initI18n } from "@server/utils/i18n";
import {
  globalEventQueue,
  processorEventQueue,
  websocketQueue,
  taskQueue,
} from "../queues";
import processors from "../queues/processors";
import tasks from "../queues/tasks";

export default async function init() {
  await initI18n();

  // This queue processes the global event bus
  const globalEventsWorker = createWorker(
    globalEventQueue(),
    traceFunction({
      serviceName: "worker",
      spanName: "process",
      isRoot: true,
    })(async function (job) {
      const event = job.data as Event | undefined;
      let err;

      // The queue can hand us an orphaned job whose hash was already deleted
      // by removeOnComplete/removeOnFail (data deserializes to `{}`). Discard
      // it rather than crashing.
      if (!event?.name) {
        Logger.warn("Discarding malformed job in globalEventQueue", {
          data: job.data,
        });
        return;
      }

      setResource(`Event.${event.name}`);

      Logger.info("worker", `Processing ${event.name}`, {
        event,
        attempt: job.attemptsMade,
      });

      // For each registered processor we check to see if it wants to handle the
      // event (applicableEvents), and if so add a new queued job specifically
      // for that processor.
      for (const name in processors) {
        const ProcessorClass = processors[name];

        if (!ProcessorClass) {
          throw new Error(
            `Received event "${event.name}" for processor (${name}) that isn't registered. Check the file name matches the class name.`
          );
        }

        try {
          if (name === "WebsocketsProcessor") {
            // websockets are a special case on their own queue because they must
            // only be consumed by the websockets service rather than workers.
            await websocketQueue().add(event.name, event);
          } else if (
            ProcessorClass.applicableEvents.includes(event.name) ||
            ProcessorClass.applicableEvents.includes("*")
          ) {
            // A processor may optionally opt out of an event before a job is
            // created, avoiding the cost of an empty job.
            if (
              !ProcessorClass.shouldQueue ||
              (await ProcessorClass.shouldQueue(event))
            ) {
              await processorEventQueue().add(name, { event });
            }
          }
        } catch (error) {
          Logger.error(
            `Error adding ${event.name} to ${name} queue`,
            toError(error),
            event
          );
          err = error;
        }
      }

      if (err) {
        throw err;
      }
    }),
    {
      concurrency: env.WORKER_CONCURRENCY_EVENTS,
    }
  );

  // Jobs for individual processors are processed here. Only applicable events
  // as unapplicable events were filtered in the global event queue above.
  const processorEventsWorker = createWorker(
    processorEventQueue(),
    traceFunction({
      serviceName: "worker",
      spanName: "process",
      isRoot: true,
    })(async function (job) {
      const { name } = job;
      const { event } = job.data ?? {};

      // The queue can hand us an orphaned job whose hash was already deleted
      // by removeOnComplete/removeOnFail (data deserializes to `{}`). Discard
      // it rather than crashing.
      if (!event || !name) {
        Logger.warn("Discarding malformed job in processorEventQueue", {
          data: job.data,
        });
        return;
      }

      const ProcessorClass = processors[name];

      setResource(`Processor.${name}`);
      addTags({ event });

      if (!ProcessorClass) {
        throw new Error(
          `Received event "${event.name}" for processor (${name}) that isn't registered. Check the file name matches the class name.`
        );
      }

      // @ts-expect-error We will not instantiate an abstract class
      const processor = new ProcessorClass();

      if (processor.perform) {
        Logger.info("worker", `${name} running ${event.name}`, {
          event,
        });

        try {
          await processor.perform(event);
        } catch (err) {
          // last attempt has failed.
          if (job.attemptsMade + 1 >= (job.opts.attempts || 1)) {
            await processor.onFailed(event).catch(); // suppress exception from 'onFailed'.
          }

          Logger.error(
            `Error processing ${event.name} in ${name}`,
            toError(err),
            event
          );
          throw err;
        }
      }
    }),
    {
      concurrency: env.WORKER_CONCURRENCY_EVENTS,
    }
  );

  // Jobs for async tasks are processed here.
  const tasksWorker = createWorker(
    taskQueue(),
    traceFunction({
      serviceName: "worker",
      spanName: "process",
      isRoot: true,
    })(async function (job) {
      const { name } = job;
      const { props } = job.data;
      const TaskClass = tasks[name];

      setResource(`Task.${name}`);
      addTags({ props });

      if (!TaskClass) {
        throw new Error(
          `Task "${name}" is not registered. Check the file name matches the class name.`
        );
      }

      Logger.info("worker", `${name} running`, props);

      // @ts-expect-error We will not instantiate an abstract class
      const task = new TaskClass();

      try {
        return await task.perform(props);
      } catch (err) {
        // last attempt has failed.
        if (job.attemptsMade + 1 >= (job.opts.attempts || 1)) {
          await task.onFailed(props).catch(); // suppress exception from 'onFailed'.
        }

        Logger.error(`Error processing task in ${name}`, toError(err), props);
        throw err;
      }
    }),
    {
      concurrency: env.WORKER_CONCURRENCY_TASKS,
    }
  );

  HealthMonitor.start(globalEventQueue(), globalEventsWorker);
  HealthMonitor.start(processorEventQueue(), processorEventsWorker);
  HealthMonitor.start(taskQueue(), tasksWorker);
}
