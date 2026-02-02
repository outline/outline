import queryString from "query-string";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export class JiraUtils {
  public static consumerKey = env.JIRA_CONSUMER_KEY;
  public static jiraUrl = env.JIRA_URL;

  static get url() {
    return integrationSettingsPath("jira");
  }

  /**
   * @param error
   * @returns URL to be redirected to upon authorization error from Jira
   */
  public static errorUrl(error: string) {
    return `${this.url}?error=${error}`;
  }

  /**
   * @returns Callback URL configured for Jira, to which users will be redirected upon authorization
   */
  public static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: env.URL,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/api/integrations.jira.callback?${params}`
      : `${baseUrl}/api/integrations.jira.callback`;
  }

  /**
   * Returns the URL for Jira OAuth authorization
   */
  static authUrl(state: string): string {
    const baseUrl = `${this.jiraUrl}/plugins/servlet/oauth/authorize`;
    const params = {
      oauth_callback: this.callbackUrl(),
      oauth_consumer_key: this.consumerKey,
      state,
    };
    return `${baseUrl}?${queryString.stringify(params)}`;
  }
}
