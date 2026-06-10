import queryString from "query-string";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export const LinearOAuthNonceCookie = "linearOAuthNonce";

export type OAuthState = {
  teamId: string;
  nonce: string;
};

export class LinearUtils {
  private static oauthScopes = "read,issues:create";

  public static tokenUrl = "https://api.linear.app/oauth/token";
  public static revokeUrl = "https://api.linear.app/oauth/revoke";

  /** Hostname Linear uses for review (Diffs) urls, mirroring GitHub pull request urls. */
  public static reviewHost = "linear.review";

  private static authBaseUrl = "https://linear.app/oauth/authorize";

  private static settingsUrl = integrationSettingsPath("linear");

  static parseState(state: string): OAuthState | undefined {
    try {
      return JSON.parse(state);
    } catch {
      return undefined;
    }
  }

  static successUrl() {
    return this.settingsUrl;
  }

  static errorUrl(error: string) {
    return `${this.settingsUrl}?error=${error}`;
  }

  static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: env.URL,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/api/linear.callback?${params}`
      : `${baseUrl}/api/linear.callback`;
  }

  /**
   * Returns a color representing the given pull request status.
   *
   * @param status Pull request status synced from Linear, e.g. "open" or "merged".
   * @returns a hex color string.
   */
  public static getColorForPullRequestStatus(status: string) {
    switch (status) {
      case "open":
      case "reopened":
      case "approved":
        return "#238636";
      case "inReview":
        return "#d29922";
      case "merged":
        return "#8250df";
      case "closed":
        return "#f85149";
      case "draft":
      default:
        return "#848d97";
    }
  }

  static authUrl({ state }: { state: OAuthState }) {
    const params = {
      client_id: env.LINEAR_CLIENT_ID,
      redirect_uri: this.callbackUrl(),
      state: JSON.stringify(state),
      scope: this.oauthScopes,
      response_type: "code",
      prompt: "consent",
      actor: "app",
    };
    return `${this.authBaseUrl}?${queryString.stringify(params)}`;
  }
}
