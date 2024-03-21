import { InternalError } from "@server/errors";
import fetch from "@server/utils/fetch";
import env from "./env";

class Iframely {
  private static apiUrl = `${env.IFRAMELY_URL}/api`;
  private static apiKey = env.IFRAMELY_API_KEY;

  /**
   * Fetches the preview data for the given url using Iframely oEmbed API
   *
   * @param url
   * @returns Preview data for the url
   */
  public static unfurl = async (url: string) => {
    try {
      const res = await fetch(
        `${this.apiUrl}/oembed?url=${encodeURIComponent(url)}&api_key=${
          this.apiKey
        }`
      );
      return res.json();
    } catch (err) {
      throw InternalError(err);
    }
  };
}

export default Iframely;
