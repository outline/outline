import { randomInt } from "node:crypto";
import { Minute } from "@shared/utils/time";
import Redis from "@server/storage/redis";
import { safeEqual } from "./crypto";

/**
 * This class manages verification codes for email authentication.
 * It stores and retrieves 6-digit codes in Redis with a 10-minute TTL.
 */
export class VerificationCode {
  /**
   * Redis client instance (lazy initialized)
   */
  private static get redis() {
    return Redis.defaultClient;
  }

  /**
   * TTL for verification codes in milliseconds (10 minutes)
   */
  private static readonly TTL = Minute.ms * 10;

  /**
   * Prefix for Redis keys
   */
  private static readonly KEY_PREFIX = "email_verification_code:";

  /**
   * Generate a random 6-digit code
   *
   * @returns A string representing a 6-digit code
   */
  public static generate(): string {
    // Generate a random integer between 100000 and 999999 (6 digits)
    return randomInt(100000, 1000000).toString().padStart(6, "0");
  }

  /**
   * Store a verification code in Redis with a 10-minute TTL
   *
   * @param email The email address associated with the code
   * @param code The 6-digit verification code
   * @returns Promise resolving to true if successful
   */
  public static async store(email: string, code: string): Promise<boolean> {
    const key = this.getKey(email);
    await this.redis.set(key, code, "PX", this.TTL);
    return true;
  }

  /**
   * Retrieve a verification code from Redis
   *
   * @param email The email address associated with the code
   * @returns Promise resolving to the code or null if not found
   */
  public static async retrieve(email: string): Promise<string | undefined> {
    const key = this.getKey(email);
    return (await this.redis.get(key)) ?? undefined;
  }

  /**
   * Verify if a given code matches the stored code for an email
   *
   * @param email The email address associated with the code
   * @param code The code to verify
   * @returns Promise resolving to true if the code matches, false otherwise
   */
  public static async verify(email: string, code: string): Promise<boolean> {
    const storedCode = await this.retrieve(email);
    return safeEqual(storedCode, code);
  }

  /**
   * Delete a verification code from Redis
   *
   * @param email The email address associated with the code
   * @returns Promise resolving to true if successful
   */
  public static async delete(email: string): Promise<boolean> {
    const key = this.getKey(email);
    await this.redis.del(key);
    return true;
  }

  /**
   * Get the Redis key for an email address
   *
   * @param email The email address
   * @returns The Redis key
   */
  private static getKey(email: string): string {
    return `${this.KEY_PREFIX}${email.toLowerCase()}`;
  }
}
