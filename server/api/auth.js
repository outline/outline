// @flow
import Router from 'koa-router';
import apiError from '../errors';
import { presentUser, presentTeam } from '../presenters';
import { User, Team } from '../models';
import * as Slack from '../slack';

const router = new Router();

// router.post('auth.signup', async ctx => {
//   const { username, name, email, password } = ctx.request.body;

//   ctx.assertPresent(username, 'name is required');
//   ctx.assertPresent(name, 'name is required');
//   ctx.assertPresent(email, 'email is required');
//   ctx.assertEmail(email, 'email is invalid');
//   ctx.assertPresent(password, 'password is required');

//   if (await User.findOne({ where: { email } })) {
//     throw apiError(
//       400,
//       'user_exists_with_email',
//       'User already exists with this email'
//     );
//   }

//   if (await User.findOne({ where: { username } })) {
//     throw apiError(
//       400,
//       'user_exists_with_username',
//       'User already exists with this username'
//     );
//   }

//   const user = await User.create({
//     username,
//     name,
//     email,
//     password,
//   });

//   ctx.body = {
//     data: {
//       user: await presentUser(ctx, user),
//       accessToken: user.getJwtToken(),
//     },
//   };
// });

// router.post('auth.login', async ctx => {
//   const { username, password } = ctx.request.body;

//   ctx.assertPresent(username, 'username/email is required');
//   ctx.assertPresent(password, 'password is required');

//   let user;
//   if (username) {
//     user = await User.findOne({
//       where: Sequelize.or({ email: username }, { username }),
//     });
//   } else {
//     throw apiError(400, 'invalid_credentials', 'username or email is invalid');
//   }

//   if (!user) {
//     throw apiError(400, 'username or email is invalid');
//   }

//   if (!user.passwordDigest) {
//     throw apiError(400, 'no_password', 'No password set');
//   }

//   if (!await user.verifyPassword(password)) {
//     throw apiError(400, 'invalid_password', 'Invalid password');
//   }

//   ctx.body = {
//     data: {
//       user: await presentUser(ctx, user),
//       accessToken: user.getJwtToken(),
//     },
//   };
// });

router.post('auth.slack', async ctx => {
  const { code } = ctx.body;
  ctx.assertPresent(code, 'code is required');

  const data = await Slack.oauthAccess(code);

  // Temp to block
  const allowedSlackDomains = (process.env.ALLOWED_SLACK_DOMAINS || '')
    .split(',');
  if (!allowedSlackDomains.includes(data.team.domain)) {
    throw apiError(
      400,
      'invalid_slack_team',
      'Atlas is currently in private beta'
    );
  }

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
