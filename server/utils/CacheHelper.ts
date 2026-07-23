import { toError } from "@shared/utils/error";
import { Day } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import Redis from "@server/storage/redis";
import { MutexLock } from "./MutexLock";

/**
 * Result type for cache callbacks that need to specify a dynamic expiry.
 */
export interface CacheResult<T> {
  /** The data to cache. */
  data: T;
  /** Cache expiry in seconds. If not provided, uses the default expiry passed to getDataOrSet. */
  expiry?: number;
}

/**
 * A Helper class for server-side cache management
 */
export class CacheHelper {
  // Default expiry time for cache data in seconds
  private static defaultDataExpiry = Day.seconds;

  // In-flight cache population promises keyed by cache key, so that N same-key
  // misses within one process share a single lock acquisition and callback.
  private static inflight = new Map<string, Promise<unknown>>();

  /**
   * Given a key this method will attempt to get the data from cache store first
   * If data is not found, it will call the callback to get the data and save it in cache
   * using a distributed lock to prevent multiple writes.
   *
   * The callback can return either:
   * - A plain value of type T (uses the default expiry)
   * - A CacheResult<T> object with { data, expiry } for dynamic expiry
   *
   * @param key Cache key
   * @param callback Callback to get the data if not found in cache
   * @param expiry Default cache data expiry in seconds
   * @param lockTimeout Lock timeout in milliseconds
   * @returns The data from cache or the result of the callback
   */
  public static async getDataOrSet<T>(
    key: string,
    callback: () => Promise<T | CacheResult<T> | undefined>,
    expiry: number,
    lockTimeout: number = MutexLock.defaultLockTimeout
  ): Promise<T | undefined> {
    const cache = await this.getData<T>(key);

    if (cache !== undefined) {
      return cache;
    }

    // Coalesce concurrent same-key misses in this process
    const existing = this.inflight.get(key) as
      | Promise<T | undefined>
      | undefined;
    if (existing) {
      return existing;
    }

    const promise = this.populate<T>(key, callback, expiry, lockTimeout);
    this.inflight.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inflight.delete(key);
    }
  }

  /**
   * Acquires the distributed lock, re-checks the cache, and populates it from
   * the callback. Serialized per-process by getDataOrSet's in-flight map.
   *
   * @param key Cache key.
   * @param callback Callback to get the data if not found in cache.
   * @param expiry Default cache data expiry in seconds.
   * @param lockTimeout Lock timeout in milliseconds.
   * @returns The data from cache or the result of the callback.
   */
  private static async populate<T>(
    key: string,
    callback: () => Promise<T | CacheResult<T> | undefined>,
    expiry: number,
    lockTimeout: number
  ): Promise<T | undefined> {
    let cache: T | undefined;

    // Nothing in the cache, acquire a lock to prevent multiple writes
    let lock;
    const lockKey = `lock:${key}`;
    try {
      try {
        lock = await MutexLock.acquire(lockKey, lockTimeout, {
          retry: MutexLock.cacheRetrySettings,
        });
      } catch (err) {
        Logger.error(`Could not acquire lock for ${key}`, toError(err));
      }
      cache = await this.getData<T>(key);
      if (cache !== undefined) {
        return cache;
      }

      // Get the data from the callback and save it in cache. Only undefined
      // means "nothing to cache"; falsy values like null are cached normally.
      const result = await callback();
      if (result === undefined) {
        return undefined;
      }

      // Check if result is a CacheResult with dynamic expiry
      const isCacheResult =
        result !== null &&
        typeof result === "object" &&
        "data" in result &&
        Object.keys(result).every((k) => k === "data" || k === "expiry");

      if (isCacheResult) {
        const { data, expiry: dynamicExpiry } = result as CacheResult<T>;
        await this.setData<T>(key, data, dynamicExpiry ?? expiry);
        return data;
      }

      await this.setData<T>(key, result as T, expiry);
      return result as T;
    } finally {
      if (lock) {
        await MutexLock.release(lock);
      }
    }
  }

  /**
   * Given a key, gets the data from cache store
   *
   * @param key Key against which data will be accessed
   */
  public static async getData<T>(key: string): Promise<T | undefined> {
    try {
      const data = await Redis.defaultClient.get(key);
      if (data !== null) {
        return JSON.parse(data);
      }
    } catch (err) {
      // just log it, response can still be obtained using the fetch call
      Logger.error(
        `Could not fetch cached response against ${key}`,
        toError(err)
      );
    }
    return;
  }

  /**
   * Given a key, data and cache config, saves the data in cache store
   *
   * @param key Cache key
   * @param data Data to be saved against the key
   * @param expiry Cache data expiry in seconds
   */
  public static async setData<T>(key: string, data: T, expiry?: number) {
    try {
      await Redis.defaultClient.set(
        key,
        JSON.stringify(data),
        "EX",
        expiry || CacheHelper.defaultDataExpiry
      );
    } catch (err) {
      // just log it, can skip caching and directly return response
      Logger.error(`Could not cache response against ${key}`, toError(err));
    }
  }

  /**
   * Removes a single cached entry by key.
   *
   * @param key Cache key to remove.
   */
  public static async removeData(key: string) {
    try {
      await Redis.defaultClient.del(key);
    } catch (err) {
      Logger.error(
        `Could not remove cached entry against ${key}`,
        toError(err)
      );
    }
  }

  /**
   * Clears all cache data with the given prefix. Keys are discovered with an
   * incremental SCAN rather than KEYS and each batch is removed with UNLINK
   * as the scan progresses, so neither discovery nor deletion blocks the
   * Redis event loop and matched keys are never buffered in full.
   *
   * @param prefix Prefix to clear cache data
   */
  public static async clearData(prefix: string) {
    const match = `${prefix}*`;

    try {
      // Deleting keys while a scan is in progress can skip keys in some
      // Redis-compatible implementations, so repeat until a full pass finds
      // nothing to delete. With real Redis the final pass is a single
      // confirming sweep.
      for (let pass = 0; pass < CacheHelper.maxClearPasses; pass++) {
        let deleted = 0;
        let cursor = "0";

        do {
          const [nextCursor, keys] = await Redis.defaultClient.scan(
            cursor,
            "MATCH",
            match,
            "COUNT",
            CacheHelper.scanPageSize
          );
          cursor = nextCursor;

          if (keys.length > 0) {
            await Redis.defaultClient.unlink(...keys);
            deleted += keys.length;
          }
        } while (cursor !== "0");

        if (deleted === 0) {
          break;
        }
      }
    } catch (err) {
      Logger.error(
        `Could not clear cached data for prefix ${prefix}`,
        toError(err)
      );
    }
  }

  // Number of keys to request per SCAN iteration when clearing by prefix
  private static readonly scanPageSize = 1000;

  // Upper bound on full scan+delete passes in clearData, guarding against a
  // pathological loop if matching keys are written as fast as they are cleared
  private static readonly maxClearPasses = 10;
}
