import queryString from "query-string";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export type OAuthState = {
  teamId: string;
};

export class LinearUtils {
  private static oauthScopes = "read,issues:create";

  public static tokenUrl = "https://api.linear.app/oauth/token";
  public static revokeUrl = "https://api.linear.app/oauth/revoke";
  private static authBaseUrl = "https://linear.app/oauth/authorize";

  private static settingsUrl = integrationSettingsPath("linear");

  static parseState(state: string): OAuthState {
    return JSON.parse(state);
  }

  static successUrl() {
    return this.settingsUrl;
  }

  static errorUrl(error: string) {
    return `${this.settingsUrl}?error=${error}`;
  }

  static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: `${env.URL}`,
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
