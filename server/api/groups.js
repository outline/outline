// @flow
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentGroup, presentPolicies } from '../presenters';
import { Event, Group } from '../models';
import policy from '../policies';

const { authorize } = policy;
const router = new Router();

router.post('groups.list', auth(), pagination(), async ctx => {
  const user = ctx.state.user;
  let groups = await Group.findAll({
    where: {
      teamId: user.teamId,
    },
    order: [['updatedAt', 'DESC']],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: groups.map(presentGroup),
    policies: presentPolicies(user, groups),
  };
});

router.post('groups.info', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertUuid(id, 'id is required');

  const user = ctx.state.user;
  const group = await Group.findByPk(id);
  authorize(user, 'read', group);

  ctx.body = {
    data: presentGroup(group),
    policies: presentPolicies(user, [group]),
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
    policies: presentPolicies(user, [group]),
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
    policies: presentPolicies(user, [group]),
  };
});

export default router;
