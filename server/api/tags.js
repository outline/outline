// @flow
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentTag } from '../presenters';
import { Tag } from '../models';

const router = new Router();

router.post('tags.list', auth(), pagination(), async ctx => {
  let { sort = 'updatedAt', direction } = ctx.body;
  if (direction !== 'ASC') direction = 'DESC';

  const user = ctx.state.user;
  const tags = await Tag.findAll({
    where: {
      teamId: user.teamId,
    },
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = tags.map(tag => presentTag(ctx, tag));

  ctx.body = {
    data,
  };
});

export default router;
