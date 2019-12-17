// @flow
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import pagination from './middlewares/pagination';
import { Op } from '../sequelize';
import {
  presentGroup,
  presentPolicies,
  presentUser,
  presentGroupMembership,
} from '../presenters';
import { User, Event, Group, GroupUser } from '../models';
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

  await Event.create({
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
  ctx.assertUuid(id, 'id is required');

  const user = ctx.state.user;
  const group = await Group.findByPk(id);

  authorize(user, 'update', group);

  group.name = name;
  await group.save();

  await Event.create({
    name: 'groups.update',
    teamId: user.teamId,
    actorId: user.id,
    data: { name },
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentGroup(group),
    policies: presentPolicies(user, [group]),
  };
});

router.post('groups.delete', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertUuid(id, 'id is required');

  const { user } = ctx.state;
  const group = await Group.findByPk(id);

  authorize(user, 'delete', group);
  await group.destroy();

  await Event.create({
    name: 'groups.delete',
    actorId: user.id,
    teamId: group.teamId,
    data: { name: group.name },
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
  };
});

router.post('groups.memberships', auth(), pagination(), async ctx => {
  const { id, query, permission } = ctx.body;
  ctx.assertUuid(id, 'id is required');

  const user = ctx.state.user;
  const group = await Group.findByPk(id);

  authorize(user, 'read', group);

  let where = {
    groupId: id,
  };

  let userWhere;

  if (query) {
    userWhere = {
      name: {
        [Op.iLike]: `%${query}%`,
      },
    };
  }

  if (permission) {
    where = {
      ...where,
      permission,
    };
  }

  const memberships = await GroupUser.findAll({
    where,
    order: [['createdAt', 'DESC']],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
    include: [
      {
        model: User,
        as: 'user',
        where: userWhere,
        required: true,
      },
    ],
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: {
      groupMemberships: memberships.map(presentGroupMembership),
      users: memberships.map(membership => presentUser(membership.user)),
    },
  };
});

export default router;
