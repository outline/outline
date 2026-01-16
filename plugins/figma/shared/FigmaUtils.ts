import queryString from "query-string";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export type OAuthState = {
  teamId: string;
};

export class FigmaUtils {
  public static oauthScopes = ["current_user:read", "file_metadata:read"];

  public static accountUrl = "https://api.figma.com/v1/me";
  public static tokenUrl = "https://api.figma.com/v1/oauth/token";
  public static refreshUrl = "https://api.figma.com/v1/oauth/refresh";
  private static authBaseUrl = "https://www.figma.com/oauth";

  private static settingsUrl = integrationSettingsPath("figma");

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
      baseUrl: env.URL,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/api/figma.callback?${params}`
      : `${baseUrl}/api/figma.callback`;
  }

  static authUrl({ state }: { state: OAuthState }) {
    const params = {
      client_id: env.FIGMA_CLIENT_ID,
      redirect_uri: this.callbackUrl(),
      state: JSON.stringify(state),
      scope: this.oauthScopes.join(","),
      response_type: "code",
    };
    return `${this.authBaseUrl}?${queryString.stringify(params)}`;
  }
}
