// @flow
import Router from 'koa-router';
import fetch from 'isomorphic-fetch';
import { mountOAuth2Passport, type DeserializedUser, type DeserializedTeam } from '../../utils/passport';

async function deserializeDiscordToken(accessToken, refreshToken: string): { user: DeserializedUser, team: DeserializedTeam } {
  const user = (await fetch("https://discordapp.com/api/users/@me", {
    authorization: `Bearer ${accessToken}`,
  })).json();

  const guilds = (await fetch("https://discordapp.com/api/users/@me/guilds", {
    authorization: `Bearer ${accessToken}`,
  })).json();
  
  const guild: ?{ id: string, name: string, icon: string } = (guilds =>
    guilds.length > 0 ? guilds[0] : null)(guilds.filter(g => g.owner));
  if (!guild) {
    throw new Error('account not owner of any guild'));
  }

  return {
    user: {
      id: user.id,
      name: user.username,
      email: user.email,
      avatarUrl: '',
    },
    team: {
      id: guild.id,
      name: guild.name,
      avatarUrl: '',
    },
  };
}

export default function(router: Router) {
  const [authorizeHandler, callbackHandlers] = mountOAuth2Passport("discord", deserializeDiscordToken, {
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    tokenURL: 'https://discordapp.com/api/oauth2/token',
    authorizationURL: 'https://discordapp.com/api/oauth2/authorize',
    scopes: ["identify", "email", "guilds"],
    column: 'slackId',
  })

  router.get('discord', authorizeHandler);
  router.get('discord.callback', callbackHandlers...);
}