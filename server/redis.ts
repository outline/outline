import Redis from "ioredis";
import { defaults } from "lodash";
import env from "@server/env";
import Logger from "@server/logging/Logger";

const defaultOptions = {
  maxRetriesPerRequest: 20,

  retryStrategy(times: number) {
    Logger.warn(`Retrying redis connection: attempt ${times}`);
    return Math.min(times * 100, 3000);
  },

  // support Heroku Redis, see:
  // https://devcenter.heroku.com/articles/heroku-redis#ioredis-module
  tls: (env.REDIS_URL || "").startsWith("rediss://")
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
};

export default class RedisAdapter extends Redis {
  constructor(url: string | undefined) {
    if (!url || !url.startsWith("ioredis://")) {
      super(env.REDIS_URL, defaultOptions);
    } else {
      let customOptions = {};
      try {
        const decodedString = Buffer.from(url.slice(10), "base64").toString();
        customOptions = JSON.parse(decodedString);
      } catch (error) {
        throw new Error(`Failed to decode redis adapter options: ${error}`);
      }

      try {
        const mergedOptions = defaults(defaultOptions, customOptions);
        super(mergedOptions);
      } catch (error) {
        throw new Error(`Failed to initialize redis client: ${error}`);
      }
    }

    // More than the default of 10 listeners is expected for the amount of queues
    // we're running. Increase the max here to prevent a warning in the console:
    // https://github.com/OptimalBits/bull/issues/1192
    this.setMaxListeners(100);
  }

  private static _client: RedisAdapter;
  private static _subscriber: RedisAdapter;

  public static get defaultClient(): RedisAdapter {
    return this._client || (this._client = new this(env.REDIS_URL));
  }

  public static get defaultSubscriber(): RedisAdapter {
    return this._subscriber || (this._subscriber = new this(env.REDIS_URL));
  }
}
