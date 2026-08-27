import Redlock, {
  ExecutionError,
  ResourceLockedError,
  type Lock,
  type RedlockAbortSignal,
  type Settings,
} from "redlock";
import { toError } from "@shared/utils/error";
import Redis from "@server/storage/redis";
import Logger from "@server/logging/Logger";
import ShutdownHelper, { ShutdownOrder } from "./ShutdownHelper";

type AcquireOptions = {
  /** Whether a lock should be automatically released on server shutdown */
  releaseOnShutdown?: boolean;
  /** Overrides the default retry settings for this acquisition. */
  retry?: Partial<Settings>;
};

/**
 * A distributed mutex lock backed by Redis, for coordinating exclusive access
 * to resources across processes.
 *
 * Use this when the resource is Redis or an external service, when the routine
 * makes network calls, or when it runs long enough that holding a database
 * connection would matter. When the routine is database work in a single
 * transaction and the lock must be held until that transaction commits, use
 * `LockHelper` instead.
 */
export class MutexLock {
  /** Default expiry time for acquiring lock in milliseconds. */
  public static defaultLockTimeout = 4000;

  /**
   * Retry settings for short-lived cache locks, bounded to roughly the lock
   * TTL. Contenders re-check the cache after acquiring, so a longer window only
   * adds latency and retains memory during cache-miss storms.
   */
  public static cacheRetrySettings: Partial<Settings> = {
    retryCount: 15,
    retryDelay: 250,
  };

  /**
   * Returns the redlock instance
   */
  public static get lock(): Redlock {
    if (!this.redlock) {
      this.redlock = new Redlock([Redis.defaultClient], {
        retryJitter: 100,
        retryCount: 120,
        retryDelay: 1000,
      });
      this.redlock.on("error", (err) => {
        if (err instanceof ResourceLockedError) {
          // Expected during lock contention retries, not an error.
          return;
        } else if (err instanceof ExecutionError) {
          Logger.warn("Failed to extend Redlock lock", {
            message: err.message,
          });
        } else {
          Logger.error("Unexpected Redlock error", err);
        }
      });
    }

    return this.redlock;
  }

  /**
   * Acquire a Mutex lock
   *
   * @param resource The resource to lock
   * @param timeout The duration to acquire the lock for if not released in milliseconds
   * @returns A promise that resolves a to a Lock
   */
  public static async acquire(
    resource: string,
    timeout: number,
    options?: AcquireOptions
  ) {
    const lock = await this.lock.acquire([resource], timeout, options?.retry);
    if (options?.releaseOnShutdown) {
      const key = `lock:${resource}`;
      // @ts-expect-error Attach resource for use in shutdown
      lock._key = key;
      ShutdownHelper.add(key, ShutdownOrder.last, lock.release.bind(lock));
    }
    return lock;
  }

  /**
   * Execute a routine in the context of an auto-extending lock. The lock is
   * automatically acquired before the routine runs and released when it
   * completes. If the lock cannot be extended, the provided AbortSignal will
   * be triggered so the routine can bail out.
   *
   * @param resource The resource to lock.
   * @param timeout The initial lock duration in milliseconds (auto-extended while running).
   * @param routine The async routine to execute while holding the lock.
   * @returns A promise that resolves with the routine's return value.
   */
  public static async using<T>(
    resource: string,
    timeout: number,
    routine: (signal: RedlockAbortSignal) => Promise<T>
  ): Promise<T> {
    return this.lock.using([resource], timeout, routine);
  }

  /**
   * Safely release a lock. Releasing is best-effort – a lock that has already
   * expired or been taken over by another process cannot be released, and that
   * is not an error for the caller.
   *
   * @param lock The lock to release
   * @returns A promise that resolves to true if the lock was released
   */
  public static async release(lock: Lock): Promise<boolean> {
    try {
      if (lock && lock.expiration > new Date().getTime()) {
        await lock.release();
        return true;
      }
      return false;
    } catch (err) {
      Logger.warn("Failed to release Redlock lock", toError(err));
      return false;
    } finally {
      // @ts-expect-error Attach resource for use in shutdown
      const key = lock._key;
      if (key) {
        ShutdownHelper.remove(key);
      }
    }
  }

  private static redlock: Redlock;
}
