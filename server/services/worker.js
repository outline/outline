// @flow
import http from "http";
import Koa from "koa";
import Logger from "../logging/logger";
import {
  globalEventQueue,
  processorEventQueue,
  websocketsQueue,
  emailsQueue,
} from "../queues";
import Backlinks from "../queues/processors/backlinks";
import Debouncer from "../queues/processors/debouncer";
import Emails from "../queues/processors/emails";
import Exports from "../queues/processors/exports";
import Imports from "../queues/processors/imports";
import Notifications from "../queues/processors/notifications";
import Revisions from "../queues/processors/revisions";
import Slack from "../queues/processors/slack";

const EmailsProcessor = new Emails();

const eventProcessors = {
  backlinks: new Backlinks(),
  debouncer: new Debouncer(),
  imports: new Imports(),
  exports: new Exports(),
  notifications: new Notifications(),
  revisions: new Revisions(),
  slack: new Slack(),
};

export default function init(app: Koa, server?: http.Server) {
  // this queue processes global events and hands them off to services
  globalEventQueue.process(function (job) {
    Object.keys(eventProcessors).forEach((name) => {
      processorEventQueue.add({ ...job.data, service: name });
    });

    websocketsQueue.add(job.data);
  });

  processorEventQueue.process(function (job) {
    const event = job.data;
    const processor = eventProcessors[event.service];
    if (!processor) {
      Logger.warn(`Received event for processor that isn't registered`, event);
      return;
    }

    if (processor.on) {
      Logger.info("processor", `${event.service} processing ${event.name}`, {
        name: event.name,
        modelId: event.modelId,
      });

      processor.on(event).catch((error) => {
        Logger.error(
          `Error processing ${event.name} in ${event.service}`,
          error,
          event
        );
      });
    }
  });

  emailsQueue.process(function (job) {
    const event = job.data;

    EmailsProcessor.on(event).catch((error) => {
      Logger.error(
        `Error processing ${event.name} in emails processor`,
        error,
        event
      );
    });
  });
}
