import { Context, Next } from "koa";
import { defaults } from "lodash";
import RateLimiter from "@server/RateLimiter";
import env from "@server/env";
import { RateLimitExceededError } from "@server/errors";
import Redis from "@server/redis";
import { RateLimiterConfig } from "@server/types";

export function rateLimiter() {
  return async function rateLimiterMiddleware(ctx: Context, next: Next) {
    if (!env.RATE_LIMITER_ENABLED) {
      return next();
    }

    const key = RateLimiter.hasRateLimiter(ctx.path)
      ? `${ctx.path}:${ctx.ip}`
      : `${ctx.ip}`;
    const limiter = RateLimiter.getRateLimiter(ctx.path);

    try {
      await limiter.consume(key);
    } catch (rateLimiterRes) {
      ctx.set("Retry-After", `${rateLimiterRes.msBeforeNext / 1000}`);
      ctx.set("RateLimit-Limit", `${limiter.points}`);
      ctx.set("RateLimit-Remaining", `${rateLimiterRes.remainingPoints}`);
      ctx.set(
        "RateLimit-Reset",
        `${new Date(Date.now() + rateLimiterRes.msBeforeNext)}`
      );

      throw RateLimitExceededError();
    }

    return next();
  };
}

export function registerRateLimiter(config: RateLimiterConfig) {
  return async function registerRateLimiterMiddleware(
    ctx: Context,
    next: Next
  ) {
    if (!env.RATE_LIMITER_ENABLED) {
      return next();
    }

    if (!RateLimiter.hasRateLimiter(ctx.path)) {
      RateLimiter.setRateLimiter(
        ctx.path,
        defaults(config, {
          keyPrefix: RateLimiter.RATE_LIMITER_REDIS_KEY_PREFIX,
          storeClient: Redis.defaultClient,
        })
      );
    }

    return next();
  };
}
