// @flow
import fetch from 'isomorphic-fetch';
import querystring from 'querystring';
import { httpErrors } from './errors';

const SLACK_API_URL = 'https://slack.com/api';

export async function request(endpoint: string, body: Object) {
  let data;
  try {
    const response = await fetch(
      `${SLACK_API_URL}/${endpoint}?${querystring.stringify(body)}`
    );
    data = await response.json();
  } catch (e) {
    throw httpErrors.BadRequest();
  }
  if (!data.ok) throw httpErrors.BadRequest(data.error);

  return data;
}

export async function oauthAccess(
  code: string,
  redirect_uri: string = `${process.env.URL || ''}/auth/slack`
) {
  return request('oauth.access', {
    client_id: process.env.SLACK_KEY,
    client_secret: process.env.SLACK_SECRET,
    redirect_uri: `${process.env.URL || ''}/auth/slack`,
    code,
  });
}
