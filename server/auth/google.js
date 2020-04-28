// @flow
import crypto from 'crypto';
import Router, { type Context } from 'koa-router';
import fetch from 'isomorphic-fetch';
import { mountOAuth2Passport, type DeserializedData } from '../utils/passport';
import { capitalize } from 'lodash';
import { customError } from '../errors';

class GoogleHDError extends customError('GoogleHDError', 'google-hd') {}
class HDNotAllowedError extends customError(
  'HDNotAllowedError',
  'hd-not-allowed'
) {}

async function json<T>(
  input: string | Request | URL,
  init?: RequestOptions
): Promise<T> {
  const res = await fetch(input, init);
  return await res.json();
}

async function handleAuthorizeFailed(ctx: Context, err: Error) {
  switch (true) {
    case err instanceof GoogleHDError:
    case err instanceof HDNotAllowedError:
      ctx.redirect(`/?notice=${err.name}`);
      break;
    default:
      throw err;
  }
}

const allowedDomainsEnv = process.env.GOOGLE_ALLOWED_DOMAINS;
async function deserializeGoogleToken(
  accessToken,
  refreshToken: string
): Promise<DeserializedData> {
  const profile = await json('https://www.googleapis.com/oauth2/v1/userinfo', {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!profile.data.hd) {
    throw new GoogleHDError();
  }

  // allow all domains by default if the env is not set
  const allowedDomains = allowedDomainsEnv && allowedDomainsEnv.split(',');
  if (allowedDomains && !allowedDomains.includes(profile.data.hd)) {
    throw new HDNotAllowedError();
  }

  const googleId = profile.data.hd;
  const hostname = profile.data.hd.split('.')[0];
  const teamName = capitalize(hostname);

  // attempt to get logo from Clearbit API. If one doesn't exist then
  // fall back to using tiley to generate a placeholder logo
  const hash = crypto.createHash('sha256');
  hash.update(googleId);
  const hashedGoogleId = hash.digest('hex');
  const cbUrl = `https://logo.clearbit.com/${profile.data.hd}`;
  const tileyUrl = `https://tiley.herokuapp.com/avatar/${hashedGoogleId}/${
    teamName[0]
  }.png`;
  const cbResponse = await fetch(cbUrl);
  const avatarUrl = cbResponse.status === 200 ? cbUrl : tileyUrl;

  return {
    _user: {
      id: profile.data.id,
      name: profile.data.name,
      email: profile.data.email,
      avatarUrl: profile.data.picture,
    },
    _team: {
      id: profile.data.hd,
      name: teamName,
      avatarUrl,
    },
  };
}

const router = new Router();
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const [authorizeHandler, callbackHandlers] = mountOAuth2Passport(
    'google',
    deserializeGoogleToken,
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      tokenURL: 'https://oauth2.googleapis.com/token',
      authorizationURL:
        'https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&prompt=consent',
      column: 'googleId',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      authorizeFailedHook: [handleAuthorizeFailed],
    }
  );

  router.get('google', authorizeHandler);
  router.get('google.callback', ...callbackHandlers);
}

export default router;
