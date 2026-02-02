import queryString from "query-string";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export class TrelloUtils {
  public static apiKey = env.TRELLO_API_KEY;

  static get url() {
    return integrationSettingsPath("trello");
  }

  /**
   * @param error
   * @returns URL to be redirected to upon authorization error from Trello
   */
  public static errorUrl(error: string) {
    return `${this.url}?error=${error}`;
  }

  /**
   * @returns Callback URL configured for Trello, to which users will be redirected upon authorization
   */
  public static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: env.URL,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/api/integrations.trello.callback?${params}`
      : `${baseUrl}/api/integrations.trello.callback`;
  }

  /**
   * Returns the URL for Trello OAuth authorization
   */
  static authUrl(state: string): string {
    const baseUrl = "https://trello.com/1/OAuthAuthorizeToken";
    const params = {
      oauth_callback: this.callbackUrl(),
      scope: "read",
      expiration: "never",
      name: "Outline",
      key: this.apiKey,
      return_url: this.callbackUrl(),
      state,
    };
    return `${baseUrl}?${queryString.stringify(params)}`;
  }
}
