// @flow
import Router, { type Context } from 'koa-router';
import fetch from 'isomorphic-fetch';
import { mountOAuth2Passport, type DeserializedData } from '../utils/passport';
import { customError } from '../errors';

class AccountNotOwnerOfAGuildError extends customError(
  'AccountNotOwnerOfAGuildError',
  'notice=auth-error&error=state_mismatch'
) {}

async function json(
  input: string | Request | URL,
  init?: RequestOptions
): Promise<any> {
  const res = await fetch(input, init);
  return await res.json();
}

async function handleAuthorizeFailed(ctx: Context, err: any) {
  if (err instanceof AccountNotOwnerOfAGuildError) {
    ctx.redirect(`/?${err.name}`);
    return;
  }

  throw err;
}

async function deserializeDiscordToken(
  accessToken,
  refreshToken: string
): Promise<DeserializedData> {
  const user = await json(`https://discordapp.com/api/users/@me`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  const guilds = await json(`https://discordapp.com/api/users/@me/guilds`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  const guild: ?{ id: string, name: string, icon: string } = (guilds =>
    guilds.length > 0 ? guilds[0] : null)(guilds.filter(g => g.owner));
  if (!guild) {
    throw new AccountNotOwnerOfAGuildError();
  }

  return {
    _user: {
      id: user.id,
      name: user.username,
      email: user.email,
      avatarUrl: '',
    },
    _team: {
      id: guild.id,
      name: guild.name,
      avatarUrl: '',
    },
  };
}

const router = new Router();
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  const [authorizeHandler, callbackHandlers] = mountOAuth2Passport(
    'discord',
    deserializeDiscordToken,
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      tokenURL: 'https://discordapp.com/api/oauth2/token',
      authorizationURL: 'https://discordapp.com/api/oauth2/authorize',
      scope: ['identify', 'email', 'guilds'],
      column: 'slackId',
      authorizeFailedHook: [handleAuthorizeFailed],
    }
  );

  router.get('discord', authorizeHandler);
  router.get('discord.callback', ...callbackHandlers);
}

export default router;
