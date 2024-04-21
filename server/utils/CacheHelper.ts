import { Day } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import Redis from "@server/storage/redis";
import { Unfurl, UnfurlSignature } from "@server/types";

/**
 * A Helper class for server-side cache management
 */
export class CacheHelper {
  private static defaultDataExpiry = Day;

  /**
   * Given a key, gets the data from cache store
   *
   * @param key Key against which data will be accessed
   */
  public static async getData(key: string): ReturnType<UnfurlSignature> {
    try {
      const data = await Redis.defaultClient.get(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (err) {
      // just log it, response can still be obtained using the fetch call
      return Logger.error(
        `Could not fetch cached response against ${key}`,
        err
      );
    }
  }

  /**
   * Given a key, data and cache config, saves the data in cache store
   *
   * @param key Cache key
   * @param data Data to be saved against the key
   * @param expiry Cache data expiry
   */
  public static async setData(key: string, data: Unfurl, expiry?: number) {
    if ("error" in data) {
      return;
    }

    try {
      await Redis.defaultClient.set(
        key,
        JSON.stringify(data),
        "EX",
        expiry || this.defaultDataExpiry
      );
    } catch (err) {
      // just log it, can skip caching and directly return response
      Logger.error(`Could not cache response against ${key}`, err);
    }
  }

  /**
   * Gets key against which unfurl response for the given url is stored
   *
   * @param teamId The team ID to generate a key for
   * @param url The url to generate a key for
   */
  public static getUnfurlKey(teamId: string, url = "") {
    return `unfurl:${teamId}:${url}`;
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
}
