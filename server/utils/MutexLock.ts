import Redlock, { type Lock } from "redlock";
import Redis from "@server/storage/redis";
import ShutdownHelper, { ShutdownOrder } from "./ShutdownHelper";

type AcquireOptions = {
  /** Whether a lock should be automatically released on server shutdown */
  releaseOnShutdown?: boolean;
};

export class MutexLock {
  // Default expiry time for acquiring lock in milliseconds
  public static defaultLockTimeout = 4000;

  /**
   * Returns the redlock instance
   */
  public static get lock(): Redlock {
    this.redlock ??= new Redlock([Redis.defaultClient], {
      retryJitter: 100,
      retryCount: 120,
      retryDelay: 1000,
    });

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
    const lock = await this.lock.acquire([resource], timeout);
    if (options?.releaseOnShutdown) {
      const key = `lock:${resource}`;
      // @ts-expect-error Attach resource for use in shutdown
      lock._key = key;
      ShutdownHelper.add(key, ShutdownOrder.last, lock.release.bind(lock));
    }
    return lock;
  }

  /**
   * Safely release a lock
   *
   * @param lock The lock to release
   */
  public static release(lock: Lock) {
    try {
      if (lock && lock.expiration > new Date().getTime()) {
        return lock.release();
      }
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
