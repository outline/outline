import queryString from "query-string";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import { UnfurlResourceType } from "@shared/types";

export class GitLabUtils {
  private static clientId = env.GITLAB_CLIENT_ID;
  private static gitlabUrl = env.GITLAB_URL ?? "https://gitlab.com";
  private static apiBaseUrl = `${this.gitlabUrl}/api/v4`;
  private static supportedResources = [
    UnfurlResourceType.Issue,
    UnfurlResourceType.PR,
  ];

  public static oauthUrl = `${this.gitlabUrl}/oauth`;

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
    const baseUrl = `${this.oauthUrl}/authorize`;
    const params = {
      client_id: this.clientId,
      redirect_uri: this.callbackUrl(),
      response_type: "code",
      state,
      scope: "read_api read_user",
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
   * Makes an authenticated API request to GitLab
   *
   * @param accessToken Access token for authentication
   * @param endpoint API endpoint path
   * @returns Response data from GitLab API
   */
  static async apiRequest({
    accessToken,
    endpoint,
    params,
    query,
  }: {
    accessToken: string;
    endpoint: string;
    params?: RequestInit;
    query?: Record<string, string | number | boolean>;
  }): Promise<any> {
    const url = new URL(`${this.apiBaseUrl}${endpoint}`);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    try {
      const response = await fetch(url.toString(), {
        ...params,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...params?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(
          `GitLab API error: ${response.status} ${response.statusText} (${endpoint})`
        );
      }

      return response.json();
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(`Failed to fetch from GitLab API: ${endpoint}`);
    }
  }

  /**
   * Parses a given URL and returns resource identifiers for GitLab specific URLs
   *
   * @param url URL to parse
   * @returns Containing resource identifiers - `owner`, `repo`, `type` and `id`.
   */
  public static parseUrl(url: string) {
    const { hostname, pathname } = new URL(url);
    const urlHostname = new URL(this.gitlabUrl).hostname;
    if (hostname !== urlHostname) {
      return;
    }

    // GitLab URLs: /owner/repo/-/issues/123 or /owner/repo/-/merge_requests/123
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length < 4) {
      return;
    }

    const owner = parts[0];
    const repo = parts[1];

    // Find the resource type index
    let typeIndex = -1;
    let type: UnfurlResourceType | undefined;

    if (parts.includes("issues")) {
      typeIndex = parts.indexOf("issues");
      type = UnfurlResourceType.Issue;
    } else if (parts.includes("merge_requests")) {
      typeIndex = parts.indexOf("merge_requests");
      type = UnfurlResourceType.PR;
    }

    if (typeIndex === -1 || !type) {
      return;
    }

    const id = Number(parts[typeIndex + 1]);

    if (!type || !this.supportedResources.includes(type)) {
      return;
    }

    return { owner, repo, type, id, url };
  }

  /**
   * Fetches an issue from a GitLab project
   *
   * @param accessToken Access token for authentication
   * @param projectPath Project path (owner/repo)
   * @param issueId Issue IID
   * @returns Issue data
   */
  public static async getIssue(
    accessToken: string,
    projectPath: string,
    issueId: number
  ) {
    const encodedPath = encodeURIComponent(projectPath);
    const issue = GitLabUtils.apiRequest({
      accessToken,
      endpoint: `/projects/${encodedPath}/issues/${issueId}`,
    });

    return issue;
  }

  /**
   * Fetches a merge request from a GitLab project
   *
   * @param accessToken Access token for authentication
   * @param projectPath Project path (owner/repo)
   * @param mrId Merge request IID
   * @returns Merge request data
   */
  public static async getMergeRequest(
    accessToken: string,
    projectPath: string,
    mrId: number
  ) {
    const encodedPath = encodeURIComponent(projectPath);
    return GitLabUtils.apiRequest({
      accessToken,
      endpoint: `/projects/${encodedPath}/merge_requests/${mrId}`,
    });
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
