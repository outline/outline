import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import env from "@server/env";

export class Github {
  /**
   * Github settings url
   */
  public static url = integrationSettingsPath("github");

  public static clientId = env.GITHUB_CLIENT_ID;
  public static clientSecret = env.GITHUB_CLIENT_SECRET;
  public static clientType = "github-app";

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
  public static callbackUrl({
    baseUrl = `${env.URL}/api/github.callback`,
    params,
  }: {
    baseUrl: string;
    params?: string;
  }) {
    return `${baseUrl}/api/github.callback?${params}`;
  }
}
