import { Gitlab } from "@gitbeaker/rest";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import { UnfurlResourceType } from "@shared/types";

export class GitLabUtils {
  private static clientId = env.GITLAB_CLIENT_ID;
  private static gitlabUrl = env.GITLAB_URL ?? "https://gitlab.com";
  private static supportedResources = [
    UnfurlResourceType.Issue,
    UnfurlResourceType.PR,
  ];

  public static oauthUrl = `${this.gitlabUrl}/oauth`;
  public static clientSecret = env.GITLAB_CLIENT_SECRET;

  public static get url() {
    return integrationSettingsPath("gitlab");
  }

  /**
   * Generates the error URL for GitLab authorization errors.
   *
   * @param error - The error message to include in the URL.
   * @returns The URL to redirect to upon authorization error.
   */
  public static errorUrl(error: string): string {
    return `${this.url}?error=${encodeURIComponent(error)}`;
  }

  /**
   * Generates the callback URL for GitLab OAuth.
   *
   * @param baseUrl - The base URL of the application.
   * @param params - Optional query parameters to include in the callback URL.
   * @returns The full callback URL.
   */
  public static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: env.URL,
      params: undefined,
    }
  ): string {
    const callbackPath = "/api/gitlab.callback";
    return params
      ? `${baseUrl}${callbackPath}?${params}`
      : `${baseUrl}${callbackPath}`;
  }

  /**
   * Generates the authorization URL for GitLab OAuth.
   *
   * @param state - A unique state string to prevent CSRF attacks.
   * @returns The full URL to redirect the user to GitLab's OAuth authorization page.
   */
  public static authUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl(),
      response_type: "code",
      state,
      scope: "read_api read_user",
    });

    return `${this.oauthUrl}/authorize?${params.toString()}`;
  }

  /**
   * Generates the installation request URL.
   *
   * @returns The URL for installation requests.
   */
  public static installRequestUrl(): string {
    return `${this.url}?install_request=true`;
  }

  /**
   * Creates a Gitbeaker client instance.
   *
   * @param accessToken - The access token for authentication.
   * @returns A configured Gitbeaker client.
   */
  public static createClient(accessToken: string) {
    return new Gitlab({
      host: this.gitlabUrl,
      oauthToken: accessToken,
    });
  }

  /**
   * Parses a GitLab URL and extracts resource identifiers.
   *
   * @param url - The GitLab URL to parse.
   * @returns An object containing resource identifiers or undefined if the URL is invalid.
   */
  public static parseUrl(url: string) {
    const { hostname, pathname } = new URL(url);
    const urlHostname = new URL(this.gitlabUrl).hostname;

    if (hostname !== urlHostname) {
      return;
    }

    const parts = pathname.split("/").filter(Boolean);
    if (parts.length < 5) {
      // Not a valid GitLab MR or issue URL
      return;
    }

    // GitLab URLs: /owner/repo/-/issues/123 or /owner/repo/-/merge_requests/123
    const resourceId = parts.pop(); // Last part is the ID
    const resourceType = parts.pop(); // Second to last is the type
    parts.pop(); // Third to last is the separator ("-")

    const repo = parts.pop(); // Fourth to last is the project/repo
    const owner = parts.join("/"); // Everything before is the owner

    const type =
      resourceType === "issues"
        ? UnfurlResourceType.Issue
        : resourceType === "merge_requests"
          ? UnfurlResourceType.PR
          : undefined;

    if (!type || !this.supportedResources.includes(type)) {
      return;
    }

    return {
      owner,
      repo,
      type,
      id: Number(resourceId),
      url,
    };
  }

  /**
   * Fetches an issue from a GitLab project.
   *
   * @param accessToken - The access token for authentication.
   * @param projectPath - The project path (owner/repo).
   * @param issueIid - The issue IID (internal ID within the project).
   * @returns The issue data.
   */
  public static async getIssue(
    accessToken: string,
    projectPath: string,
    issueIid: number
  ) {
    const client = this.createClient(accessToken);

    const issues = await client.Issues.all({
      projectId: projectPath,
      iids: [issueIid],
      withLabelsDetails: true,
    });

    if (!issues || issues.length === 0) {
      throw new Error(`Issue ${issueIid} not found in project ${projectPath}`);
    }

    return issues[0];
  }

  /**
   * Fetches a merge request from a GitLab project.
   *
   * @param accessToken - The access token for authentication.
   * @param projectPath - The project path (owner/repo).
   * @param mrIid - The merge request IID (internal ID within the project).
   * @returns The merge request data.
   */
  public static async getMergeRequest(
    accessToken: string,
    projectPath: string,
    mrIid: number
  ) {
    const client = this.createClient(accessToken);
    // MergeRequests.show properly accepts projectId and mergerequestIId
    const mr = await client.MergeRequests.show(projectPath, mrIid);
    return mr;
  }

  /**
   * Returns the color associated with a given status.
   *
   * @param status - The status of the resource.
   * @param isDraftMR - Whether the resource is a draft merge request.
   * @returns The color associated with the status.
   */
  public static getColorForStatus(
    status: string,
    isDraftMR: boolean = false
  ): string {
    const statusColors: Record<string, string> = {
      opened: isDraftMR ? "#848d97" : "#1f75cb",
      done: "#a371f7",
      closed: "#f85149",
      merged: "#8250df",
      canceled: "#848d97",
    };

    return statusColors[status] ?? "#848d97";
  }
}
