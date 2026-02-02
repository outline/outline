"use strict";

import bcrypt from "bcryptjs";

const PASSWORD_SALT_ROUNDS = 12;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;

/**
 * Hash a plaintext password.
 *
 * @param password The plaintext password to hash.
 * @returns A bcrypt hash of the password.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a hash.
 *
 * @param password The plaintext password.
 * @param hash The stored password hash.
 * @returns Whether the password matches the hash.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength.
 *
 * @param password The plaintext password.
 * @returns Whether the password matches minimum complexity requirements.
 */
export function isPasswordStrong(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}
