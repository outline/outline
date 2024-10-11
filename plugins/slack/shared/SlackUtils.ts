import env from "@shared/env";
import { IntegrationType } from "@shared/types";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export class SlackUtils {
  private static authBaseUrl = "https://slack.com/oauth/authorize";

  /**
   * Create a state string for use in OAuth flows
   *
   * @param teamId The team ID
   * @param type The integration type
   * @param data Additional data to include in the state
   * @returns A state string
   */
  static createState(
    teamId: string,
    type: IntegrationType,
    data?: Record<string, any>
  ) {
    return JSON.stringify({ type, teamId, ...data });
  }

  /**
   * Parse a state string from an OAuth flow
   *
   * @param state The state string
   * @returns The parsed state
   */
  static parseState<T>(
    state: string
  ): { teamId: string; type: IntegrationType } & T {
    return JSON.parse(state);
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

  static connectUrl(
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
