// @flow
import Router from 'koa-router';
import { User } from '../models';

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

export default router;
