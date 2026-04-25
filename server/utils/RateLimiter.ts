import { createHash } from "crypto";
import type { IRateLimiterStoreOptions } from "rate-limiter-flexible";
import { RateLimiterRedis, RateLimiterMemory } from "rate-limiter-flexible";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import Redis from "@server/storage/redis";

export default class RateLimiter {
  constructor() {
    throw Error(`Cannot instantiate class!`);
  }

  static readonly RATE_LIMITER_REDIS_KEY_PREFIX = "rl";

  static readonly TOKEN_CACHE_KEY_PREFIX = "rl:tok:";

  static readonly TOKEN_CACHE_TTL_SECONDS = 3600;

  static readonly rateLimiterMap = new Map<string, RateLimiterRedis>();

  static readonly insuranceRateLimiter = new RateLimiterMemory({
    points: env.RATE_LIMITER_REQUESTS,
    duration: env.RATE_LIMITER_DURATION_WINDOW,
  });

  private static _defaultRateLimiter: RateLimiterRedis | undefined;

  static get defaultRateLimiter(): RateLimiterRedis {
    if (!this._defaultRateLimiter) {
      this._defaultRateLimiter = new RateLimiterRedis({
        storeClient: Redis.defaultClient,
        points: env.RATE_LIMITER_REQUESTS,
        duration: env.RATE_LIMITER_DURATION_WINDOW,
        keyPrefix: this.RATE_LIMITER_REDIS_KEY_PREFIX,
        insuranceLimiter: this.insuranceRateLimiter,
      });
    }
    return this._defaultRateLimiter;
  }

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

  /**
   * Caches the user id associated with a verified authentication token so that
   * subsequent requests can be keyed by user without re-validating the token.
   * Errors are swallowed — a failed cache write just means the next request
   * falls back to IP-based keying.
   *
   * @param token The authentication token that was just verified.
   * @param userId The id of the user the token belongs to.
   */
  static async cacheUserForToken(token: string, userId: string): Promise<void> {
    try {
      await Redis.defaultClient.set(
        this.tokenCacheKey(token),
        userId,
        "EX",
        this.TOKEN_CACHE_TTL_SECONDS
      );
    } catch (err) {
      Logger.warn("Failed to cache user for rate limiter token", err);
    }
  }

  /**
   * Looks up the cached user id for a previously verified token. Returns null
   * on cache miss or Redis error.
   *
   * @param token The authentication token presented on the current request.
   * @returns The associated user id, or null if unknown.
   */
  static async getCachedUserIdForToken(token: string): Promise<string | null> {
    try {
      return await Redis.defaultClient.get(this.tokenCacheKey(token));
    } catch (err) {
      Logger.warn("Failed to read cached user for rate limiter token", err);
      return null;
    }
  }

  /**
   * Removes the cached user id for a token, for example on logout so that a
   * revoked token immediately stops keying rate limits per user.
   *
   * @param token The authentication token being invalidated.
   */
  static async clearCachedToken(token: string): Promise<void> {
    try {
      await Redis.defaultClient.del(this.tokenCacheKey(token));
    } catch (err) {
      Logger.warn("Failed to clear cached rate limiter token", err);
    }
  }

  private static tokenCacheKey(token: string): string {
    const hash = createHash("sha256").update(token).digest("hex");
    return `${this.TOKEN_CACHE_KEY_PREFIX}${hash}`;
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
