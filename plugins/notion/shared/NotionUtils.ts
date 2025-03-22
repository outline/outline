import queryString from "query-string";
import env from "@shared/env";
import { IntegrationService } from "@shared/types";
import { settingsPath } from "@shared/utils/routeHelpers";

export type OAuthState = {
  teamId: string;
};

export class NotionUtils {
  public static tokenUrl = "https://api.notion.com/v1/oauth/token";
  private static authBaseUrl = "https://api.notion.com/v1/oauth/authorize";

  private static settingsUrl = settingsPath("import");

  static parseState(state: string): OAuthState {
    return JSON.parse(state);
  }

  static successUrl(integrationId: string) {
    const params = {
      success: "",
      service: IntegrationService.Notion,
      integrationId,
    };
    return `${this.settingsUrl}?${queryString.stringify(params)}`;
  }

  static errorUrl(error: string) {
    const params = {
      error,
      service: IntegrationService.Notion,
    };
    return `${this.settingsUrl}?${queryString.stringify(params)}`;
  }

  static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: `${env.URL}`,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/api/notion.callback?${params}`
      : `${baseUrl}/api/notion.callback`;
  }

  static authUrl({ state }: { state: OAuthState }) {
    const params = {
      client_id: env.NOTION_CLIENT_ID,
      redirect_uri: this.callbackUrl(),
      state: JSON.stringify(state),
      response_type: "code",
      owner: "user",
    };
    return `${this.authBaseUrl}?${queryString.stringify(params)}`;
  }
}
