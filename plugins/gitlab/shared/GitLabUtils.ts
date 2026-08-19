import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import { UnfurlResourceType } from "@shared/types";

export const GitLabOAuthNonceCookie = "gitlabOAuthNonce";

export type OAuthState = {
  teamId: string;
  nonce: string;
};

/** The kind of namespace a resource belongs to. */
export type GitLabScope = "project" | "group";

export class GitLabUtils {
  public static defaultGitlabUrl = "https://gitlab.com";

  /** Fallback color for labels returned without color details. */
  public static defaultLabelColor = "#6B7280";

  /** The separator GitLab puts between a namespace and the resource path. */
  private static separator = "/-/";

  /** Maps the resource segment of a URL to a resource type, per scope. */
  private static resourceTypes: Record<
    string,
    Partial<
      Record<GitLabScope, UnfurlResourceType.Issue | UnfurlResourceType.PR>
    >
  > = {
    issues: { project: UnfurlResourceType.Issue },
    merge_requests: { project: UnfurlResourceType.PR },
    // Group-scoped work items are epics, which are shown as issues.
    work_items: {
      project: UnfurlResourceType.Issue,
      group: UnfurlResourceType.Issue,
    },
    epics: { group: UnfurlResourceType.Issue },
  };

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
   * @param state - The OAuth state with teamId for routing and nonce for CSRF.
   * @param customUrl - Optional custom GitLab URL from integration settings.
   * @param customClientId - Optional custom OAuth client ID from integration settings.
   * @returns The full URL to redirect the user to GitLab's OAuth authorization page.
   */
  public static authUrl(
    state: OAuthState,
    customUrl?: string,
    customClientId?: string
  ): string {
    const params = new URLSearchParams({
      client_id: customClientId || env.GITLAB_CLIENT_ID,
      redirect_uri: this.callbackUrl(),
      response_type: "code",
      state: JSON.stringify(state),
      scope: "read_api read_user",
    });

    return `${this.getOauthUrl(customUrl)}/authorize?${params.toString()}`;
  }

  /**
   * Parses an OAuth state string from a GitLab callback.
   *
   * @param state - The state string carried in the callback query.
   * @returns The parsed OAuth state.
   */
  public static parseState(state: string): OAuthState | undefined {
    try {
      return JSON.parse(state);
    } catch {
      return undefined;
    }
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
        scope?: "group";
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
    let parsed: URL;

    try {
      parsed = new URL(url);
      if (parsed.hostname !== new URL(this.getGitlabUrl(customUrl)).hostname) {
        return;
      }
    } catch {
      return;
    }

    const { pathname } = parsed;
    const separatorIndex = pathname.indexOf(this.separator);

    // Project URL, e.g. /owner/repo
    if (separatorIndex === -1) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length < 2 || this.isSystemPath(parts[0])) {
        return;
      }
      return {
        owner: parts.slice(0, -1).join("/"),
        repo: parts[parts.length - 1],
        type: UnfurlResourceType.Project,
        url,
      };
    }

    // e.g. /owner/repo/-/issues/123 or /groups/owner/-/work_items/123
    const namespace = pathname
      .slice(0, separatorIndex)
      .split("/")
      .filter(Boolean);
    const [segment, resourceId] = pathname
      .slice(separatorIndex + this.separator.length)
      .split("/");

    // Epics are group-scoped, and so carry no repo.
    const scope: GitLabScope = namespace[0] === "groups" ? "group" : "project";
    if (scope === "group") {
      namespace.shift();
    }

    const type = this.resourceTypes[segment]?.[scope];
    if (!type) {
      return;
    }

    // List views carry the id in a base64-encoded `show` parameter instead.
    const showParam = parsed.searchParams.get("show");
    const id = showParam ? this.parseShowParam(showParam) : Number(resourceId);
    if (!id) {
      return;
    }

    const repo = scope === "group" ? undefined : namespace.pop();
    const owner = namespace.join("/");
    if (!owner) {
      return;
    }

    const resource = { owner, repo, type, id, url };
    return scope === "group" ? { ...resource, scope } : resource;
  }

  /**
   * Parses the base64-encoded `show` query parameter used by GitLab list views.
   *
   * @param showParam - the raw query parameter value.
   * @returns the resource IID, or undefined when it cannot be parsed.
   */
  private static parseShowParam(showParam: string): number | undefined {
    try {
      const decoded = JSON.parse(atob(decodeURIComponent(showParam)));
      return Number(decoded.iid) || undefined;
    } catch {
      return undefined;
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
   * Sanitizes GitLab-flavored markdown to standard markdown compatible with
   * our editor. Strips or converts GitLab-specific syntax that would otherwise
   * render as raw text in previews.
   *
   * Note: This is for display purposes only and is not a security boundary.
   * Do not rely on this to sanitize untrusted HTML.
   *
   * @param text - the markdown text to sanitize.
   * @returns the sanitized text, or null if input is null/undefined.
   */
  public static sanitizeGitLabMarkdown(
    text: string | null | undefined
  ): string | null {
    if (!text) {
      return null;
    }

    // Strip HTML comments repeatedly in case of overlapping patterns like
    // `<!<!-- x -->-- -->` that would leave `<!--` after a single pass.
    let result = text;
    let prev: string;
    do {
      prev = result;
      result = result.replace(/<!--[\s\S]*?-->/g, "");
    } while (result !== prev);

    return (
      result
        // YAML front matter
        .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
        // Collapsible sections: extract inner content
        .replace(
          /<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi,
          "**$1**\n$2"
        )
        // TOC markers
        .replace(/\[\[_TOC_\]\]/g, "")
        .replace(/^\[TOC\]$/gm, "")
        // Inline diffs
        .replace(/\{\+([\s\S]*?)\+\}/g, "$1")
        .replace(/\[-([\s\S]*?)-\]/g, "~~$1~~")
        // Multiline blockquotes
        .replace(/^>>>\s*$/gm, "")
        // Footnote definitions
        .replace(/^\[\^[^\]]+\]:\s+.*$/gm, "")
        // Footnote references
        .replace(/\[\^([^\]]+)\]/g, "")
        // Include directives
        .replace(/^::include\{[^}]*\}$/gm, "")
        // Clean up excessive blank lines left by removals
        .replace(/\n{3,}/g, "\n\n")
        .trim() || null
    );
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
