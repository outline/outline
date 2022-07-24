import { Context, Next } from "koa";
import { defaults } from "lodash";
import RateLimiter from "@server/RateLimiter";
import env from "@server/env";
import { RateLimitExceededError } from "@server/errors";
import Logger from "@server/logging/Logger";
import Redis from "@server/redis";
import { RateLimiterConfig } from "@server/types";

export function rateLimiter() {
  return async function rateLimiterMiddleware(ctx: Context, next: Next) {
    if (!env.RATE_LIMITER_ENABLED) {
      return next();
    }

    const limiter = RateLimiter.getRateLimiter(ctx.path);

    try {
      await limiter.consume(`${ctx.path}:${ctx.ip}`);
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
      // kill the default rate limiter for this path first
      try {
        await RateLimiter.killDefaultRateLimiter(ctx.path);
      } catch (err) {
        Logger.error(`Default rate limiter kill aborted for ${ctx.path}`, err);
      }

      RateLimiter.setRateLimiter(
        ctx.path,
        defaults(config, {
          keyPrefix: env.RATE_LIMITER_REDIS_KEY_PREFIX,
          storeClient: Redis.defaultClient,
        })
      );
    }
    return next();
  };
}
