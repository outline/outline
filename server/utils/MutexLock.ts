import Redlock, { type Lock } from "redlock";
import Redis from "@server/storage/redis";

export class MutexLock {
  // Default expiry time for acquiring lock in milliseconds
  public static defaultLockTimeout = 4000;

  /**
   * Returns the redlock instance
   */
  public static get lock(): Redlock {
    this.redlock ??= new Redlock([Redis.defaultClient], {
      retryJitter: 10,
      retryCount: 20,
      retryDelay: 200,
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
  public static acquire(resource: string, timeout: number) {
    return this.lock.acquire([resource], timeout);
  }

  /**
   * Safely release a lock
   *
   * @param lock The lock to release
   */
  public static release(lock: Lock) {
    if (lock && lock.expiration > new Date().getTime()) {
      return lock.release();
    }
    return false;
  }

  private static redlock: Redlock;
}
