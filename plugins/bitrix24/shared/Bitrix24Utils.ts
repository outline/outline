import queryString from "query-string";
import type { IntegrationType } from "@shared/types";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export class Bitrix24Utils {
  public static clientId = env.BITRIX24_CLIENT_ID;
  public static domain = env.BITRIX24_DOMAIN;

  static get url() {
    return integrationSettingsPath("bitrix24");
  }

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

  /**
   * @param error
   * @returns URL to be redirected to upon authorization error from Bitrix24
   */
  public static errorUrl(error: string) {
    return `${this.url}?error=${error}`;
  }

  /**
   * @returns Callback URL configured for Bitrix24, to which users will be redirected upon authorization
   */
  public static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: env.URL,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/api/integrations.bitrix24.callback?${params}`
      : `${baseUrl}/api/integrations.bitrix24.callback`;
  }

  /**
   * Returns the URL for Bitrix24 OAuth authorization
   */
  static authUrl(state: string, domain?: string, scopes: string[] = ["tasks"]): string {
    const bitrixDomain = domain || this.domain || "bitrix24.com";
    const baseUrl = `https://${bitrixDomain}/oauth/authorize`;
    const params = {
      client_id: this.clientId,
      redirect_uri: this.callbackUrl(),
      response_type: "code",
      scope: scopes.join(" "),
      state,
    };
    return `${baseUrl}?${queryString.stringify(params)}`;
  }

  /**
   * Returns the URL for connecting to Bitrix24 (redirect endpoint)
   */
  static connectUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: env.URL,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/api/integrations.bitrix24.post?${params}`
      : `${baseUrl}/api/integrations.bitrix24.post`;
  }
}
