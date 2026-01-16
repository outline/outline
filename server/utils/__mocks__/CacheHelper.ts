import { Day } from "@shared/utils/time";
import type { CacheResult } from "../CacheHelper";

/**
 * A Mock Helper class for server-side cache management
 */
export class CacheHelper {
  // Default expiry time for cache data in seconds
  private static defaultDataExpiry = Day.seconds;

  /**
   * Mocked method that resolves with the callback result
   */
  public static async getDataOrSet<T>(
    key: string,
    callback: () => Promise<T | CacheResult<T> | undefined>,
    _expiry: number,
    _lockTimeout?: number
  ): Promise<T | undefined> {
    const result = await callback();
    if (result && typeof result === "object" && "data" in result) {
      return (result as CacheResult<T>).data;
    }
    return result as T | undefined;
  }

  /**
   * Mocked method that resolves with undefined
   */
  public static async getData<T>(_key: string): Promise<T | undefined> {
    return undefined;
  }

  /**
   * Mocked method that resolves with void
   */
  public static async setData<T>(_key: string, _data: T, _expiry?: number) {
    return;
  }

  /**
   * Mocked method that resolves with void
   */
  public static async clearData(_prefix: string) {
    return;
  }

  /**
   * These are real methods that don't require mocking as they don't
   * interact with Redis directly
   */
  public static getUnfurlKey(teamId: string, url = "") {
    return `unfurl:${teamId}:${url}`;
  }

  public static getCollectionDocumentsKey(collectionId: string) {
    return `cd:${collectionId}`;
  }
}
