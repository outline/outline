import queryString from "query-string";
import env from "@shared/env";

export type OAuthState = {
  teamId: string;
};

export class NotionUtils {
  // private static clientId = "eda3ac5b-39fa-4d79-a99d-b70bc5ded123";
  private static clientId = env.NOTION_CLIENT_ID;
  private static clientSecret = env.NOTION_CLIENT_SECRET;
  private static authBaseUrl = "https://api.notion.com/v1/oauth/authorize";

  static parseState(state: string): OAuthState {
    return JSON.parse(state);
  }

  static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      // baseUrl: `${env.URL}`,
      baseUrl: "https://redirect-cf-worker.hmacr.workers.dev",
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/api/notion.callback?${params}`
      : `${baseUrl}/api/notion.callback`;
  }

  static authUrl({ state }: { state: OAuthState }) {
    const params = {
      client_id: this.clientId,
      redirect_uri: this.callbackUrl(),
      state: JSON.stringify(state),
      response_type: "code",
      owner: "user",
    };
    return `${this.authBaseUrl}?${queryString.stringify(params)}`;
  }
}
