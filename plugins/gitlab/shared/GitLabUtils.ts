import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import { UnfurlResourceType } from "@shared/types";
import z from "zod";

export const AccessTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
  created_at: z.number(),
});

export const UserInfoResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  avatar_url: z.string().url(),
});

export const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  namespace: z.object({
    id: z.number(),
    full_path: z.string(),
  }),
});

export const projectsSchema = z.array(projectSchema);

const AuthorSchema = z.object({
  username: z.string(),
  avatar_url: z.string().url(),
});

export const IssueSchema = z.object({
  iid: z.number(),
  title: z.string(),
  description: z.string().nullish(),
  web_url: z.string().url(),
  state: z.string(),
  created_at: z.string().datetime(),
  author: AuthorSchema,
  labels: z.array(
    z.object({
      name: z.string(),
      color: z.string(),
    })
  ),
});

export type Issue = z.infer<typeof IssueSchema>;

export const MRSchema = z.object({
  iid: z.number(),
  title: z.string(),
  description: z.string().nullish(),
  web_url: z.string().url(),
  state: z.string(),
  draft: z.boolean(),
  merged_at: z.string().datetime().nullish(),
  created_at: z.string().datetime(),
  author: AuthorSchema,
  labels: z.array(z.string()),
});

export type MR = z.infer<typeof MRSchema>;

export class GitLabUtils {
  private static clientId = env.GITLAB_CLIENT_ID;
  private static gitlabUrl = env.GITLAB_URL ?? "https://gitlab.com";
  private static apiBaseUrl = `${this.gitlabUrl}/api/v4`;
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
   * Makes an authenticated API request to GitLab.
   *
   * @param accessToken - The access token for authentication.
   * @param endpoint - The API endpoint path.
   * @param params - Additional fetch options.
   * @param query - Query parameters to include in the request.
   * @returns The response data from the GitLab API.
   */
  public static async apiRequest({
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
      throw new Error(
        `Failed to fetch from GitLab API: ${endpoint}. ${err instanceof Error ? err.message : ""}`
      );
    }
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
   * @param issueId - The issue IID.
   * @returns The issue data.
   */
  public static async getIssue(
    accessToken: string,
    projectPath: string,
    issueId: number
  ) {
    const encodedPath = encodeURIComponent(projectPath);
    const issue = await this.apiRequest({
      accessToken,
      endpoint: `/projects/${encodedPath}/issues/${issueId}`,
    });

    return IssueSchema.parse(issue);
  }

  /**
   * Fetches a merge request from a GitLab project.
   *
   * @param accessToken - The access token for authentication.
   * @param projectPath - The project path (owner/repo).
   * @param mrId - The merge request IID.
   * @returns The merge request data.
   */
  public static async getMergeRequest(
    accessToken: string,
    projectPath: string,
    mrId: number
  ) {
    const encodedPath = encodeURIComponent(projectPath);
    const mr = await this.apiRequest({
      accessToken,
      endpoint: `/projects/${encodedPath}/merge_requests/${mrId}`,
    });

    return MRSchema.parse(mr);
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
