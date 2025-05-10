import queryString from "query-string";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export class GitHubUtils {
  public static clientId = env.GITHUB_CLIENT_ID;

  static get url() {
    return integrationSettingsPath("github");
  }

  /**
   * @param error
   * @returns URL to be redirected to upon authorization error from GitHub
   */
  public static errorUrl(error: string) {
    return `${this.url}?error=${error}`;
  }

  /**
   * @returns Callback URL configured for GitHub, to which users will be redirected upon authorization
   */
  public static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: `${env.URL}`,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/api/github.callback?${params}`
      : `${baseUrl}/api/github.callback`;
  }

  static authUrl(state: string): string {
    const baseUrl = `https://github.com/apps/${env.GITHUB_APP_NAME}/installations/new`;
    const params = {
      client_id: this.clientId,
      redirect_uri: this.callbackUrl(),
      state,
    };
    return `${baseUrl}?${queryString.stringify(params)}`;
  }

  static installRequestUrl(): string {
    return `${this.url}?install_request=true`;
  }

  public static getColorForStatus(status: string, isDraftPR: boolean = false) {
    switch (status) {
      case "open":
        return isDraftPR ? "#848d97" : "#238636";
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
