// @flow
import Queue from 'bull';
import debug from 'debug';
import services from '../services';
import Document from './models/Document';
import Collection from './models/Collection';

type DocumentEvent = {
  name: 'documents.create',
  model: Document,
};

type CollectionEvent = {
  name: 'collections.create',
  model: Collection,
};

export type Event = DocumentEvent | CollectionEvent;

const log = debug('events');
const globalEventsQueue = new Queue('global events', process.env.REDIS_URL);
const serviceEventsQueue = new Queue('service events', process.env.REDIS_URL);

// this queue processes global events and hands them off to service hooks
globalEventsQueue.process(async function(job) {
  const names = Object.keys(services);
  names.forEach(name => {
    const service = services[name];
    if (service.on) {
      serviceEventsQueue.add({ service: name, ...job.data });
    }
  });
});

// this queue processes an individual event for a specific service
serviceEventsQueue.process(async function(job) {
  const event = job.data;
  const service = services[event.service];

  if (service.on) {
    log(`Triggering ${event.name} for ${service.name}`);
    service.on(event);
  }
});

export default globalEventsQueue;
