import { JSONObject, UnfurlResourceType } from "@shared/types";
import Logger from "@server/logging/Logger";
import { UnfurlSignature } from "@server/types";
import fetch from "@server/utils/fetch";
import env from "./env";

class Iframely {
  public static defaultUrl = "https://iframe.ly";

  public static async requestResource(
    url: string,
    type = "oembed"
  ): Promise<JSONObject | undefined> {
    const isDefaultHost = env.IFRAMELY_URL === this.defaultUrl;

    // Cloud Iframely requires /api path, while self-hosted does not.
    const apiUrl = isDefaultHost ? `${env.IFRAMELY_URL}/api` : env.IFRAMELY_URL;

    try {
      const res = await fetch(
        `${apiUrl}/${type}?url=${encodeURIComponent(url)}&api_key=${
          env.IFRAMELY_API_KEY
        }`
      );
      return await res.json();
    } catch (err) {
      Logger.error(`Error fetching data from Iframely for url: ${url}`, err);
      return;
    }
  }

  /**
   *
   * @param url Resource url
   * @returns An object containing resource details e.g, resource title, description etc.
   */
  public static unfurl: UnfurlSignature = async (url: string) => {
    const data = await Iframely.requestResource(url);
    return { ...data, type: UnfurlResourceType.OEmbed };
  };
}

export default Iframely;
