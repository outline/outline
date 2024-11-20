import { Day } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import Redis from "@server/storage/redis";
import { MutexLock } from "./MutexLock";

/**
 * A Helper class for server-side cache management
 */
export class CacheHelper {
  // Default expiry time for cache data in seconds
  private static defaultDataExpiry = Day.seconds;

  /**
   * Given a key this method will attempt to get the data from cache store first
   * If data is not found, it will call the callback to get the data and save it in cache
   * using a distributed lock to prevent multiple writes.
   *
   * @param key Cache key
   * @param callback Callback to get the data if not found in cache
   * @param expiry Cache data expiry in seconds
   */
  public static async getDataOrSet<T>(
    key: string,
    callback: () => Promise<T | undefined>,
    expiry?: number
  ): Promise<T | undefined> {
    let cache = await this.getData<T>(key);

    if (cache) {
      return cache;
    }

    // Nothing in the cache, acquire a lock to prevent multiple writes
    let lock;
    const lockKey = `lock:${key}`;
    try {
      try {
        lock = await MutexLock.lock.acquire(
          [lockKey],
          MutexLock.defaultLockTimeout
        );
      } catch (err) {
        Logger.error(`Could not acquire lock for ${key}`, err);
      }
      cache = await this.getData<T>(key);
      if (cache) {
        return cache;
      }

      // Get the data from the callback and save it in cache
      const value = await callback();
      if (value) {
        await this.setData<T>(key, value, expiry);
      }
      return value;
    } finally {
      await lock?.release();
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
      Logger.error(`Could not fetch cached response against ${key}`, err);
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
      Logger.error(`Could not cache response against ${key}`, err);
    }
  }

  /**
   * Clears all cache data with the given prefix
   *
   * @param prefix Prefix to clear cache data
   */
  public static async clearData(prefix: string) {
    const keys = await Redis.defaultClient.keys(`${prefix}*`);

    await Promise.all(
      keys.map(async (key) => {
        await Redis.defaultClient.del(key);
      })
    );
  }

  // keys

  /**
   * Gets key against which unfurl response for the given url is stored
   *
   * @param teamId The team ID to generate a key for
   * @param url The url to generate a key for
   */
  public static getUnfurlKey(teamId: string, url = "") {
    return `unfurl:${teamId}:${url}`;
  }
}
