import env from "@server/env";
import { InternalError } from "@server/errors";
import Logger from "@server/logging/Logger";
import Redis from "@server/storage/redis";
import fetch from "@server/utils/fetch";

class Iframely {
  private static apiUrl = `${env.IFRAMELY_URL}/api`;
  private static apiKey = env.IFRAMELY_API_KEY;
  private static cacheKeyPrefix = "unfurl";
  private static defaultCacheExpiry = 86400;

  private static cacheKey(url: string) {
    return `${this.cacheKeyPrefix}-${url}`;
  }

  private static async cache(url: string, response: any) {
    // do not cache error responses
    if (response.error) {
      return;
    }
    try {
      await Redis.defaultClient.set(
        this.cacheKey(url),
        JSON.stringify(response),
        "EX",
        response.cache_age || this.defaultCacheExpiry
      );
    } catch (err) {
      // just log it, can skip caching and directly return response
      Logger.error("Could not cache Iframely response", err);
    }
  }

  private static async fetch(url: string, type = "oembed") {
    const res = await fetch(
      `${this.apiUrl}/${type}?url=${encodeURIComponent(url)}&api_key=${
        this.apiKey
      }`
    );
    return res.json();
  }

  private static async cached(url: string) {
    try {
      const val = await Redis.defaultClient.get(this.cacheKey(url));
      if (val) {
        return JSON.parse(val);
      }
    } catch (err) {
      // just log it, response can still be obtained using the fetch call
      Logger.error("Could not fetch cached Iframely response", err);
    }
  }

  /**
   * Fetches the preview data for the given url
   * using Iframely oEmbed API
   *
   * @param url
   * @returns Preview data for the url
   */
  public static async get(url: string) {
    try {
      const cached = await this.cached(url);
      if (cached) {
        return cached;
      }
      const res = await this.fetch(url);
      await this.cache(url, res);
      return res;
    } catch (err) {
      throw InternalError(err);
    }
  }
}

export default Iframely;
