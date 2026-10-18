import { toError, errToString } from "@shared/utils/error";
import type { JSONObject } from "@shared/types";
import { UnfurlResourceType } from "@shared/types";
import Logger from "@server/logging/Logger";
import type { UnfurlError, UnfurlSignature } from "@server/types";
import fetch from "@server/utils/fetch";
import env from "./env";
import { cdnPath } from "@shared/utils/urls";
import { Day } from "@shared/utils/time";

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
      Logger.error(
        `Error fetching data from Iframely for url: ${url}`,
        toError(err)
      );
      return {
        error: errToString(err) || "Unknown error",
      };
    }
  }

  /**
   *
   * @param url Resource url
   * @returns An object containing resource details e.g, resource title, description etc.
   */
  public static unfurl: UnfurlSignature = async (url: string) => {
    const data = await Iframely.requestResource(url);

    // In addition to our custom UnfurlError, sometimes iframely returns error in the response body.
    if ("error" in data) {
      return {
        error: String(data.error),
        cacheExpiry: Iframely.isPermanentError(
          "status" in data ? data.status : undefined
        )
          ? Day.seconds
          : undefined,
      } satisfies UnfurlError;
    }

    const parsedData = data as {
      url: string;
      meta: { title: string; description: string; site: string };
      links: {
        thumbnail?: { href: string }[];
        icon?: { href: string }[];
      };
    };

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
    };
  };

  /**
   * Whether an error status returned by Iframely is expected to be the same on
   * the next request, such as a private or missing page.
   *
   * @param status the status code from the Iframely response body.
   * @returns true if the error is not transient.
   */
  private static isPermanentError(status: unknown) {
    return (
      typeof status === "number" &&
      status >= 400 &&
      status < 500 &&
      ![408, 418, 429].includes(status)
    );
  }
}

export default Iframely;
