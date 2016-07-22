import Router from 'koa-router';
import httpErrors from 'http-errors';
import fetch from 'isomorphic-fetch';
var querystring = require('querystring');

import { presentUser, presentTeam } from '../presenters';
import { User, Team } from '../models';

const router = new Router();

router.post('auth.slack', async (ctx) => {
  const { code } = ctx.body;
  ctx.assertPresent(code, 'code is required');

  const body = {
    client_id: process.env.SLACK_KEY,
    client_secret: process.env.SLACK_SECRET,
    code: code,
    redirect_uri: process.env.SLACK_REDIRECT_URI,
  }

  let data;
  try {
    const response = await fetch('https://slack.com/api/oauth.access?' + querystring.stringify(body));
    data = await response.json();
  } catch(e) {
    throw httpErrors.BadRequest();
  }

  if (!data.ok) throw httpErrors.BadRequest(data.error);

  // Temp to block
  let allowedSlackIds = process.env.ALLOWED_SLACK_IDS.split(',');
  if (!allowedSlackIds.includes(data.team.id)) throw httpErrors.BadRequest("Invalid Slack team");

  // User
  let userData;
  let user = await User.findOne({ where: { slackId: data.user.id }});

  const authResponse = await fetch(`https://slack.com/api/auth.test?token=${data.access_token}`);
  const authData = await authResponse.json();

  // Team
  let team = await Team.findOne({ where: { slackId: data.team.id } });
  if (!team) {
    team = await Team.create({
      name: data.team.name,
      slackId: data.team.id,
      slackData: data.team,
    });
    const atlas = await team.createFirstAtlas();
  } else {
    team.name = data.team.name;
    team.slackData = data.team;
    team = await team.save();
  }

  if (user) {
    user.slackAccessToken = data.access_token;
    user.slackData = data.user;
    user = await user.save();
  } else {
    user = await team.createUser({
      slackId: data.user.id,
      username: authData.user,
      name: data.user.name,
      email: data.user.email,
      slackData: data.user,
      slackAccessToken: data.access_token,
    });
  }

  ctx.body = { data: {
    user: await presentUser(user),
    team: await presentTeam(team),
    accessToken: user.getJwtToken(),
  }};
});

export default router;
