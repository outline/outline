import { randomBytes, createHmac } from "node:crypto";
import type { Context } from "koa";
import { CSRF } from "@shared/constants";
import { safeEqual } from "./crypto";

/**
 * Returns the name of the cookie that carries the CSRF token for a request.
 * Secure requests use the host-bound cookie, which a sibling subdomain cannot
 * write. The name must be resolved the same way when attaching and verifying,
 * otherwise the host-bound cookie can be substituted for the weaker one.
 *
 * @param ctx the request context.
 * @returns the cookie name for this request.
 */
export const getCookieName = (ctx: Pick<Context, "request">): string =>
  ctx.request.secure ? CSRF.secureCookieName : CSRF.cookieName;

/**
 * Reads the CSRF token from the request cookies.
 *
 * @param ctx the request context.
 * @returns the token, or undefined when no CSRF cookie is present.
 */
export const getTokenFromCookie = (
  ctx: Pick<Context, "cookies" | "request">
): string | undefined => ctx.cookies.get(getCookieName(ctx));

/**
 * Generates cryptographically secure random bytes
 *
 * @param size The number of bytes to generate
 * @returns A buffer containing random bytes
 */
export const generateRawToken = (size: number): Buffer => randomBytes(size);

/**
 * Creates an HMAC-SHA256 signature for a token
 *
 * @param token The token to sign
 * @param secret The secret key for signing
 * @returns The HMAC signature as a hex string
 */
export const signToken = (token: Buffer, secret: string): string =>
  createHmac("sha256", secret).update(token).digest("hex");

/**
 * Bundles a token with its HMAC signature
 *
 * @param token The raw token
 * @param secret The secret key for signing
 * @returns A string containing the token and signature separated by a dot
 */
export const bundleToken = (token: Buffer, secret: string): string => {
  const sig = signToken(token, secret);
  return `${token.toString("hex")}.${sig}`;
};

/**
 * Unbundles and verifies a token with its HMAC signature
 *
 * @param bundled The bundled token string
 * @param secret The secret key for verification
 * @returns An object indicating validity and the raw token if valid
 */
export const unbundleToken = (
  bundled: string,
  secret: string
): { valid: boolean; raw?: Buffer } => {
  const [hex, sig] = bundled.split(".");
  if (!hex || !sig) {
    return { valid: false };
  }

  const token = Buffer.from(hex, "hex");
  const expected = signToken(token, secret);

  const valid = safeEqual(sig, expected);
  return { valid, raw: valid ? token : undefined };
};
