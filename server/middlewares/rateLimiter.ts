import type { Next } from "koa";
import defaults from "lodash/defaults";
import env from "@server/env";
import { RateLimitExceededError } from "@server/errors";
import Logger from "@server/logging/Logger";
import Metrics from "@server/logging/Metrics";
import { ApiKey, OAuthAuthentication } from "@server/models";
import Redis from "@server/storage/redis";
import type { AppContext } from "@server/types";
import { getJWTPayload } from "@server/utils/jwt";
import RateLimiter from "@server/utils/RateLimiter";
import { parseAuthentication } from "./authentication";

/**
 * Returns a unique identifier for rate limiting based on the request context.
 * Uses the authenticated user's ID if a valid JWT is present, otherwise falls
 * back to the client's IP address.
 *
 * @param ctx The application context.
 * @returns A string identifier for rate limiting (user ID or IP address).
 */
function getRateLimiterIdentifier(ctx: AppContext): string {
  try {
    const { token } = parseAuthentication(ctx);
    if (token && !ApiKey.match(token) && !OAuthAuthentication.match(token)) {
      const payload = getJWTPayload(token);
      if (payload.id) {
        return `user:${payload.id}`;
      }
    }
  } catch {
    // Fall through to IP-based rate limiting
  }
  return ctx.ip;
}

/**
 * Middleware that limits the number of requests that are allowed within a given
 * window. Should only be applied once to a server – do not use on individual
 * routes.
 *
 * @returns The middleware function.
 */
export function defaultRateLimiter() {
  return async function rateLimiterMiddleware(ctx: AppContext, next: Next) {
    if (!env.RATE_LIMITER_ENABLED) {
      return next();
    }

    const fullPath = `${ctx.mountPath ?? ""}${ctx.path}`;
    const identifier = getRateLimiterIdentifier(ctx);

    const key = RateLimiter.hasRateLimiter(fullPath)
      ? `${fullPath}:${identifier}`
      : identifier;
    const limiter = RateLimiter.getRateLimiter(fullPath);

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
          path: fullPath,
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
  /** The number of requests allowed within the window (per user if authenticated, per IP otherwise) */
  requests: number;
};

/**
 * Middleware that limits the number of requests that are allowed within a
 * window, overrides default middleware when used on a route. Uses user ID for
 * authenticated requests and IP address otherwise.
 *
 * @returns The middleware function.
 */
export function rateLimiter(config: RateLimiterConfig) {
  return async function registerRateLimiterMiddleware(
    ctx: AppContext,
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
