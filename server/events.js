// @flow
import Queue from 'bull';
import services from './services';
import { Collection, Document, Integration } from './models';

type DocumentEvent = {
  name: | 'documents.create' // eslint-disable-line
    | 'documents.publish'
    | 'documents.update'
    | 'documents.move'
    | 'documents.delete'
    | 'documents.pin'
    | 'documents.unpin'
    | 'documents.archive'
    | 'documents.restore'
    | 'documents.star'
    | 'documents.unstar',
  model: Document,
  actorId: string,
};

type CollectionEvent = {
  name: 'collections.create' | 'collections.update' | 'collections.delete',
  model: Collection,
  actorId: string,
};

type IntegrationEvent = {
  name: 'integrations.create' | 'integrations.update' | 'collections.delete',
  model: Integration,
  actorId: string,
};

export type Event = DocumentEvent | CollectionEvent | IntegrationEvent;

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
