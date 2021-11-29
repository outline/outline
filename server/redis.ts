import Redis from "ioredis";
import Logger from "./logging/logger";

const options = {
  maxRetriesPerRequest: 20,

  retryStrategy(times: number) {
    Logger.warn(`Retrying redis connection: attempt ${times}`);
    return Math.min(times * 100, 3000);
  },

  // support Heroku Redis, see:
  // https://devcenter.heroku.com/articles/heroku-redis#ioredis-module
  tls:
    process.env.REDIS_URL && process.env.REDIS_URL.startsWith("rediss://")
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
};
const client = new Redis(process.env.REDIS_URL, options);
const subscriber = new Redis(process.env.REDIS_URL, options);
// More than the default of 10 listeners is expected for the amount of queues
// we're running. Increase the max here to prevent a warning in the console:
// https://github.com/OptimalBits/bull/issues/1192
client.setMaxListeners(100);
subscriber.setMaxListeners(100);

export { client, subscriber };
