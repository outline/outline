import { UnfurlPreviewData, UnfurlResourceType } from "@shared/types";
import { InternalError } from "@server/errors";
import fetch from "@server/utils/fetch";
import env from "./env";

class Iframely {
  public static defaultUrl = "https://iframe.ly";

  public static async fetch(url: string, type = "oembed") {
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

  private static transformData = (
    data: Record<string, any>
  ): UnfurlPreviewData[UnfurlResourceType.OEmbed] => ({
    url: data.url,
    type: data.type,
    title: data.title,
    description: data.description,
    thumbnailUrl: data.thumbnail_url,
  });

  /**
   * Fetches the preview data for the given url using Iframely oEmbed API
   *
   * @param url
   * @returns Preview data for the url
   */
  public static async unfurl(url: string) {
    const data = await Iframely.fetch(url);
    return Iframely.transformData(data);
  }
}

export default Iframely;
