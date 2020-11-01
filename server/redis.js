// @flow
import Redis from "ioredis";

const options = {
  maxRetriesPerRequest: 20,
  retryStrategy(times) {
    console.warn(`Retrying redis connection: attempt ${times}`);
    return Math.min(times * 100, 3000);
  },
};

const client = new Redis(process.env.REDIS_URL, options);
const subscriber = new Redis(process.env.REDIS_URL, options);

// More than the default of 10 listeners is expected for the amount of queues
// we're running. Increase the max here to prevent a warning in the console:
// https://github.com/OptimalBits/bull/issues/1192
client.setMaxListeners(100);
subscriber.setMaxListeners(100);

export { client, subscriber };
