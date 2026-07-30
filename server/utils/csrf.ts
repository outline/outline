import { randomBytes, createHmac } from "node:crypto";
import type { Context } from "koa";
import { CSRF } from "@shared/constants";
import { safeEqual } from "./crypto";

/**
 * Reads the CSRF token from the request cookies, preferring the host-bound cookie
 *
 * @param ctx The request context
 * @returns The token, or undefined when no CSRF cookie is present.
 */
export const getTokenFromCookie = (
  ctx: Pick<Context, "cookies">
): string | undefined =>
  ctx.cookies.get(CSRF.secureCookieName) ?? ctx.cookies.get(CSRF.cookieName);

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
