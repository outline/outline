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
   * Runs the routine without a lock.
   */
  public static using = vi.fn(
    (
      _resource: string,
      _timeout: number,
      routine: (signal: AbortSignal) => unknown
    ) => routine(new AbortController().signal)
  );

  /**
   * Runs the routine without a lock.
   */
  public static tryUsing = vi.fn(
    (
      _resource: string,
      _timeout: number,
      routine: (signal: AbortSignal) => unknown
    ) => routine(new AbortController().signal)
  );

  /**
   * Releases a mock lock.
   */
  public static release = vi.fn().mockResolvedValue(true);
}
