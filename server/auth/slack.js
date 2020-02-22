// @flow
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import { authorize } from '../utils/authorize';
import addMonths from 'date-fns/add_months';
import { Authentication, Integration, User, Team } from '../models';
import * as Slack from '../slack';

import { Strategy as SlackStrategy } from 'passport-slack';
import passport from 'koa-passport';

passport.use(
  new SlackStrategy(
    {
      clientID: process.env.SLACK_KEY,
      clientSecret: process.env.SLACK_SECRET,
      state: true, // undocumented option from peer-dependency passport-oauth
    },
    async (accessToken, refreshToken, data, done) => {
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

      done(null, user);
    }
  )
);

const router = new Router();

// start the oauth process and redirect user to Slack
router.get('slack', passport.authenticate('slack'));

// signin callback from Slack
router.get('slack.callback', async ctx => {
  let user: User;
  try {
    user = (await authorize('slack', ctx)).User;
  } catch (e) {
    ctx.redirect('/?notice=auth-error');
    return;
  }

  user.updateSignedIn(ctx.request.ip);
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

router.get('slack.commands', auth(), async ctx => {
  const { code, error } = ctx.request.query;
  ctx.assertPresent(code || error, 'code is required');

  if (error) {
    ctx.redirect(`/settings/integrations/slack?error=${error}`);
    return;
  }

  const endpoint = `${process.env.URL || ''}/auth/slack.commands`;
  const data = await Slack.oauthAccess(code, endpoint);
  const user = ctx.state.user;

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

router.get('slack.post', auth(), async ctx => {
  const { code, error, state } = ctx.request.query;
  ctx.assertPresent(code || error, 'code is required');

  if (error) {
    ctx.redirect(`/settings/integrations/slack?error=${error}`);
    return;
  }

  const collectionId = state;
  ctx.assertUuid(collectionId, 'collectionId must be an uuid');

  const endpoint = `${process.env.URL || ''}/auth/slack.post`;
  const data = await Slack.oauthAccess(code, endpoint);
  const user = ctx.state.user;

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
