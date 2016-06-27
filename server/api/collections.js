import Router from 'koa-router';
import httpErrors from 'http-errors';
import _orderBy from 'lodash.orderby';

import auth from './authentication';
import pagination from './middlewares/pagination';
import { presentAtlas } from '../presenters';
import { Team, Atlas } from '../models';

const router = new Router();

router.post('atlases.info', auth(), async (ctx) => {
  let { id } = ctx.request.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const atlas = await Atlas.findOne({
    where: {
      id: id,
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
    data.push(await presentAtlas(atlas, true));
  }));

  data = _orderBy(data, ['updatedAt'], ['desc']);

  ctx.body = {
    pagination: ctx.state.pagination,
    data: data,
  };
});

router.post('atlases.updateNavigationTree', auth(), async (ctx) => {
  let { id, tree } = ctx.request.body;
    ctx.assertPresent(id, 'id is required');

    const user = ctx.state.user;
    const atlas = await Atlas.findOne({
      where: {
        id: id,
        teamId: user.teamId,
      },
    });

    if (!atlas) throw httpErrors.NotFound();

    const newTree = await atlas.updateNavigationTree(tree);

    ctx.body = {
      data: await presentAtlas(atlas, true),
    };
});

export default router;
