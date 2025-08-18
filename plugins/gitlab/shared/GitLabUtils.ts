import queryString from "query-string";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export type OAuthState = {
  teamId: string;
};

export class GitLabUtils {
  private static oauthScopes = "api read_api read_user read_repository";

  public static tokenUrl = "https://gitlab.com/oauth/token";
  public static revokeUrl = "https://gitlab.com/oauth/revoke";
  private static authBaseUrl = "https://gitlab.com/oauth/authorize";

  private static settingsUrl = integrationSettingsPath("gitlab");

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
      ? `${baseUrl}/api/gitlab.callback?${params}`
      : `${baseUrl}/api/gitlab.callback`;
  }

  static authUrl({ state }: { state: OAuthState }) {
    const params = {
      client_id: env.GITLAB_CLIENT_ID,
      redirect_uri: this.callbackUrl(),
      state: JSON.stringify(state),
      scope: this.oauthScopes,
      response_type: "code",
    };
    return `${this.authBaseUrl}?${queryString.stringify(params)}`;
  }
}
