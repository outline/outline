import Router from "koa-router";
import { MAX_AVATAR_DISPLAY } from "../../../shared/constants";
import auth from "../../middlewares/authentication";
import { User, Event, Group, GroupUser } from "../../models";
import policy from "../../policies";
import {
  presentGroup,
  presentPolicies,
  presentUser,
  presentGroupMembership,
} from "../../presenters";
import { Op } from "../../sequelize";
import { assertPresent, assertUuid, assertSort } from "../../validation";
import pagination from "./middlewares/pagination";

const { authorize } = policy;
const router = new Router();

router.post("groups.list", auth(), pagination(), async (ctx) => {
  let { direction } = ctx.body;
  const { sort = "updatedAt" } = ctx.body;
  if (direction !== "ASC") direction = "DESC";

  assertSort(sort, Group);
  const user = ctx.state.user;
  let groups = await Group.findAll({
    where: {
      teamId: user.teamId,
    },
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  if (!user.isAdmin) {
    groups = groups.filter(
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'group' implicitly has an 'any' type.
      (group) =>
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'gm' implicitly has an 'any' type.
        group.groupMemberships.filter((gm) => gm.userId === user.id).length
    );
  }

  ctx.body = {
    pagination: ctx.state.pagination,
    data: {
      groups: groups.map(presentGroup),
      groupMemberships: groups
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'g' implicitly has an 'any' type.
        .map((g) =>
          g.groupMemberships
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'membership' implicitly has an 'any' typ... Remove this comment to see the full error message
            .filter((membership) => !!membership.user)
            .slice(0, MAX_AVATAR_DISPLAY)
        )
        .flat()
        .map(presentGroupMembership),
    },
    policies: presentPolicies(user, groups),
  };
});

router.post("groups.info", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");

  const user = ctx.state.user;
  const group = await Group.findByPk(id);
  authorize(user, "read", group);
  ctx.body = {
    data: presentGroup(group),
    policies: presentPolicies(user, [group]),
  };
});

router.post("groups.create", auth(), async (ctx) => {
  const { name } = ctx.body;
  assertPresent(name, "name is required");

  const user = ctx.state.user;
  authorize(user, "createGroup", user.team);
  let group = await Group.create({
    name,
    teamId: user.teamId,
    createdById: user.id,
  });
  // reload to get default scope
  group = await Group.findByPk(group.id);
  await Event.create({
    name: "groups.create",
    actorId: user.id,
    teamId: user.teamId,
    modelId: group.id,
    data: {
      name: group.name,
    },
    ip: ctx.request.ip,
  });
  ctx.body = {
    data: presentGroup(group),
    policies: presentPolicies(user, [group]),
  };
});

router.post("groups.update", auth(), async (ctx) => {
  const { id, name } = ctx.body;
  assertPresent(name, "name is required");
  assertUuid(id, "id is required");

  const user = ctx.state.user;
  const group = await Group.findByPk(id);
  authorize(user, "update", group);
  group.name = name;

  if (group.changed()) {
    await group.save();
    await Event.create({
      name: "groups.update",
      teamId: user.teamId,
      actorId: user.id,
      modelId: group.id,
      data: {
        name,
      },
      ip: ctx.request.ip,
    });
  }

  ctx.body = {
    data: presentGroup(group),
    policies: presentPolicies(user, [group]),
  };
});

router.post("groups.delete", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state;
  const group = await Group.findByPk(id);
  authorize(user, "delete", group);
  await group.destroy();
  await Event.create({
    name: "groups.delete",
    actorId: user.id,
    modelId: group.id,
    teamId: group.teamId,
    data: {
      name: group.name,
    },
    ip: ctx.request.ip,
  });
  ctx.body = {
    success: true,
  };
});

router.post("groups.memberships", auth(), pagination(), async (ctx) => {
  const { id, query } = ctx.body;
  assertUuid(id, "id is required");

  const user = ctx.state.user;
  const group = await Group.findByPk(id);
  authorize(user, "read", group);
  let userWhere;

  if (query) {
    userWhere = {
      name: {
        [Op.iLike]: `%${query}%`,
      },
    };
  }

  const memberships = await GroupUser.findAll({
    where: {
      groupId: id,
    },
    order: [["createdAt", "DESC"]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
    include: [
      {
        model: User,
        as: "user",
        where: userWhere,
        required: true,
      },
    ],
  });
  ctx.body = {
    pagination: ctx.state.pagination,
    data: {
      groupMemberships: memberships.map(presentGroupMembership),
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'membership' implicitly has an 'any' typ... Remove this comment to see the full error message
      users: memberships.map((membership) => presentUser(membership.user)),
    },
  };
});

router.post("groups.add_user", auth(), async (ctx) => {
  const { id, userId } = ctx.body;
  assertUuid(id, "id is required");
  assertUuid(userId, "userId is required");

  const user = await User.findByPk(userId);
  authorize(ctx.state.user, "read", user);
  let group = await Group.findByPk(id);
  authorize(ctx.state.user, "update", group);
  let membership = await GroupUser.findOne({
    where: {
      groupId: id,
      userId,
    },
  });

  if (!membership) {
    await group.addUser(user, {
      through: {
        createdById: ctx.state.user.id,
      },
    });
    // reload to get default scope
    membership = await GroupUser.findOne({
      where: {
        groupId: id,
        userId,
      },
    });
    // reload to get default scope
    group = await Group.findByPk(id);
    await Event.create({
      name: "groups.add_user",
      userId,
      teamId: user.teamId,
      modelId: group.id,
      actorId: ctx.state.user.id,
      data: {
        name: user.name,
      },
      ip: ctx.request.ip,
    });
  }

  ctx.body = {
    data: {
      users: [presentUser(user)],
      groupMemberships: [presentGroupMembership(membership)],
      groups: [presentGroup(group)],
    },
  };
});

router.post("groups.remove_user", auth(), async (ctx) => {
  const { id, userId } = ctx.body;
  assertUuid(id, "id is required");
  assertUuid(userId, "userId is required");

  let group = await Group.findByPk(id);
  authorize(ctx.state.user, "update", group);
  const user = await User.findByPk(userId);
  authorize(ctx.state.user, "read", user);
  await group.removeUser(user);
  await Event.create({
    name: "groups.remove_user",
    userId,
    modelId: group.id,
    teamId: user.teamId,
    actorId: ctx.state.user.id,
    data: {
      name: user.name,
    },
    ip: ctx.request.ip,
  });
  // reload to get default scope
  group = await Group.findByPk(id);
  ctx.body = {
    data: {
      groups: [presentGroup(group)],
    },
  };
});

export default router;
