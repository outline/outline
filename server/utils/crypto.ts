import crypto from "node:crypto";

/**
 * Compare two strings in constant time to prevent timing attacks.
 *
 * @param a The first string to compare
 * @param b The second string to compare
 * @returns Whether the strings are equal
 */
export function safeEqual(a?: string | null, b?: string | null) {
  if (!a || !b) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
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
