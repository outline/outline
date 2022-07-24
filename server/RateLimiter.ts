import { isEmpty } from "lodash";
import { RateLimiterRedis } from "rate-limiter-flexible";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import Redis from "@server/redis";
import { RateLimiterConfig } from "@server/types";

export default class RateLimiter {
  constructor() {
    throw Error(`Cannot instantiate class!`);
  }

  static readonly rateLimiterMap = new Map<string, RateLimiterRedis>();
  static readonly defaultRateLimiter = new RateLimiterRedis({
    storeClient: Redis.defaultClient,
    points: env.RATE_LIMITER_REQUESTS,
    duration: env.RATE_LIMITER_DURATION_WINDOW,
    keyPrefix: env.RATE_LIMITER_REDIS_KEY_PREFIX,
  });

  static getRateLimiter(path: string): RateLimiterRedis {
    return this.rateLimiterMap.get(path) || this.defaultRateLimiter;
  }

  static setRateLimiter(path: string, config: RateLimiterConfig): void {
    const rateLimiter = new RateLimiterRedis(config);
    this.rateLimiterMap.set(path, rateLimiter);
  }

  static hasRateLimiter(path: string): boolean {
    return this.rateLimiterMap.has(path);
  }

  static async killDefaultRateLimiter(path: string): Promise<void> {
    const keys = await Redis.defaultClient.keys(
      `${env.RATE_LIMITER_REDIS_KEY_PREFIX}:${path}*`
    );

    if (!isEmpty(keys)) {
      await Redis.defaultClient.unlink(keys);
    }
  }

  static shutdownHandler(): void {
    // This is done so that new rate limiter
    // configurations would immediately come into effect
    // on server restart. As an example,
    // the `duration` property doesn't change
    // for already created keys, but affects all new keys.
    //
    // Refer https://github.com/animir/node-rate-limiter-flexible/wiki/Options#clearexpiredbytimeout
    Logger.info("lifecycle", `Deleting all rate limiter specific keys...`);

    const scanStream = Redis.defaultClient.scanStream({
      match: `${env.RATE_LIMITER_REDIS_KEY_PREFIX}*`,
      count: 1000,
    });

    scanStream.on("data", (keys) => {
      if (!isEmpty(keys)) {
        Redis.defaultClient.unlink(keys, (err) => {
          if (err) {
            Logger.error("lifecycle", err);
          }
        });
      }
    });

    scanStream.on("end", () => {
      Logger.info("lifecycle", "Done!");
    });
  }
}
