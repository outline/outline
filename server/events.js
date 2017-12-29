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
const queue = new Queue('events', process.env.REDIS_URL);

queue.process(async function(job) {
  const names = Object.keys(services);
  names.forEach(name => {
    const service = services[name];
    if (service.on) {
      const event = job.data;
      log(`Triggering ${event.name} for ${service.name}`);
      service.on(event);
    }
  });
});

export default queue;
