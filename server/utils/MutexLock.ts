import Redlock from "redlock";
import Redis from "@server/storage/redis";

export class MutexLock {
  // Default expiry time for qcuiring lock in milliseconds
  public static defaultLockTimeout = 5000;

  /**
   * Returns the redlock instance
   */
  public static get lock(): Redlock {
    this.redlock ??= new Redlock([Redis.defaultClient], {
      retryJitter: 10,
    });

    return this.redlock;
  }

  private static redlock: Redlock;
}
