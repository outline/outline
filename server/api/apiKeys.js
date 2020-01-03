// @flow
import Router from 'koa-router';

import auth from '../middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentApiKey } from '../presenters';
import { ApiKey, Event } from '../models';
import policy from '../policies';

const { authorize } = policy;
const router = new Router();

router.post('apiKeys.create', auth(), async ctx => {
  const { name } = ctx.body;
  ctx.assertPresent(name, 'name is required');

  const user = ctx.state.user;
  authorize(user, 'create', ApiKey);

  const key = await ApiKey.create({
    name,
    userId: user.id,
  });

  await Event.create({
    name: 'api_keys.create',
    modelId: key.id,
    teamId: user.teamId,
    actorId: user.id,
    data: { name },
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentApiKey(key),
  };
});

router.post('apiKeys.list', auth(), pagination(), async ctx => {
  const user = ctx.state.user;
  const keys = await ApiKey.findAll({
    where: {
      userId: user.id,
    },
    order: [['createdAt', 'DESC']],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: keys.map(presentApiKey),
  };
});

router.post('apiKeys.delete', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertUuid(id, 'id is required');

  const user = ctx.state.user;
  const key = await ApiKey.findByPk(id);
  authorize(user, 'delete', key);

  await key.destroy();

  await Event.create({
    name: 'api_keys.delete',
    modelId: key.id,
    teamId: user.teamId,
    actorId: user.id,
    data: { name: key.name },
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
  };
});

export default router;
