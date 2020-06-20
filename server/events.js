// @flow
import * as Sentry from "@sentry/node";
import { createQueue } from "./utils/queue";
import services from "./services";

export type UserEvent =
  | {
  name: | 'users.create' // eslint-disable-line
        | "users.update"
        | "users.suspend"
        | "users.activate"
        | "users.delete",
      userId: string,
      teamId: string,
      actorId: string,
    }
  | {
      name: "users.invite",
      teamId: string,
      actorId: string,
      data: {
        email: string,
        name: string,
      },
    };

export type DocumentEvent =
  | {
  name: | 'documents.create' // eslint-disable-line
        | "documents.publish"
        | "documents.delete"
        | "documents.pin"
        | "documents.unpin"
        | "documents.archive"
        | "documents.unarchive"
        | "documents.restore"
        | "documents.star"
        | "documents.unstar",
      documentId: string,
      collectionId: string,
      teamId: string,
      actorId: string,
    }
  | {
      name: "documents.move",
      documentId: string,
      collectionId: string,
      teamId: string,
      actorId: string,
      data: {
        collectionIds: string[],
        documentIds: string[],
      },
    }
  | {
      name: "documents.update",
      documentId: string,
      collectionId: string,
      teamId: string,
      actorId: string,
      data: {
        autosave: boolean,
        done: boolean,
      },
    };

export type CollectionEvent =
  | {
  name: | 'collections.create' // eslint-disable-line
        | "collections.update"
        | "collections.delete",
      collectionId: string,
      teamId: string,
      actorId: string,
    }
  | {
      name: "collections.add_user" | "collections.remove_user",
      userId: string,
      collectionId: string,
      teamId: string,
      actorId: string,
    }
  | {
      name: "collections.add_group" | "collections.remove_group",
      collectionId: string,
      teamId: string,
      actorId: string,
      data: { name: string, groupId: string },
      ip: string,
    };

export type GroupEvent =
  | {
      name: "groups.create" | "groups.delete" | "groups.update",
      actorId: string,
      modelId: string,
      teamId: string,
      data: { name: string },
      ip: string,
    }
  | {
      name: "groups.add_user" | "groups.remove_user",
      actorId: string,
      userId: string,
      modelId: string,
      teamId: string,
      data: { name: string },
      ip: string,
    };

export type IntegrationEvent = {
  name: "integrations.create" | "integrations.update",
  modelId: string,
  teamId: string,
  actorId: string,
};

export type Event =
  | UserEvent
  | DocumentEvent
  | CollectionEvent
  | IntegrationEvent
  | GroupEvent;

const globalEventsQueue = createQueue("global events");
const serviceEventsQueue = createQueue("service events");

// this queue processes global events and hands them off to service hooks
globalEventsQueue.process(async job => {
  const names = Object.keys(services);
  names.forEach(name => {
    const service = services[name];
    if (service.on) {
      serviceEventsQueue.add(
        { service: name, ...job.data },
        { removeOnComplete: true }
      );
    }
  });
});

// this queue processes an individual event for a specific service
serviceEventsQueue.process(async job => {
  const event = job.data;
  const service = services[event.service];

  if (service.on) {
    service.on(event).catch(error => {
      if (process.env.SENTRY_DSN) {
        Sentry.withScope(function(scope) {
          scope.setExtra("event", event);
          Sentry.captureException(error);
        });
      } else {
        throw error;
      }
    });
  }
});

export default globalEventsQueue;
