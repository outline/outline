import type { Next } from "koa";
import { defaults } from "es-toolkit/compat";
import { RateLimiterRes } from "rate-limiter-flexible";
import { toError } from "@shared/utils/error";
import env from "@server/env";
import { RateLimitExceededError } from "@server/errors";
import Logger from "@server/logging/Logger";
import Metrics from "@server/logging/Metrics";
import { ApiKey, OAuthAuthentication } from "@server/models";
import Redis from "@server/storage/redis";
import type { AppContext } from "@server/types";
import { getUserForJWT } from "@server/utils/jwt";
import RateLimiter from "@server/utils/RateLimiter";
import { parseAuthentication } from "./authentication";

/**
 * Returns the identifiers a request is rate limited against. Identifiers are
 * consumed in order and every one must have quota remaining for the request
 * to proceed.
 *
 * Session tokens are keyed on the user id, so that users behind a shared NAT
 * do not share a bucket. API keys and OAuth access tokens are additionally
 * keyed on the credential, as one credential may be presented from many
 * addresses – they remain keyed on the address too because the credential is
 * only pattern matched at this point, not yet verified.
 *
 * @param ctx The application context.
 * @returns The identifiers to consume for this request.
 */
async function getRateLimiterIdentifiers(ctx: AppContext): Promise<string[]> {
  try {
    const { token } = parseAuthentication(ctx);
    if (!token) {
      return [ctx.ip];
    }

    if (ApiKey.match(token) || OAuthAuthentication.match(token)) {
      return [ctx.ip, RateLimiter.identifierForCredential(token)];
    }

    let userId = await RateLimiter.getCachedUserIdForToken(token);
    if (!userId) {
      const { user } = await getUserForJWT(token);
      userId = user.id;
      void RateLimiter.cacheUserForToken(token, userId);
    }
    return [userId];
  } catch {
    // Fall through to IP-based rate limiting
  }

  return [ctx.ip];
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

    const fullPath = RateLimiter.normalizePath(
      `${ctx.mountPath ?? ""}${ctx.path}`
    );
    const identifiers = await getRateLimiterIdentifiers(ctx);
    const isPathScoped = RateLimiter.hasRateLimiter(fullPath);
    const limiter = RateLimiter.getRateLimiter(fullPath);

    try {
      for (const identifier of identifiers) {
        await limiter.consume(
          isPathScoped ? `${fullPath}:${identifier}` : identifier
        );
      }
    } catch (rateLimiterRes) {
      if (
        rateLimiterRes instanceof Error ||
        !(rateLimiterRes instanceof RateLimiterRes)
      ) {
        Logger.error("Rate limiter error", toError(rateLimiterRes));
        return next();
      }

      ctx.set("Retry-After", `${rateLimiterRes.msBeforeNext / 1000}`);
      ctx.set("RateLimit-Limit", `${limiter.points}`);
      ctx.set("RateLimit-Remaining", `${rateLimiterRes.remainingPoints}`);
      ctx.set(
        "RateLimit-Reset",
        new Date(Date.now() + rateLimiterRes.msBeforeNext).toString()
      );

      Metrics.increment("rate_limit.exceeded", {
        path: fullPath,
      });

      throw RateLimitExceededError();
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

    const fullPath = RateLimiter.normalizePath(
      `${ctx.mountPath ?? ""}${ctx.path}`
    );

    if (!RateLimiter.hasRateLimiter(fullPath)) {
      const points = Math.max(
        1,
        Math.round(config.requests * env.RATE_LIMITER_MULTIPLIER)
      );

      RateLimiter.setRateLimiter(
        fullPath,
        defaults(
          {
            ...config,
            points,
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
