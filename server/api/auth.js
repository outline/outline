import Router from 'koa-router';
import httpErrors from 'http-errors';
import fetch from 'isomorphic-fetch';
var querystring = require('querystring');

import { presentUser, presentTeam } from '../presenters';
import { User, Team } from '../models';

const router = new Router();

router.post('auth.slack', async (ctx) => {
  const { code } = ctx.request.body;
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
  if (!allowedSlackIds.includes(data.team_id)) throw httpErrors.BadRequest("Invalid Slack team");

  // User
  let userData;
  let user = await User.findOne({ where: { slackId: data.user_id }});

  if (user) {
    user.slackAccessToken = data.access_token;
    user.save();
  } else {
    // Find existing user
    const userParams = { token: data.access_token, user: data.user_id }
    const response = await fetch('https://slack.com/api/users.info?' + querystring.stringify(userParams));
    userData = await response.json();
    user = await User.create({
      slackId: data.user_id,
      username: userData.user.name,
      name: userData.user.profile.real_name,
      email: userData.user.profile.email,
      slackData: userData.user,
      slackAccessToken: data.access_token,
    });
  }

  // Team
  let team = await Team.findOne({ where: { slackId: data.team_id } });
  if (!team) {
    team = await Team.create({
      slackId: data.team_id,
      name: data.team_name,
    });
  }

  // Add to correct team
  user.setTeam(team);

  ctx.body = { data: {
    user: await presentUser(user),
    team: await presentTeam(team),
    accessToken: user.getJwtToken(),
  }};
});

export default router;
