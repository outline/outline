// @flow
import Router from 'koa-router';
import fetch from 'isomorphic-fetch';
import { mountOAuth2Passport, type DeserializedData } from '../utils/passport';
import auth from '../middlewares/authentication';
import { Authentication, Collection, Integration, Team } from '../models';
import * as Slack from '../slack';

async function deserializeSlackToken(
  accessToken,
  refreshToken: string
): Promise<DeserializedData> {
  const response = await fetch(
    `https://slack.com/api/users.identity?token=${accessToken}`
  );

  const data = await response.json();
  if (!data.ok) {
    throw new Error('failed to import');
  }

  return {
    _user: {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      avatarUrl: data.user.image_192,
    },
    _team: {
      id: data.team.id,
      name: data.team.name,
      avatarUrl: data.team.image_88,
    },
  };
}

const router = new Router();
if (process.env.SLACK_KEY && process.env.SLACK_SECRET) {
  const [authorizeHandler, callbackHandlers] = mountOAuth2Passport(
    'slack',
    deserializeSlackToken,
    {
      clientID: process.env.SLACK_KEY,
      clientSecret: process.env.SLACK_SECRET,
      tokenURL: 'https://slack.com/api/oauth.access',
      authorizationURL: 'https://slack.com/oauth/authorize',
      scope: [
        'identity.basic',
        'identity.email',
        'identity.avatar',
        'identity.team',
      ],
      column: 'slackId',
    }
  );

  router.get('slack', authorizeHandler);
  router.get('slack.callback', ...callbackHandlers);
}

router.get('slack.commands', auth({ required: false }), async ctx => {
  const { code, state, error } = ctx.request.query;
  const user = ctx.state.user;
  ctx.assertPresent(code || error, 'code is required');

  if (error) {
    ctx.redirect(`/settings/integrations/slack?error=${error}`);
    return;
  }

  // this code block accounts for the root domain being unable to
  // access authentcation for subdomains. We must forward to the appropriate
  // subdomain to complete the oauth flow
  if (!user) {
    if (state) {
      try {
        const team = await Team.findByPk(state);
        return ctx.redirect(
          `${team.url}/auth${ctx.request.path}?${ctx.request.querystring}`
        );
      } catch (err) {
        return ctx.redirect(
          `/settings/integrations/slack?error=unauthenticated`
        );
      }
    } else {
      return ctx.redirect(`/settings/integrations/slack?error=unauthenticated`);
    }
  }

  const endpoint = `${process.env.URL || ''}/auth/slack.commands`;
  const data = await Slack.oauthAccess(code, endpoint);

  const authentication = await Authentication.create({
    service: 'slack',
    userId: user.id,
    teamId: user.teamId,
    token: data.access_token,
    scopes: data.scope.split(','),
  });

  await Integration.create({
    service: 'slack',
    type: 'command',
    userId: user.id,
    teamId: user.teamId,
    authenticationId: authentication.id,
  });

  ctx.redirect('/settings/integrations/slack');
});

router.get('slack.post', auth({ required: false }), async ctx => {
  const { code, error, state } = ctx.request.query;
  const user = ctx.state.user;
  ctx.assertPresent(code || error, 'code is required');

  const collectionId = state;
  ctx.assertUuid(collectionId, 'collectionId must be an uuid');

  if (error) {
    ctx.redirect(`/settings/integrations/slack?error=${error}`);
    return;
  }

  // this code block accounts for the root domain being unable to
  // access authentcation for subdomains. We must forward to the
  // appropriate subdomain to complete the oauth flow
  if (!user) {
    try {
      const collection = await Collection.findByPk(state);
      const team = await Team.findByPk(collection.teamId);
      return ctx.redirect(
        `${team.url}/auth${ctx.request.path}?${ctx.request.querystring}`
      );
    } catch (err) {
      return ctx.redirect(`/settings/integrations/slack?error=unauthenticated`);
    }
  }

  const endpoint = `${process.env.URL || ''}/auth/slack.post`;
  const data = await Slack.oauthAccess(code, endpoint);

  const authentication = await Authentication.create({
    service: 'slack',
    userId: user.id,
    teamId: user.teamId,
    token: data.access_token,
    scopes: data.scope.split(','),
  });

  await Integration.create({
    service: 'slack',
    type: 'post',
    userId: user.id,
    teamId: user.teamId,
    authenticationId: authentication.id,
    collectionId,
    events: [],
    settings: {
      url: data.incoming_webhook.url,
      channel: data.incoming_webhook.channel,
      channelId: data.incoming_webhook.channel_id,
    },
  });

  ctx.redirect('/settings/integrations/slack');
});

export default router;
