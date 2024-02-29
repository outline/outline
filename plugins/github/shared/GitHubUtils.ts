import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export class GitHubUtils {
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
  public static callbackUrl({
    baseUrl = `${env.URL}/api/github.callback`,
    params,
  }: {
    baseUrl: string;
    params?: string;
  }) {
    return `${baseUrl}/api/github.callback?${params}`;
  }

  static authUrl(
    state: string,
    clientId: string,
    redirectUri = `${env.URL}/api/github.callback`
  ): string {
    const baseUrl = `https://github.com/apps/${env.GITHUB_APP_NAME}/installations/new`;
    const params = {
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    };
    const urlParams = Object.keys(params)
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join("&");
    return `${baseUrl}?${urlParams}`;
  }
}
