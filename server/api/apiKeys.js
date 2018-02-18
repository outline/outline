// @flow
import Router from 'koa-router';
import httpErrors from 'http-errors';

import auth from './middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentApiKey } from '../presenters';
import { ApiKey } from '../models';
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

  ctx.body = {
    data: presentApiKey(ctx, key),
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

  const data = keys.map(key => presentApiKey(ctx, key));

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('apiKeys.delete', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const key = await ApiKey.findById(id);
  authorize(user, 'delete', ApiKey);

  try {
    await key.destroy();
  } catch (e) {
    throw httpErrors.BadRequest('Error while deleting key');
  }

  ctx.body = {
    success: true,
  };
});

export default router;
