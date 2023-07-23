import fetch from "fetch-with-proxy";
import env from "@server/env";
import { InvalidRequestError } from "@server/errors";

class Iframely {
  private static apiUrl = `${env.IFRAMELY_URL}/api`;
  private static apiKey = env.IFRAMELY_API_KEY;

  public static async get(url: string, type = "oembed") {
    try {
      const res = await fetch(
        `${this.apiUrl}/${type}?url=${encodeURIComponent(url)}&api_key=${
          this.apiKey
        }`
      );
      const data = await res.json();
      return data;
    } catch (err) {
      throw InvalidRequestError(err);
    }
  }
}

export default Iframely;
