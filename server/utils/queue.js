// @flow
import Redis from 'ioredis';
import Queue from 'bull';
import { client, subscriber } from '../redis';

export function createQueue(name: string) {
  return new Queue(name, {
    createClient(type) {
      switch (type) {
        case 'client':
          return client;
        case 'subscriber':
          return subscriber;
        default:
          return new Redis(process.env.REDIS_URL);
      }
    },
  });
}
