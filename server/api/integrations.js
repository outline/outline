// @flow
import Router from 'koa-router';
import Integration from '../models/Integration';
import pagination from './middlewares/pagination';
import auth from './middlewares/authentication';
import { presentIntegration } from '../presenters';

const router = new Router();

router.post('integrations.list', auth(), pagination(), async ctx => {
  let { sort = 'updatedAt', direction } = ctx.body;
  if (direction !== 'ASC') direction = 'DESC';

  const user = ctx.state.user;
  const integrations = await Integration.findAll({
    where: { teamId: user.teamId },
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = await Promise.all(
    integrations.map(integration => presentIntegration(ctx, integration))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

export default router;
