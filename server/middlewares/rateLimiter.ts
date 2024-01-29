import { Context, Next } from "koa";
import defaults from "lodash/defaults";
import env from "@server/env";
import { RateLimitExceededError } from "@server/errors";
import Logger from "@server/logging/Logger";
import Metrics from "@server/logging/Metrics";
import Redis from "@server/storage/redis";
import RateLimiter from "@server/utils/RateLimiter";

/**
 * Middleware that limits the number of requests that are allowed within a given
 * window. Should only be applied once to a server – do not use on individual
 * routes.
 *
 * @returns The middleware function.
 */
export function defaultRateLimiter() {
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
      if (rateLimiterRes.msBeforeNext) {
        ctx.set("Retry-After", `${rateLimiterRes.msBeforeNext / 1000}`);
        ctx.set("RateLimit-Limit", `${limiter.points}`);
        ctx.set("RateLimit-Remaining", `${rateLimiterRes.remainingPoints}`);
        ctx.set(
          "RateLimit-Reset",
          `${new Date(Date.now() + rateLimiterRes.msBeforeNext)}`
        );

        Metrics.increment("rate_limit.exceeded", {
          path: ctx.path,
        });

        throw RateLimitExceededError();
      } else {
        Logger.error("Rate limiter error", rateLimiterRes);
      }
    }

    return next();
  };
}

type RateLimiterConfig = {
  /** The window for which this rate limiter is considered (defaults to 60s) */
  duration?: number;
  /** The number of requests per IP address that are allowed within the window */
  requests: number;
};

/**
 * Middleware that limits the number of requests per IP address that are allowed
 * within a window, overrides default middleware when used on a route.
 *
 * @returns The middleware function.
 */
export function rateLimiter(config: RateLimiterConfig) {
  return async function registerRateLimiterMiddleware(
    ctx: Context,
    next: Next
  ) {
    if (!env.RATE_LIMITER_ENABLED) {
      return next();
    }

    const fullPath = `${ctx.mountPath ?? ""}${ctx.path}`;

    if (!RateLimiter.hasRateLimiter(fullPath)) {
      RateLimiter.setRateLimiter(
        fullPath,
        defaults(
          {
            ...config,
            points: config.requests,
          },
          {
            duration: 60,
            points: env.RATE_LIMITER_REQUESTS,
            keyPrefix: RateLimiter.RATE_LIMITER_REDIS_KEY_PREFIX,
            storeClient: Redis.defaultClient,
          }
        )
      );
    }

    return next();
  };
}
