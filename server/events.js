// @flow
import fs from 'fs-extra';
import path from 'path';
import Queue from 'bull';
import debug from 'debug';

export type Event = {
  name: string,
  model: Object,
};

const log = debug('events');
const queue = new Queue('events', process.env.REDIS_URL);
const services = [];

fs
  .readdirSync(path.join(__dirname, 'services'))
  .filter(file => file.indexOf('.') !== 0)
  .forEach(file => {
    // $FlowIssue
    const service = require(path.join(__dirname, 'services', file)).default;
    services.push(service);
    log(`Loaded service: ${service.name}`);
  });

queue.process(async function(job) {
  services.forEach(service => {
    if (service.on) {
      const event = job.data;
      log(`Triggering ${event.name} for ${service.name}`);
      service.on(event);
    }
  });
});

export default queue;
