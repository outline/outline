import crypto from "crypto";

/**
 * Compare two strings in constant time to prevent timing attacks.
 *
 * @param a The first string to compare
 * @param b The second string to compare
 * @returns Whether the strings are equal
 */
export function safeEqual(a?: string, b?: string) {
  if (!a || !b) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Hash a string using SHA-256.
 *
 * @param input The input string to hash
 * @returns The hashed input
 */
export function hash(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
