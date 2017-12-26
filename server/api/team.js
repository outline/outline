// @flow
import Router from 'koa-router';
import httpErrors from 'http-errors';

import User from '../models/User';
import Team from '../models/Team';

import auth from './middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentUser } from '../presenters';

const router = new Router();
router.use(auth({ adminOnly: true }));

router.post('team.users', pagination(), async ctx => {
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
    data: users.map(user => presentUser(ctx, user, { includeDetails: true })),
  };
});

router.post('team.addAdmin', async ctx => {
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

router.post('team.removeAdmin', async ctx => {
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
