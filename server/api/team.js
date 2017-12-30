// @flow
import Router from 'koa-router';
import httpErrors from 'http-errors';

import User from '../models/User';
import Team from '../models/Team';

import auth from './middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentUser } from '../presenters';

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

router.post('team.addAdmin', auth({ adminOnly: true }), async ctx => {
  const { user } = ctx.body;
  const admin = ctx.state.user;
  ctx.assertPresent(user, 'id is required');

  const team = await Team.findById(admin.teamId);
  const promotedUser = await User.findOne({
    where: { id: user, teamId: admin.teamId },
  });

  if (!promotedUser) throw httpErrors.NotFound();

  await team.addAdmin(promotedUser);

  ctx.body = presentUser(ctx, promotedUser, { includeDetails: true });
});

router.post('team.removeAdmin', auth({ adminOnly: true }), async ctx => {
  const { user } = ctx.body;
  const admin = ctx.state.user;
  ctx.assertPresent(user, 'id is required');

  const team = await Team.findById(admin.teamId);
  const demotedUser = await User.findOne({
    where: { id: user, teamId: admin.teamId },
  });

  if (!demotedUser) throw httpErrors.NotFound();

  try {
    await team.removeAdmin(demotedUser);
    ctx.body = presentUser(ctx, user, { includeDetails: true });
  } catch (e) {
    throw httpErrors.BadRequest(e.message);
  }
});

export default router;
