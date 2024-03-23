import queryString from "query-string";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export class GitHubUtils {
  public static clientId = env.GITHUB_CLIENT_ID;

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

  public static getColorForStatus(status: string) {
    switch (status) {
      case "open":
        return "#238636";
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
