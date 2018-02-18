// @flow
import Router from 'koa-router';
import httpErrors from 'http-errors';

import auth from './middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentCollection } from '../presenters';
import { Collection } from '../models';
import policy from '../policies';

const { authorize } = policy;
const router = new Router();

router.post('collections.create', auth(), async ctx => {
  const { name, color, description, type } = ctx.body;
  ctx.assertPresent(name, 'name is required');
  if (color)
    ctx.assertHexColor(color, 'Invalid hex value (please use format #FFFFFF)');

  const user = ctx.state.user;
  authorize(user, 'create', Collection);

  const collection = await Collection.create({
    name,
    description,
    color,
    type: type || 'atlas',
    teamId: user.teamId,
    creatorId: user.id,
  });

  ctx.body = {
    data: await presentCollection(ctx, collection),
  };
});

router.post('collections.info', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const collection = await Collection.scope('withRecentDocuments').findById(id);
  authorize(ctx.state.user, 'read', collection);

  ctx.body = {
    data: await presentCollection(ctx, collection),
  };
});

router.post('collections.update', auth(), async ctx => {
  const { id, name, color } = ctx.body;
  ctx.assertPresent(name, 'name is required');
  if (color)
    ctx.assertHexColor(color, 'Invalid hex value (please use format #FFFFFF)');

  const collection = await Collection.findById(id);
  authorize(ctx.state.user, 'update', collection);

  collection.name = name;
  collection.color = color;
  await collection.save();

  ctx.body = {
    data: await presentCollection(ctx, collection),
  };
});

router.post('collections.list', auth(), pagination(), async ctx => {
  const user = ctx.state.user;
  const collections = await Collection.findAll({
    where: {
      teamId: user.teamId,
    },
    order: [['updatedAt', 'DESC']],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = await Promise.all(
    collections.map(
      async collection => await presentCollection(ctx, collection)
    )
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('collections.delete', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const collection = await Collection.findById(id);
  authorize(ctx.state.user, 'delete', collection);

  const total = await Collection.count();
  if (total === 1) throw httpErrors.BadRequest('Cannot delete last collection');

  try {
    await collection.destroy();
  } catch (e) {
    throw httpErrors.BadRequest('Error while deleting collection');
  }

  ctx.body = {
    success: true,
  };
});

export default router;
