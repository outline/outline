// @flow
import Router from 'koa-router';
import auth from './middlewares/authentication';
import { presentUser, presentTeam } from '../presenters';
import { Authentication, User, Team } from '../models';
import * as Slack from '../slack';

const router = new Router();

router.post('auth.info', auth(), async ctx => {
  const user = ctx.state.user;
  const team = await Team.findOne({ where: { id: user.teamId } });

  ctx.body = {
    data: {
      user: await presentUser(ctx, user),
      team: await presentTeam(ctx, team),
    },
  };
});

router.post('auth.slack', async ctx => {
  const { code } = ctx.body;
  ctx.assertPresent(code, 'code is required');

  const data = await Slack.oauthAccess(code);

  let user = await User.findOne({ where: { slackId: data.user.id } });
  let team = await Team.findOne({ where: { slackId: data.team.id } });
  const teamExisted = !!team;

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
      slackId: data.user.id,
      name: data.user.name,
      email: data.user.email,
      teamId: team.id,
      slackData: data.user,
      slackAccessToken: data.access_token,
    });
  }

  if (!teamExisted) {
    await team.createFirstCollection(user.id);
  }

  // Signal to backend that the user is logged in.
  // This is only used to signal SSR rendering, not
  // used for auth.
  ctx.cookies.set('loggedIn', 'true', {
    httpOnly: false,
    expires: new Date('2100'),
  });

  // Update user's avatar
  await user.updateAvatar();
  await user.save();

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

  await Authentication.create({
    serviceId: 'slack',
    userId: user.id,
    teamId: user.teamId,
    token: data.access_token,
    scopes: data.scope.split(','),
  });
});

export default router;
