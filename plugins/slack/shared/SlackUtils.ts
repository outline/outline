import env from "@shared/env";

export class SlackUtils {
  private static authBaseUrl = "https://slack.com/oauth/authorize";

  /**
   * Returns the callback URL for Slack sign in.
   *
   * @param options the base URL and optional query string.
   * @returns the callback URL.
   */
  static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: env.URL,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/auth/slack.callback?${params}`
      : `${baseUrl}/auth/slack.callback`;
  }

  /**
   * Returns the Slack OAuth authorization URL.
   *
   * @param state the OAuth state.
   * @param scopes the scopes to request.
   * @param redirectUri the URL that Slack redirects to.
   * @returns the authorization URL.
   */
  static authUrl(
    state: string,
    scopes: string[] = [
      "identity.email",
      "identity.basic",
      "identity.avatar",
      "identity.team",
    ],
    redirectUri = SlackUtils.callbackUrl()
  ): string {
    const baseUrl = SlackUtils.authBaseUrl;
    const params: Record<string, string> = {
      client_id: env.SLACK_CLIENT_ID,
      scope: scopes ? scopes.join(" ") : "",
      redirect_uri: redirectUri,
      state,
    };
    const urlParams = Object.keys(params)
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join("&");
    return `${baseUrl}?${urlParams}`;
  }
}
