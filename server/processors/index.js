// @flow
import * as Sentry from "@sentry/node";
import debug from "debug";
import Backlinks from "../processors/backlinks";
import Debouncer from "../processors/debouncer";
import Importer from "../processors/importer";
import Notifications from "../processors/notifications";
import Revisions from "../processors/revisions";
import Slack from "../processors/slack";

const processors = {
  backlinks: new Backlinks(),
  debouncer: new Debouncer(),
  importer: new Importer(),
  notifications: new Notifications(),
  revisions: new Revisions(),
  slack: new Slack(),
};

const log = debug("processors");

export default async function serviceEventProcessor(job: any) {
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
}
