// @flow
import Router from 'koa-router';
import httpErrors from 'http-errors';

import Team from '../models/Team';
import User from '../models/User';

import auth from './middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentUser } from '../presenters';
import policy from '../policies';

const { authorize } = policy;
const router = new Router();

router.post('team.users', auth(), pagination(), async ctx => {
  const user = ctx.state.user;

  const users = await User.findAll({
    where: {
      teamId: user.teamId,
    },
    order: [['createdAt', 'DESC']],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: users.map(listUser =>
      presentUser(ctx, listUser, { includeDetails: user.isAdmin })
    ),
  };
});

router.post('team.addAdmin', auth(), async ctx => {
  const userId = ctx.body.user;
  const teamId = ctx.state.user.teamId;
  ctx.assertPresent(userId, 'id is required');

  const user = await User.findById(userId);
  authorize(ctx.state.user, 'promote', user);

  const team = await Team.findById(teamId);
  await team.addAdmin(user);

  ctx.body = {
    data: presentUser(ctx, user, { includeDetails: true }),
  };
});

router.post('team.removeAdmin', auth(), async ctx => {
  const userId = ctx.body.user;
  const teamId = ctx.state.user.teamId;
  ctx.assertPresent(userId, 'id is required');

  const user = await User.findById(userId);
  authorize(ctx.state.user, 'demote', user);

  const team = await Team.findById(teamId);

  try {
    await team.removeAdmin(user);
  } catch (err) {
    throw httpErrors.BadRequest(err.message);
  }

  ctx.body = {
    data: presentUser(ctx, user, { includeDetails: true }),
  };
});

export default router;
