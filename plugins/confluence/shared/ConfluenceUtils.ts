import queryString from "query-string";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export class ConfluenceUtils {
  public static clientId = env.CONFLUENCE_CLIENT_ID;
  public static confluenceUrl = env.CONFLUENCE_URL;

  static get url() {
    return integrationSettingsPath("confluence");
  }

  /**
   * @param error
   * @returns URL to be redirected to upon authorization error from Confluence
   */
  public static errorUrl(error: string) {
    return `${this.url}?error=${error}`;
  }

  /**
   * @returns Callback URL configured for Confluence, to which users will be redirected upon authorization
   */
  public static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: env.URL,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/api/integrations.confluence.callback?${params}`
      : `${baseUrl}/api/integrations.confluence.callback`;
  }

  /**
   * Returns the URL for Confluence OAuth authorization
   */
  static authUrl(state: string): string {
    const baseUrl = `${this.confluenceUrl}/plugins/servlet/oauth/authorize`;
    const params = {
      oauth_callback: this.callbackUrl(),
      oauth_consumer_key: this.clientId,
      state,
    };
    return `${baseUrl}?${queryString.stringify(params)}`;
  }
}
