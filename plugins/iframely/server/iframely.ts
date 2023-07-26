import fetch from "fetch-with-proxy";
import env from "@server/env";
import { InternalError } from "@server/errors";
import Redis from "@server/redis";

class Iframely {
  private static apiUrl = `${env.IFRAMELY_URL}/api`;
  private static apiKey = env.IFRAMELY_API_KEY;
  private static cacheKeyPrefix = "unfurl";

  private static cacheKey(url: string) {
    return `${this.cacheKeyPrefix}-${url}`;
  }

  private static async cache(url: string) {
    const data = await this.fetch(url);

    if (!data.error) {
      await Redis.defaultClient.set(
        this.cacheKey(url),
        JSON.stringify(data),
        "EX",
        data.cache_age
      );
    }

    return data;
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
    const val = await Redis.defaultClient.get(this.cacheKey(url));
    if (val) {
      return JSON.parse(val);
    }
  }

  public static async get(url: string) {
    try {
      const cached = await this.cached(url);
      return cached ? cached : this.cache(url);
    } catch (err) {
      throw InternalError(err);
    }
  }
}

export default Iframely;
