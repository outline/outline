import { Next } from "koa";

import { Scope } from "@shared/types";
import env from "@server/env";
import AuthenticationHelper from "@server/models/helpers/AuthenticationHelper";
import { AppContext } from "@server/types";
import {
  generateRawToken,
  bundleToken,
  unbundleToken,
} from "@server/utils/csrf";
import { getCookieDomain } from "@shared/utils/domains";
import { CSRF } from "@shared/constants";
import { AuthorizationError } from "@server/errors";

export interface CsrfOptions {
  /** Name of the cookie to store the CSRF token */
  cookieName: string;
  /** Name of the header to look for the CSRF token */
  headerName: string;
  /** Secret key for HMAC signing */
  secret: string;
  /** Size of the raw token in bytes (default: 16) */
  tokenSize?: number;
}

/**
 * Creates CSRF middleware for Koa that uses HMAC-signed double-submit pattern.
 * Integrates with AuthenticationHelper to determine if requests are read-only.
 */
export const createCsrfProtection = (options: CsrfOptions) => {
  const { cookieName, headerName, secret, tokenSize = 16 } = options;

  /**
   * Middleware that generates and attaches CSRF tokens for safe methods
   */
  const attachToken = async (ctx: AppContext, next: Next) => {
    // Only attach tokens for safe methods that don't mutate state
    if (["GET", "HEAD", "OPTIONS"].includes(ctx.method)) {
      const raw = generateRawToken(tokenSize);
      const bundled = bundleToken(raw, secret);

      // Set cookie that JavaScript can read (not HttpOnly)
      ctx.cookies.set(cookieName, bundled, {
        httpOnly: false,
        sameSite: "lax",
        secure: env.isProduction,
        domain: getCookieDomain(ctx.request.hostname, env.isCloudHosted),
      });
    }

    await next();
  };

  /**
   * Determines if a request requires CSRF protection based on the request path and scopes
   */
  const shouldProtectRequest = (ctx: AppContext): boolean => {
    // Skip if not a potentially mutating method
    if (["GET", "HEAD", "OPTIONS"].includes(ctx.method)) {
      return false;
    }

    // For API routes, use AuthenticationHelper to determine if the operation is read-only
    if (ctx.path.startsWith("/api/")) {
      // Check if the path can be accessed with only read scope
      const canAccessWithReadOnly = AuthenticationHelper.canAccess(ctx.path, [
        Scope.Read,
      ]);

      // If it can be accessed with read-only scope, it doesn't need CSRF protection
      if (canAccessWithReadOnly) {
        return false;
      }
    }

    // Protect all other mutating requests
    return true;
  };

  /**
   * Middleware that verifies CSRF tokens for mutating requests
   */
  const verifyToken = async (ctx: AppContext, next: Next) => {
    if (!shouldProtectRequest(ctx)) {
      await next();
      return;
    }

    // Get token from cookie
    const cookieVal = ctx.cookies.get(cookieName);
    if (!cookieVal) {
      throw AuthorizationError("CSRF token missing from cookie");
    }

    // Get token from header or form field depending on type
    // Access the already-parsed body from koa-body middleware
    const inputVal = ctx.get(headerName) || ctx.request.body?.[CSRF.fieldName];

    if (!inputVal) {
      throw AuthorizationError("CSRF token missing from request");
    }

    // Verify both tokens are valid HMAC-signed tokens
    const { valid: cookieValid } = unbundleToken(cookieVal, secret);
    const { valid: inputValid } = unbundleToken(inputVal, secret);

    if (!cookieValid || !inputValid) {
      throw AuthorizationError("CSRF token invalid or malformed");
    }

    // Verify tokens match (double-submit check)
    if (cookieVal !== inputVal) {
      throw AuthorizationError("CSRF token mismatch");
    }

    await next();
  };

  return { attachToken, verifyToken };
};

/**
 * Convenience function to create CSRF protection with default options
 */
export const createDefaultCsrfProtection = () =>
  createCsrfProtection({
    cookieName: CSRF.cookieName,
    headerName: CSRF.headerName,
    secret: env.SECRET_KEY,
    tokenSize: 16,
  });
