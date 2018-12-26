// @flow
import redis from 'redis';
import redisLock from 'redis-lock';

const client = redis.createClient(process.env.REDIS_URL);
const lock = redisLock(client);

const asyncLock = (lockName: string): * =>
  new Promise(resolve => lock(lockName, unlock => resolve(unlock)));

export { client, asyncLock };
