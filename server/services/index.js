// @flow
import * as Sentry from "@sentry/node";
import debug from "debug";
import Backlinks from "../services/backlinks";
import Debouncer from "../services/debouncer";
import Importer from "../services/importer";
import Notifications from "../services/notifications";
import Revisions from "../services/revisions";
import Slack from "../services/slack";

const services = {
  backlinks: new Backlinks(),
  debouncer: new Debouncer(),
  importer: new Importer(),
  notifications: new Notifications(),
  revisions: new Revisions(),
  slack: new Slack(),
};

const log = debug("services");

export default async function serviceEventProcessor(job: any) {
  const event = job.data;
  const service = services[event.service];
  if (!service) {
    console.warn(
      `Received event for service that isn't registered (${event.service})`
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
