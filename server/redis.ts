import Redis from "ioredis";
import { defaults } from "lodash";
import Logger from "./logging/logger";

const defaultOptions = {
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

function newRedisClient(url: string | undefined): Redis.Redis {
  if (!(url || "").startsWith("ioredis://")) {
    return new Redis(process.env.REDIS_URL, defaultOptions);
  }

  const decodedString = Buffer.from(url!.slice(10), "base64").toString();
  const customOptions = JSON.parse(decodedString);
  const mergedOptions = defaults(defaultOptions, customOptions);

  return new Redis(mergedOptions);
}

const client = newRedisClient(process.env.REDIS_URL);
const subscriber = newRedisClient(process.env.REDIS_URL);

// More than the default of 10 listeners is expected for the amount of queues
// we're running. Increase the max here to prevent a warning in the console:
// https://github.com/OptimalBits/bull/issues/1192
client.setMaxListeners(100);
subscriber.setMaxListeners(100);

export { client, subscriber, newRedisClient };
