import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export class GitHubUtils {
  public static allowedResources = ["pull", "issues"];

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

  /**
   * Parses a GitHub like URL to obtain info like repo name, owner, resource type(issue or PR).
   *
   * @param url URL to parse
   * @returns An object containing repository, owner, resource type(issue or pull request) and resource id
   */
  public static parseUrl(url: string) {
    const { hostname, pathname } = new URL(url);
    if (hostname !== "github.com") {
      return {};
    }

    const [, owner, repo, resourceType, resourceId] = pathname.split("/");

    if (!this.allowedResources.includes(resourceType)) {
      return {};
    }

    return { owner, repo, resourceType, resourceId };
  }
}
