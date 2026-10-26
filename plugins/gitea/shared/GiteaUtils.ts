import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import { MentionType, UnfurlResourceType } from "@shared/types";

export const GiteaOAuthNonceCookie = "giteaOAuthNonce";

export type OAuthState = {
  teamId: string;
  nonce: string;
};

/** A resource parsed from a Gitea URL. */
export type GiteaResource =
  | {
      owner: string;
      repo: string;
      type: UnfurlResourceType.Issue | UnfurlResourceType.PR;
      id: number;
      url: string;
    }
  | {
      owner: string;
      repo: string;
      type: UnfurlResourceType.Project;
      url: string;
    };

export class GiteaUtils {
  /** Fallback color for labels returned without color details. */
  public static defaultLabelColor = "#6B7280";

  /** The OAuth scopes requested from Gitea. */
  public static scopes = [
    "read:user",
    "read:organization",
    "read:repository",
    "read:issue",
  ];

  /** Top-level paths that Gitea reserves, which are never an owner. */
  private static systemPaths = new Set([
    "-",
    ".well-known",
    "admin",
    "api",
    "assets",
    "attachments",
    "avatars",
    "explore",
    "issues",
    "login",
    "milestones",
    "notifications",
    "org",
    "pulls",
    "repo",
    "user",
  ]);

  public static get url() {
    return integrationSettingsPath("gitea");
  }

  /**
   * Gets the OAuth URL for a Gitea instance.
   *
   * @param baseUrl - the URL of the Gitea instance.
   * @returns the OAuth URL.
   */
  public static getOauthUrl(baseUrl: string): string {
    return `${baseUrl}/login/oauth`;
  }

  /**
   * Gets the API URL for a Gitea instance.
   *
   * @param baseUrl - the URL of the Gitea instance.
   * @returns the API URL.
   */
  public static getApiUrl(baseUrl: string): string {
    return `${baseUrl}/api/v1`;
  }

  /**
   * Generates the error URL for Gitea authorization errors.
   *
   * @param error - the error message to include in the URL.
   * @returns the URL to redirect to upon authorization error.
   */
  public static errorUrl(error: string): string {
    return `${this.url}?error=${encodeURIComponent(error)}`;
  }

  /**
   * Generates the callback URL for Gitea OAuth.
   *
   * @param baseUrl - the base URL of the application.
   * @param params - optional query parameters to include in the callback URL.
   * @returns the full callback URL.
   */
  public static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: env.URL,
      params: undefined,
    }
  ): string {
    const callbackPath = "/api/gitea.callback";
    return params
      ? `${baseUrl}${callbackPath}?${params}`
      : `${baseUrl}${callbackPath}`;
  }

  /**
   * Generates the authorization URL for Gitea OAuth.
   *
   * @param state - the OAuth state with teamId for routing and nonce for CSRF.
   * @param baseUrl - the URL of the Gitea instance.
   * @param clientId - the OAuth client ID of the Gitea application.
   * @returns the full URL to redirect the user to Gitea's authorization page.
   */
  public static authUrl(
    state: OAuthState,
    baseUrl: string,
    clientId: string
  ): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.callbackUrl(),
      response_type: "code",
      state: JSON.stringify(state),
      scope: this.scopes.join(" "),
    });

    return `${this.getOauthUrl(baseUrl)}/authorize?${params.toString()}`;
  }

  /**
   * Parses an OAuth state string from a Gitea callback.
   *
   * @param state - the state string carried in the callback query.
   * @returns the parsed OAuth state.
   */
  public static parseState(state: string): OAuthState | undefined {
    try {
      return JSON.parse(state);
    } catch {
      return undefined;
    }
  }

  /**
   * Parses a Gitea URL and extracts resource identifiers.
   *
   * @param url - the Gitea URL to parse.
   * @param baseUrl - the URL of the Gitea instance, which may include a path.
   * @returns the resource identifiers, or undefined if the URL is not recognized.
   */
  public static parseUrl(
    url: string,
    baseUrl: string
  ): GiteaResource | undefined {
    let parsed: URL;
    let base: URL;

    try {
      parsed = new URL(url);
      base = new URL(baseUrl);
    } catch {
      return;
    }

    if (parsed.host !== base.host) {
      return;
    }

    // Instances can be served from a sub-path, e.g. https://example.com/gitea
    const basePath = base.pathname.replace(/\/+$/, "");
    if (basePath && !parsed.pathname.startsWith(`${basePath}/`)) {
      return;
    }

    const parts = parsed.pathname
      .slice(basePath.length)
      .split("/")
      .filter(Boolean);
    if (parts.length < 2 || this.systemPaths.has(parts[0])) {
      return;
    }

    const [owner, repo, segment, resourceId] = parts;

    // Repository URL, e.g. /owner/repo
    if (parts.length === 2) {
      return { owner, repo, type: UnfurlResourceType.Project, url };
    }

    // e.g. /owner/repo/issues/123 or /owner/repo/pulls/123
    const type =
      segment === "issues"
        ? UnfurlResourceType.Issue
        : segment === "pulls"
          ? UnfurlResourceType.PR
          : undefined;
    const id = Number(resourceId);
    if (!type || !Number.isInteger(id) || id <= 0) {
      return;
    }

    return { owner, repo, type, id, url };
  }

  /**
   * Determines the type of mention a Gitea URL represents.
   *
   * @param url - the URL to evaluate.
   * @param baseUrl - the URL of the Gitea instance.
   * @returns the mention type, or undefined if the URL cannot be mentioned.
   */
  public static mentionType(
    url: URL,
    baseUrl: string
  ): MentionType | undefined {
    switch (this.parseUrl(url.toString(), baseUrl)?.type) {
      case UnfurlResourceType.PR:
        return MentionType.PullRequest;
      case UnfurlResourceType.Issue:
        return MentionType.Issue;
      case UnfurlResourceType.Project:
        return MentionType.Project;
      default:
        return undefined;
    }
  }

  /**
   * Returns the color associated with a given status.
   *
   * @param status - the status of the resource.
   * @param isDraft - whether the resource is a draft pull request.
   * @returns the color associated with the status.
   */
  public static getColorForStatus(
    status: string,
    isDraft: boolean = false
  ): string {
    const statusColors: Record<string, string> = {
      open: isDraft ? "#848d97" : "#21ba45",
      closed: "#db2828",
      merged: "#a333c8",
    };
    return statusColors[status] ?? "#848d97";
  }

  /**
   * Returns a deterministic color for a Gitea repository based on its ID.
   *
   * @param repositoryId - the numeric repository ID.
   * @returns a hex color string.
   */
  public static getColorForRepository(repositoryId: number): string {
    const palette = [
      "#e05842",
      "#a972cc",
      "#5b6abf",
      "#3e8fda",
      "#42a68c",
      "#e67e3c",
      "#7e7e7e",
    ];
    return palette[repositoryId % palette.length];
  }

  /**
   * Returns the color associated with a given visibility level.
   *
   * @param visibility - the visibility level of the repository.
   * @returns the color associated with the visibility level.
   */
  public static getColorForVisibility(visibility: string): string {
    const visibilityColors: Record<string, string> = {
      public: "#21ba45",
      internal: "#f8ae1a",
      private: "#848d97",
    };
    return visibilityColors[visibility] ?? "#848d97";
  }

  /**
   * Normalizes a Gitea label color to a hex color string.
   *
   * @param color - the label color, with or without a leading "#".
   * @returns the hex color string.
   */
  public static normalizeColor(color: string | undefined): string {
    if (!color) {
      return this.defaultLabelColor;
    }
    return color.startsWith("#") ? color : `#${color}`;
  }
}
