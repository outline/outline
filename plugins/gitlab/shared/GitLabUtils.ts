import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import { UnfurlResourceType } from "@shared/types";

export class GitLabUtils {
  public static defaultGitlabUrl = "https://gitlab.com";

  private static supportedResources = [
    UnfurlResourceType.Issue,
    UnfurlResourceType.PR,
    UnfurlResourceType.Project,
  ];

  /**
   * Gets the GitLab URL, preferring the provided custom URL over the default.
   *
   * @param customUrl - Optional custom GitLab URL from integration settings.
   * @returns The GitLab URL to use.
   */
  private static getGitlabUrl(customUrl?: string): string {
    return customUrl || this.defaultGitlabUrl;
  }

  /**
   * Gets the OAuth URL for the provided custom GitLab URL or default environment URL.
   *
   * @param customUrl - Optional custom GitLab URL from integration settings.
   * @returns The OAuth URL.
   */
  public static getOauthUrl(customUrl?: string): string {
    return `${this.getGitlabUrl(customUrl)}/oauth`;
  }

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
   * @param customUrl - Optional custom GitLab URL from integration settings.
   * @param customClientId - Optional custom OAuth client ID from integration settings.
   * @returns The full URL to redirect the user to GitLab's OAuth authorization page.
   */
  public static authUrl(
    state: string,
    customUrl?: string,
    customClientId?: string
  ): string {
    const params = new URLSearchParams({
      client_id: customClientId || env.GITLAB_CLIENT_ID,
      redirect_uri: this.callbackUrl(),
      response_type: "code",
      state,
      scope: "read_api read_user",
    });

    return `${this.getOauthUrl(customUrl)}/authorize?${params.toString()}`;
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
   * Parses a GitLab URL and extracts resource identifiers.
   *
   * @param url - The GitLab URL to parse.
   * @param customUrl - Optional custom GitLab URL from integration settings.
   * @returns An object containing resource identifiers or undefined if the URL is invalid.
   */
  public static parseUrl(
    url: string,
    customUrl?: string
  ):
    | {
        owner: string;
        repo: string | undefined;
        type: UnfurlResourceType.Issue | UnfurlResourceType.PR;
        id: number;
        url: string;
      }
    | {
        owner: string;
        repo: string;
        type: UnfurlResourceType.Project;
        url: string;
      }
    | undefined {
    try {
      const parsed = new URL(url);
      const urlHostname = new URL(this.getGitlabUrl(customUrl)).hostname;

      if (parsed.hostname !== urlHostname) {
        return;
      }

      const parts = parsed.pathname.split("/").filter(Boolean);

      // Try base64-encoded `show` query parameter first
      // e.g. /owner/repo/-/issues?show=eyJ...
      const showParam = parsed.searchParams.get("show");
      if (showParam && parts.length >= 4) {
        const resourceType = parts.pop();
        parts.pop(); // separator ("-")
        const repo = parts.pop();
        const owner = parts.join("/");

        const type =
          resourceType === "issues"
            ? UnfurlResourceType.Issue
            : resourceType === "merge_requests"
              ? UnfurlResourceType.PR
              : undefined;

        if (!type || !this.supportedResources.includes(type)) {
          return;
        }

        try {
          const decoded = JSON.parse(atob(decodeURIComponent(showParam)));
          const iid = Number(decoded.iid);
          if (!iid) {
            return;
          }
          return { owner, repo, type, id: iid, url };
        } catch {
          return;
        }
      }

      // Check if it's a project URL (no -/ separator pattern in path)
      if (!parsed.pathname.includes("/-/")) {
        if (parts.length >= 2 && !this.isSystemPath(parts[0])) {
          const repo = parts[parts.length - 1];
          const owner = parts.slice(0, -1).join("/");
          return {
            owner,
            repo,
            type: UnfurlResourceType.Project,
            url,
          };
        }
        return;
      }

      if (parts.length < 5) {
        return;
      }

      // Direct URL: /owner/repo/-/issues/123 or /owner/repo/-/merge_requests/123
      const resourceId = parts.pop();
      const resourceType = parts.pop();
      parts.pop(); // separator ("-")

      const repo = parts.pop();
      const owner = parts.join("/");

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
    } catch {
      return;
    }
  }

  /**
   * Checks if the first path segment is a known GitLab system path.
   *
   * @param segment - the first path segment of the URL.
   * @returns true if the segment is a known system path.
   */
  private static isSystemPath(segment: string): boolean {
    const systemPaths = new Set([
      "explore",
      "help",
      "admin",
      "dashboard",
      "users",
      "groups",
      "projects",
      "snippets",
      "search",
      "-",
    ]);
    return systemPaths.has(segment);
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

  /**
   * Returns a deterministic color for a GitLab project based on its ID.
   * Mirrors GitLab's identicon algorithm: (id % 7) mapped to a palette.
   *
   * @param projectId - the numeric project ID.
   * @returns a hex color string.
   */
  public static getColorForProject(projectId: number): string {
    const palette = [
      "#e05842", // red
      "#a972cc", // purple
      "#5b6abf", // indigo
      "#3e8fda", // blue
      "#42a68c", // teal
      "#e67e3c", // orange
      "#7e7e7e", // neutral
    ];
    return palette[projectId % 7];
  }

  /**
   * Returns the color associated with a given visibility level.
   *
   * @param visibility - The visibility level of the resource.
   * @returns The color associated with the visibility level.
   */
  public static getColorForVisibility(visibility: string): string {
    const visibilityColors: Record<string, string> = {
      public: "#1f75cb",
      internal: "#f8ae1a",
      private: "#848d97",
    };

    return visibilityColors[visibility] ?? "#848d97";
  }
}
