import queryString from "query-string";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export class GitLabUtils {
  public static clientId = env.GITLAB_CLIENT_ID;
  public static gitlabUrl = env.GITLAB_URL || "https://gitlab.com";

  static get url() {
    return integrationSettingsPath("gitlab");
  }

  /**
   * @param error
   * @returns URL to be redirected to upon authorization error from GitLab
   */
  public static errorUrl(error: string) {
    return `${this.url}?error=${error}`;
  }

  /**
   * @returns Callback URL configured for GitLab, to which users will be redirected upon authorization
   */
  public static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: env.URL,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/api/integrations.gitlab.callback?${params}`
      : `${baseUrl}/api/integrations.gitlab.callback`;
  }

  /**
   * Returns the URL for GitLab OAuth authorization
   */
  static authUrl(state: string): string {
    const params = {
      client_id: this.clientId,
      redirect_uri: this.callbackUrl({ baseUrl: env.URL }),
      response_type: "code",
      scope: "api read_user read_repository",
      state,
    };
    return `${this.gitlabUrl}/oauth/authorize?${queryString.stringify(params)}`;
  }
}
