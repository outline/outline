// @flow
import http from "http";
import debug from "debug";
import Koa from "koa";
import {
  globalEventsQueue,
  serviceEventsQueue,
  websocketsQueue,
} from "../queues";
import Backlinks from "../queues/processors/backlinks";
import Debouncer from "../queues/processors/debouncer";
import Importer from "../queues/processors/importer";
import Notifications from "../queues/processors/notifications";
import Revisions from "../queues/processors/revisions";
import Slack from "../queues/processors/slack";
import Sentry from "../sentry";

const log = debug("queue");

const processors = {
  backlinks: new Backlinks(),
  debouncer: new Debouncer(),
  importer: new Importer(),
  notifications: new Notifications(),
  revisions: new Revisions(),
  slack: new Slack(),
};

export default function init(app: Koa, server: http.Server) {
  // this queue processes global events and hands them off to services
  globalEventsQueue.process("global", function globalEventProcessor(job) {
    Object.keys(processors).forEach((name) => {
      serviceEventsQueue.add(
        { ...job.data, service: name },
        { removeOnComplete: true }
      );
    });

    websocketsQueue.add(job.data, { removeOnComplete: true });
  });

  serviceEventsQueue.process("service", function serviceEventProcessor(job) {
    const event = job.data;
    const service = processors[event.service];
    if (!service) {
      console.warn(
        `Received event for processor that isn't registered (${event.service})`
      );
      return;
    }

    if (service.on) {
      log(`${event.service} processing ${event.name}`);

      service.on(event).catch((error) => {
        if (process.env.SENTRY_DSN) {
          Sentry.withScope(function (scope) {
            scope.setExtra("event", event);
            Sentry.captureException(error);
          });
        } else {
          throw error;
        }
      });
    }
  });
}
