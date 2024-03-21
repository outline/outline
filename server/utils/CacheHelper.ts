/**
 * A Helper class for server-side cache management
 */

import { Day } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import Redis from "@server/storage/redis";

export type CacheConfig = {
  /** Set cache data expiry in ms  */
  expiry: number;
};

export class CacheHelper {
  private static defaultDataExpiry = Day;

  /**
   * Given a key, gets the data from cache store
   * @param key Key against which data will be accessed
   */
  public static async getData(key: string) {
    try {
      const data = await Redis.defaultClient.get(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (err) {
      // just log it, response can still be obtained using the fetch call
      Logger.error(`Could not fetch cached response against ${key}`, err);
    }
  }

  /**
   * Given a key, data and cache config, saves the data in cache store
   * @param key Cache key
   * @param value Data to be saved against the key
   * @param options Cache configuration options, e.g, cache expiry
   */
  public static async setData(
    key: string,
    data: Record<string, any>,
    options?: CacheConfig
  ) {
    if ("error" in data) {
      return;
    }

    try {
      await Redis.defaultClient.set(
        key,
        JSON.stringify(data),
        "EX",
        options?.expiry || this.defaultDataExpiry
      );
    } catch (err) {
      // just log it, can skip caching and directly return response
      Logger.error(`Could not cache response against ${key}`, err);
    }
  }

  /**
   * Gets key against which unfurl response for the given url is stored
   * @param url Gets key corresponding to this url
   */
  public static getUnfurlKey(url: string) {
    return `unfurl-${url}`;
  }
}
