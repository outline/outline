// @flow
import Queue from 'bull';
import services from './services';

export type UserEvent =
  | {
  name: | 'users.create' // eslint-disable-line
        | 'users.update'
        | 'users.suspend'
        | 'users.activate'
        | 'users.delete',
      modelId: string,
      teamId: string,
      actorId: string,
    }
  | {
      name: 'users.invite',
      teamId: string,
      actorId: string,
      email: string,
    };

export type DocumentEvent =
  | {
  name: | 'documents.create' // eslint-disable-line
        | 'documents.publish'
        | 'documents.delete'
        | 'documents.pin'
        | 'documents.unpin'
        | 'documents.archive'
        | 'documents.unarchive'
        | 'documents.restore'
        | 'documents.star'
        | 'documents.unstar',
      modelId: string,
      collectionId: string,
      teamId: string,
      actorId: string,
    }
  | {
      name: 'documents.move',
      modelId: string,
      collectionIds: string[],
      documentIds: string[],
      teamId: string,
      actorId: string,
    }
  | {
      name: 'documents.update',
      modelId: string,
      collectionId: string,
      teamId: string,
      actorId: string,
      autosave: boolean,
      done: boolean,
    };

export type CollectionEvent =
  | {
  name: | 'collections.create' // eslint-disable-line
        | 'collections.update'
        | 'collections.delete',
      modelId: string,
      teamId: string,
      actorId: string,
    }
  | {
      name: 'collections.add_user' | 'collections.remove_user',
      modelId: string,
      collectionId: string,
      teamId: string,
      actorId: string,
    };

export type IntegrationEvent = {
  name: 'integrations.create' | 'integrations.update' | 'collections.delete',
  modelId: string,
  teamId: string,
  actorId: string,
};

export type Event =
  | UserEvent
  | DocumentEvent
  | CollectionEvent
  | IntegrationEvent;

const globalEventsQueue = new Queue('global events', process.env.REDIS_URL);
const serviceEventsQueue = new Queue('service events', process.env.REDIS_URL);

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
    service.on(event);
  }
});

export default globalEventsQueue;
