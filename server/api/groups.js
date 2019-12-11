// @flow
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import { presentView, presentGroup } from '../presenters';
import { View, Document, Event, User, Group } from '../models';
import policy from '../policies';

const { authorize } = policy;
const router = new Router();

router.post('groups.list', auth(), async ctx => {
  const { documentId } = ctx.body;
  ctx.assertUuid(documentId, 'documentId is required');

  const user = ctx.state.user;
  const document = await Document.findByPk(documentId, { userId: user.id });
  authorize(user, 'read', document);

  const views = await View.findAll({
    where: { documentId },
    order: [['updatedAt', 'DESC']],
    include: [
      {
        model: User,
        paranoid: false,
      },
    ],
  });

  ctx.body = {
    data: views.map(presentView),
  };
});

router.post('groups.create', auth(), async ctx => {
  const { name } = ctx.body;
  ctx.assertPresent(name, 'name is required');

  const user = ctx.state.user;

  // TODO: authorize this to admins only
  const group = await Group.create({
    name,
    teamId: user.teamId,
    createdById: user.id,
  });

  Event.create({
    name: 'groups.create',
    actorId: user.id,
    teamId: user.teamId,
    modelId: group.id,
    data: { name: group.name },
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentGroup(group),
  };
});

export default router;
