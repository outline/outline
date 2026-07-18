import crypto from "node:crypto";
import { addSeconds, subMinutes } from "date-fns";
import type { Context } from "koa";
import { toError } from "@shared/utils/error";
import { getCookieDomain } from "@shared/utils/domains";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import Redis from "@server/storage/redis";
import { RedisPrefixHelper } from "./RedisPrefixHelper";

// ~3 months. Matches the default cookie lifetime so the hint is available for
// as long as the cookie referencing it can be sent back.
const DEFAULT_TTL_SECONDS = 90 * 24 * 60 * 60;

/**
 * Persists a per-session logout hint (e.g. an OIDC `id_token`) for an auth
 * provider that supports provider-initiated logout.
 *
 * The token is stored server-side keyed by a short random session identifier;
 * only that identifier is placed in a cookie. Tokens can be large and storing
 * one directly in the cookie inflates response headers enough to exceed reverse
 * proxy buffers, resulting in a 502 on sign-in. Both operations are best-effort:
 * a Redis failure never blocks sign-in or logout, it only causes the hint to be
 * omitted.
 */
export class LogoutTokenStore {
  /**
   * @param provider The auth provider id, used to namespace the cookie, Redis
   * key, and logout path (e.g. "oidc").
   * @param ttlSeconds How long the token is retained, also the cookie lifetime.
   */
  constructor(
    private provider: string,
    private ttlSeconds: number = DEFAULT_TTL_SECONDS
  ) {}

  /**
   * Persists a logout token for the current session and references it from a
   * scoped cookie. Best-effort — never throws.
   *
   * @param ctx The Koa context of the sign-in request.
   * @param token The provider token to persist as a later logout hint.
   */
  public async persist(ctx: Context, token: string): Promise<void> {
    try {
      const sessionId = crypto.randomBytes(16).toString("hex");
      await Redis.defaultClient.set(
        RedisPrefixHelper.getLogoutTokenKey(this.provider, sessionId),
        token,
        "EX",
        this.ttlSeconds
      );
      ctx.cookies.set(
        this.cookieName,
        sessionId,
        this.cookieOptions(ctx, addSeconds(new Date(), this.ttlSeconds))
      );
    } catch (err) {
      Logger.warn("Failed to persist logout token", {
        provider: this.provider,
        error: toError(err).message,
      });
    }
  }

  /**
   * Consumes the logout token for the current session and clears its cookie.
   * Best-effort — never throws.
   *
   * @param ctx The Koa context of the logout request.
   * @returns The persisted token, or null if absent or unavailable.
   */
  public async consume(ctx: Context): Promise<string | null> {
    const sessionId = ctx.cookies.get(this.cookieName);
    let token: string | null = null;

    if (sessionId) {
      try {
        token = await Redis.defaultClient.getdel(
          RedisPrefixHelper.getLogoutTokenKey(this.provider, sessionId)
        );
      } catch (err) {
        Logger.warn("Failed to read logout token", {
          provider: this.provider,
          error: toError(err).message,
        });
      }
    }

    // Always discard the session identifier, regardless of the result.
    ctx.cookies.set(
      this.cookieName,
      "",
      this.cookieOptions(ctx, subMinutes(new Date(), 1))
    );

    return token;
  }

  private get cookieName(): string {
    return `${this.provider}Session`;
  }

  private get cookiePath(): string {
    return `/auth/${this.provider}.logout`;
  }

  private cookieOptions(ctx: Context, expires: Date) {
    return {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: env.isProduction,
      path: this.cookiePath,
      domain: getCookieDomain(ctx.request.hostname, env.isCloudHosted),
      expires,
    };
  }
}
