import Router from 'koa-router';
import httpErrors from 'http-errors';

import auth from './authentication';
import pagination from './middlewares/pagination';
import { presentDocument } from '../presenters';
import { Document, Atlas } from '../models';

const router = new Router();

router.post('documents.info', auth(), async (ctx) => {
  let { id } = ctx.request.body;
  ctx.assertPresent(id, 'id is required');

  const team = await ctx.state.user.getTeam();
  const document = await Document.findOne({
    where: {
      id: id,
      teamId: team.id,
    },
  });

  if (!document) throw httpErrors.NotFound();

  ctx.body = {
    data: await presentDocument(document, true),
  };
});


router.post('documents.create', auth(), async (ctx) => {
  let {
    atlas,
    title,
    text,
  } = ctx.request.body;
  ctx.assertPresent(atlas, 'atlas is required');
  ctx.assertPresent(title, 'title is required');
  ctx.assertPresent(text, 'text is required');

  const user = ctx.state.user;
  const team = await user.getTeam();
  const ownerAtlas = await Atlas.findOne({
    where: {
      id: atlas,
      teamId: team.id,
    },
  });

  if (!ownerAtlas) throw httpErrors.BadRequest();

  const document = await Document.create({
    atlasId: ownerAtlas.id,
    teamId: team.id,
    userId: user.id,
    title: title,
    text: text,
  });

  ctx.body = {
    data: await presentDocument(document, true),
  };
});

export default router;