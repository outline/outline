// @flow
import Router from 'koa-router';
import Integration from '../models/Integration';
import pagination from './middlewares/pagination';
import auth from '../middlewares/authentication';
import { presentIntegration } from '../presenters';
import policy from '../policies';
import events from '../events';

const { authorize } = policy;
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

  ctx.body = {
    pagination: ctx.state.pagination,
    data: integrations.map(presentIntegration),
  };
});

router.post('integrations.delete', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertUuid(id, 'id is required');

  const user = ctx.state.user;
  const integration = await Integration.findByPk(id);
  authorize(user, 'delete', integration);

  await integration.destroy();

  events.add({
    name: 'integrations.delete',
    modelId: integration.id,
    teamId: integration.teamId,
    actorId: user.id,
  });

  ctx.body = {
    success: true,
  };
});

export default router;
