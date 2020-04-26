// @flow
import Router from 'koa-router';
import fetch from 'isomorphic-fetch';
import { mountOAuth2Passport, type DeserializedUser, type DeserializedTeam } from '../../utils/passport';

async function deserializeSlackToken(accessToken, refreshToken: string): { user: DeserializedUser, team: DeserializedTeam } {
  const response = await fetch(
    `https://slack.com/api/users.identity?token=${accessToken}`
  );

  const data = await response.json();
  if (!data.ok) {
    throw new Error("failed to import");
  }

  return {
    user: {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      avatarUrl: data.user.image_192,
    },
    team: {
      id: data.team.id,
      name: data.team.name,
      avatarUrl: data.team.image_88,
    },
  };
} 

export default function(router: Router) {
  const [authorizeHandler, callbackHandlers] = mountOAuth2Passport("slack", deserializeSlackToken, {
    clientID: process.env.SLACK_KEY,
    clientSecret: process.env.SLACK_SECRET,
    tokenURL: "https://slack.com/api/oauth.access",
    authorizationURL: "https://slack.com/oauth/authorize",
    scopes: ["identity.basic", "identity.email", "identity.avatar", "identity.team"],
    column: "slackId",
  })

  router.get("slack", authorizeHandler);
  router.get("slack.callback", callbackHandlers...);
}