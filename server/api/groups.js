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

  authorize(user, 'create', Group);
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

router.post('groups.update', auth(), async ctx => {
  const { id, name } = ctx.body;
  ctx.assertPresent(name, 'name is required');

  const user = ctx.state.user;
  const group = await Group.findByPk(id);

  // NOTE: the flowtyping seems to not be working here
  // I can pipe in anything into the third arg and not raise a flow issue
  authorize(user, 'update', group);

  group.name = name;
  await group.save();

  await Event.create({
    name: 'groups.update',
    actorId: user.id,
    data: { name },
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentGroup(group),
  };
});

export default router;
