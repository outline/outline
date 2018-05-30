// @flow
import Router from 'koa-router';
import addHours from 'date-fns/add_hours';
import addMonths from 'date-fns/add_months';
import { slackAuth } from '../../shared/utils/routeHelpers';
import { Authentication, Integration, User, Team } from '../models';
import * as Slack from '../slack';

const router = new Router();

// start the oauth process and redirect user to Slack
router.get('slack', async ctx => {
  const state = Math.random()
    .toString(36)
    .substring(7);

  ctx.cookies.set('state', state, {
    httpOnly: false,
    expires: addHours(new Date(), 1),
  });
  ctx.redirect(slackAuth(state));
});

// signin callback from Slack
router.get('slack.callback', async ctx => {
  const { code, error, state } = ctx.request.query;
  ctx.assertPresent(code || error, 'code is required');
  ctx.assertPresent(state, 'state is required');

  if (state !== ctx.cookies.get('state') || error) {
    ctx.redirect('/?notice=auth-error');
    return;
  }

  const data = await Slack.oauthAccess(code);

  const [team, isFirstUser] = await Team.findOrCreate({
    where: {
      slackId: data.team.id,
    },
    defaults: {
      name: data.team.name,
      avatarUrl: data.team.image_88,
    },
  });

  const [user] = await User.findOrCreate({
    where: {
      service: 'slack',
      serviceId: data.user.id,
      teamId: team.id,
    },
    defaults: {
      name: data.user.name,
      email: data.user.email,
      isAdmin: isFirstUser,
      avatarUrl: data.user.image_192,
    },
  });

  if (isFirstUser) {
    await team.createFirstCollection(user.id);
  }

  ctx.cookies.set('lastSignedIn', 'slack', {
    httpOnly: false,
    expires: new Date('2100'),
  });
  ctx.cookies.set('accessToken', user.getJwtToken(), {
    httpOnly: false,
    expires: addMonths(new Date(), 1),
  });

  ctx.redirect('/');
});

router.get('slack.commands', async ctx => {
  const { code } = ctx.request.query;
  ctx.assertPresent(code, 'code is required');

  const endpoint = `${process.env.URL || ''}/auth/slack.commands`;
  const data = await Slack.oauthAccess(code, endpoint);
  const user = await User.find({
    service: 'slack',
    serviceId: data.user_id,
  });

  const authentication = await Authentication.create({
    serviceId: 'slack',
    userId: user.id,
    teamId: user.teamId,
    token: data.access_token,
    scopes: data.scope.split(','),
  });

  await Integration.create({
    serviceId: 'slack',
    type: 'command',
    userId: user.id,
    teamId: user.teamId,
    authenticationId: authentication.id,
  });

  ctx.redirect('/settings/integrations/slack');
});

router.get('slack.post', async ctx => {
  const { code, state } = ctx.request.query;
  ctx.assertPresent(code, 'code is required');

  const collectionId = state;
  ctx.assertUuid(collectionId, 'collectionId must be an uuid');

  const endpoint = `${process.env.URL || ''}/auth/slack.post`;
  const data = await Slack.oauthAccess(code, endpoint);

  const user = await User.find({
    service: 'slack',
    serviceId: data.user_id,
  });

  const authentication = await Authentication.create({
    serviceId: 'slack',
    userId: user.id,
    teamId: user.teamId,
    token: data.access_token,
    scopes: data.scope.split(','),
  });

  await Integration.create({
    serviceId: 'slack',
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
