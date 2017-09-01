// @flow
import Router from 'koa-router';
import httpErrors from 'http-errors';
import _ from 'lodash';

import auth from './middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentCollection } from '../presenters';
import { Collection } from '../models';

const router = new Router();

router.post('collections.create', auth(), async ctx => {
  const { name, description, type } = ctx.body;
  ctx.assertPresent(name, 'name is required');

  const user = ctx.state.user;

  const collection = await Collection.create({
    name,
    description,
    type: type || 'atlas',
    teamId: user.teamId,
    creatorId: user.id,
  });

  ctx.body = {
    data: await presentCollection(ctx, collection),
  };
});

router.post('collections.update', auth(), async ctx => {
  const { id, name } = ctx.body;
  ctx.assertPresent(name, 'name is required');

  const collection = await Collection.findById(id);
  collection.name = name;
  await collection.save();

  ctx.body = {
    data: await presentCollection(ctx, collection),
  };
});

router.post('collections.info', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const collection = await Collection.scope('withRecentDocuments').findOne({
    where: {
      id,
      teamId: user.teamId,
    },
  });

  if (!collection) throw httpErrors.NotFound();

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

  const user = ctx.state.user;
  const collection = await Collection.findById(id);
  const total = await Collection.count();

  if (total === 1) throw httpErrors.BadRequest('Cannot delete last collection');

  if (!collection || collection.teamId !== user.teamId)
    throw httpErrors.BadRequest();

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
