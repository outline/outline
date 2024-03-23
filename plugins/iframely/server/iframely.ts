import type { Unfurl } from "@shared/types";
import { InternalError } from "@server/errors";
import fetch from "@server/utils/fetch";
import env from "./env";

class Iframely {
  public static defaultUrl = "https://iframe.ly";

  public static async fetch(
    url: string,
    type = "oembed"
  ): Promise<Unfurl | void> {
    const isDefaultHost = env.IFRAMELY_URL === this.defaultUrl;

    // Cloud Iframely requires /api path, while self-hosted does not.
    const apiUrl = isDefaultHost ? `${env.IFRAMELY_URL}/api` : env.IFRAMELY_URL;

    try {
      const res = await fetch(
        `${apiUrl}/${type}?url=${encodeURIComponent(url)}&api_key=${
          env.IFRAMELY_API_KEY
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
  public static async unfurl(url: string): Promise<Unfurl | void> {
    return Iframely.fetch(url);
  }
}

export default Iframely;
