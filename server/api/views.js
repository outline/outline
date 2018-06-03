// @flow
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import { presentView } from '../presenters';
import { View, Document } from '../models';
import policy from '../policies';

const { authorize } = policy;
const router = new Router();

router.post('views.list', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const document = await Document.findById(id);
  authorize(user, 'read', document);

  const views = await View.findAll({
    where: { documentId: id },
    order: [['updatedAt', 'DESC']],
  });

  let users = [];
  let count = 0;
  await Promise.all(
    views.map(async view => {
      count = view.count;
      return users.push(await presentView(ctx, view));
    })
  );

  ctx.body = {
    data: {
      users,
      count,
    },
  };
});

router.post('views.create', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const document = await Document.findById(id);
  authorize(user, 'read', document);

  await View.increment({ documentId: document.id, userId: user.id });

  ctx.body = {
    success: true,
  };
});

export default router;
