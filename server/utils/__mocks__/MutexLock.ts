import { vi } from "vitest";

export class MutexLock {
  // Default expiry time for acquiring lock in milliseconds
  public static defaultLockTimeout = 4000;

  /**
   * Acquires a mock lock.
   */
  public static acquire = vi.fn().mockResolvedValue({
    release: vi.fn().mockResolvedValue(true),
    expiration: Date.now() + 10000,
  });

  /**
   * Releases a mock lock.
   */
  public static release = vi.fn().mockResolvedValue(true);

  /**
   * Returns the mock redlock instance
   */
  public static get lock() {
    return {
      acquire: vi.fn().mockResolvedValue({
        release: vi.fn().mockResolvedValue(true),
        expiration: Date.now() + 10000,
      }),
    };
  }
}
