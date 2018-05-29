// @flow
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import { slackAuth } from '../../shared/utils/routeHelpers';
import { presentUser, presentTeam } from '../presenters';
import { Authentication, Integration, User, Team } from '../models';
import * as Slack from '../slack';

const router = new Router();

router.get('auth.slack', async ctx => {
  const state = Math.random()
    .toString(36)
    .substring(7);

  ctx.cookies.set('state', state, {
    httpOnly: false,
    expires: new Date('2100'),
  });
  ctx.redirect(slackAuth(state));
});

router.post('auth.slack', async ctx => {
  const { code } = ctx.body;
  ctx.assertPresent(code, 'code is required');

  const data = await Slack.oauthAccess(code);

  let user = await User.findOne({
    where: { service: 'slack', serviceId: data.user.id },
  });
  let team = await Team.findOne({ where: { slackId: data.team.id } });
  const isFirstUser = !team;

  if (team) {
    team.name = data.team.name;
    team.slackData = data.team;
    await team.save();
  } else {
    team = await Team.create({
      name: data.team.name,
      slackId: data.team.id,
      slackData: data.team,
    });
  }

  if (user) {
    user.slackAccessToken = data.access_token;
    user.slackData = data.user;
    await user.save();
  } else {
    user = await User.create({
      service: 'slack',
      serviceId: data.user.id,
      name: data.user.name,
      email: data.user.email,
      teamId: team.id,
      isAdmin: isFirstUser,
      slackData: data.user,
      slackAccessToken: data.access_token,
    });

    // Set initial avatar
    await user.updateAvatar();
    await user.save();
  }

  if (isFirstUser) {
    await team.createFirstCollection(user.id);
  }

  // Signal to backend that the user is logged in.
  // This is only used to signal SSR rendering, not
  // used for auth.
  ctx.cookies.set('loggedIn', 'true', {
    httpOnly: false,
    expires: new Date('2100'),
  });

  ctx.body = {
    data: {
      user: await presentUser(ctx, user),
      team: await presentTeam(ctx, team),
      accessToken: user.getJwtToken(),
    },
  };
});

router.post('auth.slackCommands', auth(), async ctx => {
  const { code } = ctx.body;
  ctx.assertPresent(code, 'code is required');

  const user = ctx.state.user;
  const endpoint = `${process.env.URL || ''}/auth/slack/commands`;
  const data = await Slack.oauthAccess(code, endpoint);
  const serviceId = 'slack';

  const authentication = await Authentication.create({
    serviceId,
    userId: user.id,
    teamId: user.teamId,
    token: data.access_token,
    scopes: data.scope.split(','),
  });

  await Integration.create({
    serviceId,
    type: 'command',
    userId: user.id,
    teamId: user.teamId,
    authenticationId: authentication.id,
  });
});

router.post('auth.slackPost', auth(), async ctx => {
  const { code, collectionId } = ctx.body;
  ctx.assertPresent(code, 'code is required');

  const user = ctx.state.user;
  const endpoint = `${process.env.URL || ''}/auth/slack/post`;
  const data = await Slack.oauthAccess(code, endpoint);
  const serviceId = 'slack';

  const authentication = await Authentication.create({
    serviceId,
    userId: user.id,
    teamId: user.teamId,
    token: data.access_token,
    scopes: data.scope.split(','),
  });

  await Integration.create({
    serviceId,
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
});

export default router;
