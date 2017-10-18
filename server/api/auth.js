// @flow
import Router from 'koa-router';
import { presentUser, presentTeam } from '../presenters';
import { User, Team } from '../models';
import * as Slack from '../slack';

const router = new Router();

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

  ctx.body = {
    data: {
      user: await presentUser(ctx, user),
      team: await presentTeam(ctx, team),
      accessToken: user.getJwtToken(),
    },
  };
});

router.post('auth.slackCommands', async ctx => {
  const { code } = ctx.body;
  ctx.assertPresent(code, 'code is required');

  await Slack.oauthAccess(code, `${process.env.URL || ''}/auth/slack/commands`);
});

export default router;
