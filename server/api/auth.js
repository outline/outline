import Router from 'koa-router';
import httpErrors from 'http-errors';
import fetch from 'isomorphic-fetch';
import querystring from 'querystring';

import { presentUser, presentTeam } from '../presenters';
import { User, Team } from '../models';

const router = new Router();

router.post('auth.slack', async (ctx) => {
  const { code } = ctx.body;
  ctx.assertPresent(code, 'code is required');

  const body = {
    client_id: process.env.SLACK_KEY,
    client_secret: process.env.SLACK_SECRET,
    redirect_uri: process.env.SLACK_REDIRECT_URI,
    code,
  };

  let data;
  try {
    const response = await fetch(`https://slack.com/api/oauth.access?${querystring.stringify(body)}`);
    data = await response.json();
  } catch (e) {
    throw httpErrors.BadRequest();
  }

  if (!data.ok) throw httpErrors.BadRequest(data.error);

  // Temp to block
  const allowedSlackIds = process.env.ALLOWED_SLACK_IDS.split(',');
  if (!allowedSlackIds.includes(data.team.id)) throw httpErrors.BadRequest('Invalid Slack team');

  // User
  let user = await User.findOne({ where: { slackId: data.user.id }});

  // Team
  let team = await Team.findOne({ where: { slackId: data.team.id } });
  let teamExisted = !!team;
  if (!team) {
    team = await Team.create({
      name: data.team.name,
      slackId: data.team.id,
      slackData: data.team,
    });
  } else {
    team.name = data.team.name;
    team.slackData = data.team;
    team = await team.save();
  }

  if (user) {
    user.slackAccessToken = data.access_token;
    user.slackData = data.user;
    await user.save();
  } else {
    user = await User.create({
      slackId: data.user.id,
      username: data.user.name,
      name: data.user.name,
      email: data.user.email,
      teamId: team.id,
      slackData: data.user,
      slackAccessToken: data.access_token,
    });
  }

  if (!teamExisted) {
    await team.createFirstAtlas(user.id);
  }

  ctx.body = { data: {
    user: await presentUser(user),
    team: await presentTeam(team),
    accessToken: user.getJwtToken(),
  }};
});

export default router;
