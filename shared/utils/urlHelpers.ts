import env from "../env";

export function slackAuth(
  state: string,
  scopes: string[] = [
    "identity.email",
    "identity.basic",
    "identity.avatar",
    "identity.team",
  ],
  clientId: string,
  redirectUri = `${env.URL}/auth/slack.callback`
): string {
  const baseUrl = "https://slack.com/oauth/authorize";
  const params = {
    client_id: clientId,
    scope: scopes ? scopes.join(" ") : "",
    redirect_uri: redirectUri,
    state,
  };
  const urlParams = Object.keys(params)
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join("&");
  return `${baseUrl}?${urlParams}`;
}

export function githubUrl(): string {
  return "https://www.github.com/outline";
}

export function githubIssuesUrl(): string {
  return "https://www.github.com/outline/outline/issues";
}

export function twitterUrl(): string {
  return "https://twitter.com/getoutline";
}

export function feedbackUrl(): string {
  return "https://www.getoutline.com/contact";
}

export function developersUrl(): string {
  return "https://www.getoutline.com/developers";
}

export function changelogUrl(): string {
  return "https://www.getoutline.com/changelog";
}

export function signin(service = "slack"): string {
  return `${env.URL}/auth/${service}`;
}

export const SLUG_URL_REGEX = /^(?:[0-9a-zA-Z-_~]*-)?([a-zA-Z0-9]{10,15})$/;
