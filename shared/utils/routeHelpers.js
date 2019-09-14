// @flow

export function slackAuth(
  state: string,
  scopes: string[] = [
    'identity.email',
    'identity.basic',
    'identity.avatar',
    'identity.team',
  ],
  redirectUri: string = `${process.env.URL}/auth/slack.callback`
): string {
  const baseUrl = 'https://slack.com/oauth/authorize';
  const params = {
    client_id: process.env.SLACK_KEY,
    scope: scopes ? scopes.join(' ') : '',
    redirect_uri: redirectUri,
    state,
  };

  const urlParams = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');

  return `${baseUrl}?${urlParams}`;
}

export function githubUrl(): string {
  return 'https://www.github.com/outline';
}

export function githubIssuesUrl(): string {
  return 'https://www.github.com/outline/outline/issues';
}

export function slackAppStoreUrl(): string {
  return 'https://goabstract.slack.com/apps/A0W3UMKBQ-outline';
}

export function blogUrl(): string {
  return 'https://medium.com/getoutline';
}

export function twitterUrl(): string {
  return 'https://twitter.com/outlinewiki';
}

export function spectrumUrl(): string {
  return 'https://spectrum.chat/outline';
}

export function mailToUrl(): string {
  return 'mailto:hello@getoutline.com';
}

export function features(): string {
  return `${process.env.URL}/#features`;
}

export function pricing(): string {
  return `${process.env.URL}/pricing`;
}

export function developers(): string {
  return `${process.env.URL}/developers`;
}

export function changelog(): string {
  return `${process.env.URL}/changelog`;
}

export function signin(service: string = 'slack'): string {
  return `${process.env.URL}/auth/${service}`;
}

export function about(): string {
  return `${process.env.URL}/about`;
}

export function integrations(): string {
  return `${process.env.URL}/integrations`;
}

export function privacy(): string {
  return `${process.env.URL}/privacy`;
}

export function settings(): string {
  return `/settings`;
}
