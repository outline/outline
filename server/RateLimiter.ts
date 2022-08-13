import { RateLimiterRedis } from "rate-limiter-flexible";
import env from "@server/env";
import Redis from "@server/redis";
import { RateLimiterConfig } from "@server/types";

export default class RateLimiter {
  constructor() {
    throw Error(`Cannot instantiate class!`);
  }

  static readonly RATE_LIMITER_REDIS_KEY_PREFIX = "rl";

  static readonly rateLimiterMap = new Map<string, RateLimiterRedis>();
  static readonly defaultRateLimiter = new RateLimiterRedis({
    storeClient: Redis.defaultClient,
    points: env.RATE_LIMITER_REQUESTS,
    duration: env.RATE_LIMITER_DURATION_WINDOW,
    keyPrefix: this.RATE_LIMITER_REDIS_KEY_PREFIX,
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
}
