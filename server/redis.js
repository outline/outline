// @flow
import redis from 'redis';

const client = redis.createClient(process.env.REDIS_URL);

export { client };
