import type { JSONObject } from "@shared/types";
import { UnfurlResourceType } from "@shared/types";
import Logger from "@server/logging/Logger";
import type { UnfurlError, UnfurlSignature } from "@server/types";
import fetch from "@server/utils/fetch";
import env from "./env";
import { cdnPath } from "@shared/utils/urls";

class Iframely {
  public static defaultUrl = "https://iframe.ly";

  public static async requestResource(
    url: string,
    type = "iframely"
  ): Promise<JSONObject | UnfurlError> {
    const isDefaultHost = env.IFRAMELY_URL === this.defaultUrl;

    // Cloud Iframely requires /api path, while self-hosted does not.
    const apiUrl = isDefaultHost ? `${env.IFRAMELY_URL}/api` : env.IFRAMELY_URL;

    try {
      const res = await fetch(
        `${apiUrl}/${type}?url=${encodeURIComponent(url)}&api_key=${
          env.IFRAMELY_API_KEY
        }`,
        {
          timeout: 10000, // 10 second timeout
        }
      );
      return await res.json();
    } catch (err) {
      Logger.error(`Error fetching data from Iframely for url: ${url}`, err);
      return { error: err.message || "Unknown error" };
    }
  }

  /**
   *
   * @param url Resource url
   * @returns An object containing resource details e.g, resource title, description etc.
   */
  public static unfurl: UnfurlSignature = async (url: string) => {
    const data = await Iframely.requestResource(url);

    if ("error" in data) {
      return { error: data.error } as UnfurlError; // In addition to our custom UnfurlError, sometimes iframely returns error in the response body.
    }

    const parsedData = data as Record<string, any>;

    return {
      type: UnfurlResourceType.URL,
      url: parsedData.url,
      title: parsedData.meta.title,
      description: parsedData.meta.description,
      thumbnailUrl: (parsedData.links.thumbnail ?? [])[0]?.href ?? "",
      faviconUrl:
        parsedData.meta.site === "Figma"
          ? cdnPath("/images/figma.png")
          : ((parsedData.links.icon ?? [])[0]?.href ?? ""),
      transformedUnfurl: true,
    };
  };
}

export default Iframely;
