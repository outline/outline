import env from "../env";
import { integrationSettingsPath } from "./routeHelpers";

class Slack {
  private static authUrl = "https://slack.com/oauth/authorize";

  static commands(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: `${env.URL}`,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/auth/slack.commands?${params}`
      : `${baseUrl}/auth/slack.commands`;
  }

  static callback(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: `${env.URL}`,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/auth/slack.callback?${params}`
      : `${baseUrl}/auth/slack.callback`;
  }

  static post(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: `${env.URL}`,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/auth/slack.post?${params}`
      : `${baseUrl}/auth/slack.post`;
  }

  static error(err: string) {
    return integrationSettingsPath(`slack?error=${err}`);
  }

  static get url() {
    return integrationSettingsPath("slack");
  }

  static auth(
    state: string,
    scopes: string[] = [
      "identity.email",
      "identity.basic",
      "identity.avatar",
      "identity.team",
    ],
    redirectUri = Slack.callback()
  ): string {
    const baseUrl = Slack.authUrl;
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

class Outline {
  public static github = "https://www.github.com/outline/outline/issues";
  public static twitter = "https://twitter.com/getoutline";
  public static contact = "https://www.getoutline.com/contact";
  public static developers = "https://www.getoutline.com/developers";
  public static changelog = "https://www.getoutline.com/changelog";
}

const SLUG_URL_REGEX = /^(?:[0-9a-zA-Z-_~]*-)?([a-zA-Z0-9]{10,15})$/;
const SHARE_URL_SLUG_REGEX = /^[0-9a-z-]+$/;

export const UrlHelper = {
  Slack,
  Outline,
  SLUG_URL_REGEX,
  SHARE_URL_SLUG_REGEX,
};
