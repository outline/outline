import { randomBytes } from "node:crypto";
import { toError } from "@shared/utils/error";
import { sleep } from "@shared/utils/timers";
import Redis from "@server/storage/redis";
import Logger from "@server/logging/Logger";
import { ShutdownHelper, ShutdownOrder } from "./ShutdownHelper";

/**
 * A lock held on a single resource.
 */
export interface Lock {
  /** The Redis key that holds the lock. */
  resource: string;
  /** A random token that identifies this holder of the lock. */
  value: string;
  /** The time the lock expires, in milliseconds since the epoch. */
  expiration: number;
  /** The key of the shutdown handler that releases the lock, if any. */
  shutdownKey?: string;
}

/**
 * Settings that control how acquisition is retried while the lock is held
 * elsewhere.
 */
export interface RetrySettings {
  /** The number of retries after the first attempt. */
  retryCount: number;
  /** The base delay between attempts in milliseconds. */
  retryDelay: number;
  /** The maximum random amount added to or removed from the delay. */
  retryJitter: number;
}

interface AcquireOptions {
  /** Whether a lock should be automatically released on server shutdown */
  releaseOnShutdown?: boolean;
  /** Overrides the default retry settings for this acquisition. */
  retry?: Partial<RetrySettings>;
}

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

  /** Default retry settings, waiting up to roughly two minutes. */
  public static defaultRetrySettings: RetrySettings = {
    retryCount: 120,
    retryDelay: 1000,
    retryJitter: 100,
  };

  /**
   * Retry settings for short-lived cache locks, bounded to roughly the lock
   * TTL. Contenders re-check the cache after acquiring, so a longer window only
   * adds latency and retains memory during cache-miss storms.
   */
  public static cacheRetrySettings: Partial<RetrySettings> = {
    retryCount: 15,
    retryDelay: 250,
  };

  /**
   * Acquire a Mutex lock
   *
   * @param resource The resource to lock
   * @param timeout The duration to acquire the lock for if not released in milliseconds
   * @param options Options for the acquisition.
   * @returns A promise that resolves a to a Lock
   * @throws If the lock cannot be acquired after all retries.
   */
  public static async acquire(
    resource: string,
    timeout: number,
    options?: AcquireOptions
  ): Promise<Lock> {
    const settings = { ...this.defaultRetrySettings, ...options?.retry };
    const value = this.token();
    let lastError: Error | undefined;
    let ambiguous = false;

    for (let attempt = 0; attempt <= settings.retryCount; attempt++) {
      if (attempt > 0) {
        await sleep(
          Math.max(
            0,
            settings.retryDelay +
              Math.floor((Math.random() * 2 - 1) * settings.retryJitter)
          )
        );
      }

      let lock: Lock | undefined;
      try {
        lock = await this.attempt(resource, value, timeout, ambiguous);
        lastError = undefined;
      } catch (err) {
        // Temporary Redis errors, such as READONLY during failover, are retried.
        // The SET can still have been applied, so later attempts check for it.
        lastError = toError(err);
        ambiguous = true;
      }
      if (!lock) {
        continue;
      }

      if (options?.releaseOnShutdown) {
        lock.shutdownKey = `lock:${resource}`;
        ShutdownHelper.add(lock.shutdownKey, ShutdownOrder.last, () =>
          this.del(lock)
        );
      }
      return lock;
    }

    if (ambiguous) {
      await this.discard(resource, value);
    }
    throw (
      lastError ??
      new Error(
        `Could not acquire lock on ${resource} after ${settings.retryCount + 1} attempts`
      )
    );
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
    routine: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    const lock = await this.acquire(resource, timeout);
    return this.runWithLock(lock, timeout, routine);
  }

  /**
   * Execute a routine in the context of an auto-extending lock, without
   * waiting when the lock is already held elsewhere. Use this for long
   * routines that must never run concurrently but can be skipped.
   *
   * @param resource The resource to lock.
   * @param timeout The initial lock duration in milliseconds (auto-extended while running).
   * @param routine The async routine to execute while holding the lock.
   * @returns A promise that resolves with the routine's return value, or
   * undefined if the lock was held elsewhere and the routine did not run.
   */
  public static async tryUsing<T>(
    resource: string,
    timeout: number,
    routine: (signal: AbortSignal) => Promise<T>
  ): Promise<T | undefined> {
    const value = this.token();
    let lock: Lock | undefined;
    try {
      lock = await this.attempt(resource, value, timeout, false);
    } catch (err) {
      await this.discard(resource, value);
      throw err;
    }
    if (!lock) {
      return undefined;
    }
    return this.runWithLock(lock, timeout, routine);
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
      return await this.del(lock);
    } catch (err) {
      Logger.warn("Failed to release lock", toError(err));
      return false;
    } finally {
      if (lock.shutdownKey) {
        ShutdownHelper.remove(lock.shutdownKey);
      }
    }
  }

  /**
   * Run a routine while extending the lock before it expires, and release the
   * lock when the routine settles.
   *
   * @param lock The acquired lock.
   * @param timeout The lock duration in milliseconds.
   * @param routine The routine to run.
   * @returns The routine's return value.
   */
  private static async runWithLock<T>(
    lock: Lock,
    timeout: number,
    routine: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    let watchdog: NodeJS.Timeout | undefined;
    let extension: Promise<void> | undefined;

    // Abort when the lock expires, even if an extension is still pending.
    const watch = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(
        () => controller.abort(new Error(`Lock on ${lock.resource} expired`)),
        Math.max(lock.expiration - Date.now(), 0)
      );
    };

    // Extend when half of the lock duration remains, measured from the expiry.
    const schedule = () => {
      const delay = lock.expiration - Date.now() - Math.floor(timeout / 2);
      timer = setTimeout(() => (extension = extend()), Math.max(delay, 0));
    };

    const extend = async () => {
      try {
        if (await this.pexpire(lock, timeout)) {
          if (!controller.signal.aborted) {
            watch();
            schedule();
          }
          return;
        }
        controller.abort(new Error(`Lock on ${lock.resource} was lost`));
      } catch (err) {
        if (lock.expiration - Date.now() > this.extensionRetryDelay) {
          timer = setTimeout(
            () => (extension = extend()),
            this.extensionRetryDelay
          );
          return;
        }
        controller.abort(toError(err));
      }
    };

    watch();
    schedule();

    try {
      return await routine(controller.signal);
    } finally {
      clearTimeout(timer);
      await extension;
      clearTimeout(timer);
      clearTimeout(watchdog);
      await this.release(lock);
    }
  }

  /**
   * Make a single attempt to acquire the lock.
   *
   * @param resource The resource to lock.
   * @param value The token that identifies this holder.
   * @param timeout The lock duration in milliseconds.
   * @param ambiguous Whether an earlier attempt with this token failed after
   * the SET may have been applied.
   * @returns The lock, or undefined if it is held elsewhere or expired before
   * the reply arrived.
   */
  private static async attempt(
    resource: string,
    value: string,
    timeout: number,
    ambiguous: boolean
  ): Promise<Lock | undefined> {
    const lock: Lock = {
      resource,
      value,
      expiration: Date.now() + timeout,
    };
    const result = await Redis.defaultClient.set(
      resource,
      value,
      "PX",
      timeout,
      "NX"
    );
    const acquired =
      result === "OK" || (ambiguous && (await this.pexpire(lock, timeout)));
    if (!acquired) {
      return undefined;
    }
    if (Date.now() >= lock.expiration) {
      await this.discard(resource, value);
      return undefined;
    }
    return lock;
  }

  /**
   * Delete a lock that this holder may own, ignoring errors.
   *
   * @param resource The resource that was locked.
   * @param value The token that identifies this holder.
   */
  private static async discard(resource: string, value: string) {
    try {
      await this.del({ resource, value, expiration: 0 });
    } catch (err) {
      Logger.warn("Failed to discard lock", toError(err));
    }
  }

  /**
   * Generate a random token that identifies a holder of a lock.
   *
   * @returns The token.
   */
  private static token() {
    return randomBytes(16).toString("hex");
  }

  /**
   * Extend the lock if this holder still owns it.
   *
   * @param lock The lock to extend.
   * @param timeout The new lock duration in milliseconds.
   * @returns true if the lock was extended.
   */
  private static async pexpire(lock: Lock, timeout: number): Promise<boolean> {
    const expiration = Date.now() + timeout;
    const result = await Redis.defaultClient.eval(
      this.extendScript,
      1,
      lock.resource,
      lock.value,
      timeout
    );
    if (result !== 1) {
      return false;
    }
    lock.expiration = expiration;
    return true;
  }

  /**
   * Delete the lock if this holder still owns it.
   *
   * @param lock The lock to delete.
   * @returns true if the lock was deleted.
   */
  private static async del(lock: Lock): Promise<boolean> {
    const result = await Redis.defaultClient.eval(
      this.releaseScript,
      1,
      lock.resource,
      lock.value
    );
    lock.expiration = 0;
    return result === 1;
  }

  /** Delay before retrying an extension that failed with an error. */
  private static extensionRetryDelay = 250;

  private static releaseScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    end
    return 0
  `;

  private static extendScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    end
    return 0
  `;
}
