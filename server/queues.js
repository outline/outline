// @flow
import path from "path";
import { createQueue } from "./utils/queue";

export const globalEventsQueue = createQueue("global events");
export const serviceEventsQueue = createQueue("service events");
export const websocketsQueue = createQueue("websocket events");

// this queue processes global events and hands them off to services
globalEventsQueue.process(async function globalEventsProcessor(job) {
  [
    "backlinks",
    "debouncer",
    "importer",
    "notifications",
    "revisions",
    "slack",
  ].forEach((name) => {
    serviceEventsQueue.add(
      { ...job.data, service: name },
      { removeOnComplete: true }
    );
  });

  websocketsQueue.add(job.data, { removeOnComplete: true });
});

serviceEventsQueue.process(
  path.resolve(path.join(__dirname, "/processors/index.js"))
);
