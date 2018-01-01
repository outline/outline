// @flow
import Router from 'koa-router';
import auth from '../../server/api/middlewares/authentication';
import { Authentication } from '../../server/models';
import * as Slack from '../../server/slack';

const router = new Router();

router.post('auth', auth(), async ctx => {
  const { code } = ctx.body;
  ctx.assertPresent(code, 'code is required');

  const user = ctx.state.user;
  const endpoint = `${process.env.URL || ''}/services/slack/auth`;
  const data = await Slack.oauthAccess(code, endpoint);

  await Authentication.create({
    serviceId: 'slack',
    userId: user.id,
    teamId: user.teamId,
    token: data.access_token,
    scopes: data.scope.split(','),
  });
});
