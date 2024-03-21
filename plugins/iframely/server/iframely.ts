import type { Unfurl } from "@shared/types";
import { InternalError } from "@server/errors";
import fetch from "@server/utils/fetch";
import env from "./env";

class Iframely {
  private static apiUrl = `${env.IFRAMELY_URL}/api`;
  private static apiKey = env.IFRAMELY_API_KEY;

  public static async fetch(url: string, type = "oembed") {
    try {
      const res = await fetch(
        `${this.apiUrl}/${type}?url=${encodeURIComponent(url)}&api_key=${
          this.apiKey
        }`
      );
      return res.json();
    } catch (err) {
      throw InternalError(err);
    }
  }

  /**
   * Fetches the preview data for the given url using Iframely oEmbed API
   *
   * @param url
   * @returns Preview data for the url
   */
  public static async unfurl(url: string): Promise<Unfurl | false> {
    return Iframely.fetch(url);
  }
}

export default Iframely;
