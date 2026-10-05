import crypto from "node:crypto";

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
 * Normalize a PEM-encoded key read from an environment variable, accepting
 * either the PEM itself – optionally with escaped newlines, as commonly
 * happens when a key is copied into an env var – or a base64-encoded PEM on
 * a single line.
 *
 * @param value The environment variable value
 * @returns The PEM-encoded key
 */
export function decodePem(value: string): string {
  if (value.includes("BEGIN")) {
    return value.replace(/\\n/g, "\n");
  }

  return Buffer.from(value, "base64").toString("utf-8");
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
