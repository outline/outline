import queryString from "query-string";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export class GitLabUtils {
  public static clientId = env.GITLAB_CLIENT_ID;
  public static oauthUrl = "https://gitlab.com/oauth";
  public static apiBaseUrl = "https://gitlab.com/api/v4";

  static get url() {
    return integrationSettingsPath("gitlab");
  }

  /**
   * @param error
   * @returns URL to be redirected to upon authorization error from GitLab
   */
  public static errorUrl(error: string) {
    return `${this.url}?error=${error}`;
  }

  /**
   * @returns Callback URL configured for GitLab, to which users will be redirected upon authorization
   */
  public static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: env.URL,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/api/gitlab.callback?${params}`
      : `${baseUrl}/api/gitlab.callback`;
  }

  /**
   * Generates the authorization URL for GitLab OAuth.
   *
   * @param {string} state - A unique state string to prevent CSRF attacks and maintain state between the request and callback.
   * @returns {string} - The full URL to redirect the user to GitLab's OAuth authorization page.
   */
  static authUrl(state: string): string {
    const baseUrl = `https://gitlab.com/oauth/authorize`;
    const params = {
      client_id: this.clientId,
      redirect_uri: this.callbackUrl(),
      response_type: "code",
      state,
      scope: "api read_api read_user",
    };

    return `${baseUrl}?${queryString.stringify(params)}`;
  }

  /**
   * @returns URL for installation requests
   */
  static installRequestUrl(): string {
    return `${this.url}?install_request=true`;
  }

  /**
   * @param status
   * @param isDraftMR
   * @returns Color associated with the given status
   */
  public static getColorForStatus(status: string, isDraftMR: boolean = false) {
    switch (status) {
      case "opened":
        return isDraftMR ? "#848d97" : "#1f75cb";
      case "done":
        return "#a371f7";
      case "closed":
        return "#f85149";
      case "merged":
        return "#8250df";
      case "canceled":
      default:
        return "#848d97";
    }
  }
}
