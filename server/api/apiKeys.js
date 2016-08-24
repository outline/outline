import Router from 'koa-router';
import httpErrors from 'http-errors';
import _ from 'lodash';

import auth from './authentication';
import pagination from './middlewares/pagination';
import { presentApiKey } from '../presenters';
import { ApiKey } from '../models';

const router = new Router();

router.post('apiKeys.create', auth(), async (ctx) => {
  const {
    name,
  } = ctx.body;
  ctx.assertPresent(name, 'name is required');

  const user = ctx.state.user;

  const key = await ApiKey.create({
    name,
    userId: user.id,
  });

  ctx.body = {
    data: presentApiKey(ctx, key),
  };
});

router.post('apiKeys.list', auth(), pagination(), async (ctx) => {
  const user = ctx.state.user;
  const keys = await ApiKey.findAll({
    where: {
      userId: user.id,
    },
    order: [
      ['createdAt', 'DESC'],
    ],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = keys.map(key => {
    return presentApiKey(ctx, key);
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

export default router;
