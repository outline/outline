// @flow

export function slackAuth(
  state: string,
  scopes: string[] = [
    "identity.email",
    "identity.basic",
    "identity.avatar",
    "identity.team",
  ],
  clientId: string = process.env.SLACK_KEY,
  redirectUri: string = `${process.env.URL}/auth/slack.callback`
): string {
  const baseUrl = "https://slack.com/oauth/authorize";
  const params = {
    client_id: clientId,
    scope: scopes ? scopes.join(" ") : "",
    redirect_uri: redirectUri,
    state,
  };

  const urlParams = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
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
  return "https://twitter.com/outlinewiki";
}

export function mailToUrl(): string {
  return "mailto:hello@getoutline.com";
}

export function developers(): string {
  return `https://www.getoutline.com/developers`;
}

export function changelog(): string {
  return `https://www.getoutline.com/changelog`;
}

export function signin(service: string = "slack"): string {
  return `${process.env.URL}/auth/${service}`;
}

export function settings(): string {
  return `/settings`;
}

export function groupSettings(): string {
  return `/settings/groups`;
}
