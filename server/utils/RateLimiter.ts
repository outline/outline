import {
  IRateLimiterStoreOptions,
  RateLimiterRedis,
  RateLimiterMemory,
} from "rate-limiter-flexible";
import env from "@server/env";
import Redis from "@server/storage/redis";

export default class RateLimiter {
  constructor() {
    throw Error(`Cannot instantiate class!`);
  }

  static readonly RATE_LIMITER_REDIS_KEY_PREFIX = "rl";

  static readonly rateLimiterMap = new Map<string, RateLimiterRedis>();

  static readonly insuranceRateLimiter = new RateLimiterMemory({
    points: env.RATE_LIMITER_REQUESTS,
    duration: env.RATE_LIMITER_DURATION_WINDOW,
  });

  static readonly defaultRateLimiter = new RateLimiterRedis({
    storeClient: Redis.defaultClient,
    points: env.RATE_LIMITER_REQUESTS,
    duration: env.RATE_LIMITER_DURATION_WINDOW,
    keyPrefix: this.RATE_LIMITER_REDIS_KEY_PREFIX,
    insuranceLimiter: this.insuranceRateLimiter,
  });

  static getRateLimiter(path: string): RateLimiterRedis {
    return this.rateLimiterMap.get(path) || this.defaultRateLimiter;
  }

  static setRateLimiter(path: string, config: IRateLimiterStoreOptions): void {
    const rateLimiter = new RateLimiterRedis(config);
    this.rateLimiterMap.set(path, rateLimiter);
  }

  static hasRateLimiter(path: string): boolean {
    return this.rateLimiterMap.has(path);
  }
}

/**
 * Re-useable configuration for rate limiter middleware.
 */
export const RateLimiterStrategy = {
  /** Allows five requests per minute, per IP address */
  FivePerMinute: {
    duration: 60,
    requests: 5,
  },
  /** Allows ten requests per minute, per IP address */
  TenPerMinute: {
    duration: 60,
    requests: 10,
  },
  /** Allows twenty five requests per minute, per IP address */
  TwentyFivePerMinute: {
    duration: 60,
    requests: 25,
  },
  /** Allows one hundred requests per minute, per IP address */
  OneHundredPerMinute: {
    duration: 60,
    requests: 100,
  },
  /** Allows one thousand requests per hour, per IP address */
  OneThousandPerHour: {
    duration: 3600,
    requests: 1000,
  },
  /** Allows one hunred requests per hour, per IP address */
  OneHundredPerHour: {
    duration: 3600,
    requests: 100,
  },
  /** Allows fifty requests per hour, per IP address */
  FiftyPerHour: {
    duration: 3600,
    requests: 50,
  },
  /** Allows ten requests per hour, per IP address */
  TenPerHour: {
    duration: 3600,
    requests: 10,
  },
  /** Allows five requests per hour, per IP address */
  FivePerHour: {
    duration: 3600,
    requests: 5,
  },
};
