// @flow

export function slackAuth(
  state: string,
  scopes: string[] = [
    'identity.email',
    'identity.basic',
    'identity.avatar',
    'identity.team',
  ],
  redirectUri: string = `${process.env.URL}/auth/slack`
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

export function blogUrl(): string {
  return 'https://medium.com/getoutline';
}

export function twitterUrl(): string {
  return 'https://twitter.com/getoutline';
}

export function spectrumUrl(): string {
  return 'https://spectrum.chat/outline';
}

export function developers(): string {
  return '/developers';
}

export function changelog(): string {
  return '/changelog';
}

export function signin(): string {
  return '/auth/slack';
}
