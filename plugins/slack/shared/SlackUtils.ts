import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export class SlackUtils {
  private static authBaseUrl = "https://slack.com/oauth/authorize";

  static commandsUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: `${env.URL}`,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/auth/slack.commands?${params}`
      : `${baseUrl}/auth/slack.commands`;
  }

  static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: `${env.URL}`,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/auth/slack.callback?${params}`
      : `${baseUrl}/auth/slack.callback`;
  }

  static postUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: `${env.URL}`,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/auth/slack.post?${params}`
      : `${baseUrl}/auth/slack.post`;
  }

  static errorUrl(err: string) {
    return integrationSettingsPath(`slack?error=${err}`);
  }

  static get url() {
    return integrationSettingsPath("slack");
  }

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
    const params = {
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
