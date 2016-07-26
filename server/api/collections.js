import Router from 'koa-router';
import httpErrors from 'http-errors';
import _orderBy from 'lodash.orderby';

import auth from './authentication';
import pagination from './middlewares/pagination';
import { presentAtlas } from '../presenters';
import { Atlas } from '../models';

const router = new Router();

router.post('atlases.create', auth(), async (ctx) => {
  const {
    name,
    description,
    type,
  } = ctx.body;
  ctx.assertPresent(name, 'name is required');

  const user = ctx.state.user;

  const atlas = await Atlas.create({
    name,
    description,
    type: type || 'atlas',
    teamId: user.teamId,
    creatorId: user.id,
  });

  ctx.body = {
    data: await presentAtlas(atlas, true),
  };
});

router.post('atlases.info', auth(), async (ctx) => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const atlas = await Atlas.findOne({
    where: {
      id,
      teamId: user.teamId,
    },
  });

  if (!atlas) throw httpErrors.NotFound();

  ctx.body = {
    data: await presentAtlas(atlas, true),
  };
});


router.post('atlases.list', auth(), pagination(), async (ctx) => {
  const user = ctx.state.user;
  const atlases = await Atlas.findAll({
    where: {
      teamId: user.teamId,
    },
    order: [
      ['updatedAt', 'DESC'],
    ],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  // Atlases
  let data = [];
  await Promise.all(atlases.map(async (atlas) => {
    return data.push(await presentAtlas(atlas, true));
  }));

  data = _orderBy(data, ['updatedAt'], ['desc']);

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('atlases.updateNavigationTree', auth(), async (ctx) => {
  const { id, tree } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const atlas = await Atlas.findOne({
    where: {
      id,
      teamId: user.teamId,
    },
  });

  if (!atlas) throw httpErrors.NotFound();

  await atlas.updateNavigationTree(tree);

  ctx.body = {
    data: await presentAtlas(atlas, true),
  };
});

export default router;
