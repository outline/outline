import queryString from "query-string";
import env from "@shared/env";
import { MentionType } from "@shared/types";
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
  private static authBaseUrl = "https://linear.app/oauth/authorize";

  private static settingsUrl = integrationSettingsPath("linear");

  static parseState(state: string): OAuthState | undefined {
    try {
      return JSON.parse(state);
    } catch {
      return undefined;
    }
  }

  /**
   * Determines the type of mention a Linear URL represents.
   *
   * @param url the URL to evaluate.
   * @returns the mention type, or undefined if this is not a Linear URL for a
   * resource that can be mentioned.
   */
  public static mentionType(url: URL): MentionType | undefined {
    if (url.hostname !== "linear.app") {
      return undefined;
    }

    const type = url.pathname.split("/")[2];

    return type === "issue"
      ? MentionType.Issue
      : type === "project"
        ? MentionType.Project
        : undefined;
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
