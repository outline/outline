// @flow
import Router, { type Context } from 'koa-router';
import fetch from 'isomorphic-fetch';
import { mountOAuth2Passport, type DeserializedData } from '../utils/passport';
import { customError } from "../errors";

const AccountNotOwnerOfAGuildError = customError<string>("notice=auth-error&error=state_mismatch", "")

async function json<T>(input: string | Request | URL, init?: RequestOptions): Promise<T> {
  const res = await fetch(input, init);
  return await res.json();
} 

async function handleAuthorizeFailed(ctx: Context, err: Error) {
  if (err instanceof AccountNotOwnerOfAGuildError) {
    ctx.redirect(`/?${err.name}`);
    return;
  }

  throw err;
}

async function deserializeDiscordToken(req: Request, accessToken, refreshToken: string): Promise<DeserializedData> {
  const user = await json<any>("https://discordapp.com/api/users/@me", {
    authorization: `Bearer ${accessToken}`,
  })
  const guilds = await json<any>("https://discordapp.com/api/users/@me/guilds", {
    authorization: `Bearer ${accessToken}`,
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

const [authorizeHandler, callbackHandlers] = mountOAuth2Passport(
  "discord", 
  deserializeDiscordToken, 
  {
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    tokenURL: 'https://discordapp.com/api/oauth2/token',
    authorizationURL: 'https://discordapp.com/api/oauth2/authorize',
    scopes: ["identify", "email", "guilds"],
    column: 'slackId',
    authorizeFailedHook: [handleAuthorizeFailed],
  },
);

const router = new Router();
router.get('discord', authorizeHandler);
router.get('discord.callback', ...callbackHandlers);

export default router;
