import Router from 'koa-router';
import httpErrors from 'http-errors';
import auth from './middlewares/authentication';
import { View, Document } from '../models';

const router = new Router();

router.post('views.list', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  ctx.body = {
    data: 'OKAY',
  };
});

router.post('views.create', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const document = await Document.findById(id);

  if (!document || document.teamId !== user.teamId)
    throw httpErrors.BadRequest();

  await View.increment({ documentId: document.id, userId: user.id });
});

export default router;
