// @flow
import Redis from 'ioredis';

const client = new Redis(process.env.REDIS_URL);
const subscriber = new Redis(process.env.REDIS_URL);

// More than the default of 10 listeners is expected for the amount of queues
// we're running. Increase the max here to prevent a warning in the console:
// https://github.com/OptimalBits/bull/issues/1192
client.setMaxListeners(100);
subscriber.setMaxListeners(100);

export { client, subscriber };
