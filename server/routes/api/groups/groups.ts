import Router from "koa-router";
import type { WhereOptions } from "sequelize";
import { Op } from "sequelize";
import { MAX_AVATAR_DISPLAY } from "@shared/constants";
import { GroupPermission } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { User, Group, GroupUser } from "@server/models";
import { authorize } from "@server/policies";
import {
  presentGroup,
  presentGroupUser,
  presentPolicies,
  presentUser,
} from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "groups.list",
  auth(),
  pagination(),
  validate(T.GroupsListSchema),
  async (ctx: APIContext<T.GroupsListReq>) => {
    const { sort, direction, query, userId, externalId, name } = ctx.input.body;
    const { user } = ctx.state.auth;
    authorize(user, "listGroups", user.team);

    let where: WhereOptions<Group> = {
      teamId: user.teamId,
    };

    if (name) {
      where = {
        ...where,
        name: {
          [Op.eq]: name,
        },
      };
    } else if (query) {
      where = {
        ...where,
        name: {
          [Op.iLike]: `%${query}%`,
        },
      };
    }

    if (externalId) {
      where = {
        ...where,
        externalId,
      };
    }

    if (userId) {
      const groupIds = await Group.filterByMember(userId)
        .findAll({
          attributes: ["id"],
        })
        .then((groups) => groups.map((g) => g.id));

      where = {
        ...where,
        id: {
          [Op.in]: groupIds,
        },
      };
    }

    const [groups, total] = await Promise.all([
      Group.findAll({
        where,
        include: [
          {
            model: GroupUser,
            as: "groupUsers",
            required: false,
            where: {
              userId: user.id,
            },
          },
        ],
        order: [[sort, direction]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      Group.count({
        where,
      }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: {
        groups: await Promise.all(groups.map(presentGroup)),
        // TODO: Deprecated, will remove in the future as language conflicts with GroupMembership
        groupMemberships: (
          await Promise.all(
            groups.map((group) =>
              GroupUser.findAll({
                where: {
                  groupId: group.id,
                },
                order: [["permission", "ASC"]],
                limit: MAX_AVATAR_DISPLAY,
              })
            )
          )
        )
          .flat()
          .filter((groupUser) => groupUser.user)
          .map((groupUser) =>
            presentGroupUser(groupUser, { includeUser: true })
          ),
      },
      policies: presentPolicies(user, groups),
    };
  }
);

router.post(
  "groups.info",
  auth(),
  validate(T.GroupsInfoSchema),
  async (ctx: APIContext<T.GroupsInfoReq>) => {
    const { id, externalId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const include = [
      {
        model: GroupUser,
        as: "groupUsers",
        required: false,
        where: {
          userId: user.id,
        },
      },
    ];

    const group = id
      ? await Group.findByPk(id, { include })
      : externalId
        ? await Group.findOne({
            include,
            where: { teamId: user.teamId, externalId },
          })
        : null;

    authorize(user, "read", group);

    ctx.body = {
      data: await presentGroup(group),
      policies: presentPolicies(user, [group]),
    };
  }
);

router.post(
  "groups.create",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  auth(),
  validate(T.GroupsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.GroupsCreateReq>) => {
    const { name, externalId, disableMentions } = ctx.input.body;
    const { user } = ctx.state.auth;
    authorize(user, "createGroup", user.team);

    const group = await Group.createWithCtx(ctx, {
      name,
      externalId,
      disableMentions,
      teamId: user.teamId,
      createdById: user.id,
    });

    group.groupUsers = [];

    ctx.body = {
      data: await presentGroup(group),
      policies: presentPolicies(user, [group]),
    };
  }
);

router.post(
  "groups.update",
  auth(),
  validate(T.GroupsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.GroupsUpdateReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const group = await Group.findByPk(id, {
      transaction,
      include: [
        {
          model: GroupUser,
          as: "groupUsers",
          required: false,
          where: {
            userId: user.id,
          },
        },
      ],
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Group,
      },
    });
    authorize(user, "update", group);

    await group.updateWithCtx(ctx, ctx.input.body);

    ctx.body = {
      data: await presentGroup(group),
      policies: presentPolicies(user, [group]),
    };
  }
);

router.post(
  "groups.delete",
  auth(),
  validate(T.GroupsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.GroupsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const group = await Group.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(user, "delete", group);

    await group.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "groups.memberships",
  auth(),
  pagination(),
  validate(T.GroupsMembershipsSchema),
  async (ctx: APIContext<T.GroupsMembershipsReq>) => {
    const { id, query } = ctx.input.body;
    const { user } = ctx.state.auth;

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

    const options = {
      where: {
        groupId: id,
      },
      include: [
        {
          model: User,
          as: "user",
          where: userWhere,
          required: true,
        },
      ],
    };

    const [total, groupUsers] = await Promise.all([
      GroupUser.count(options),
      GroupUser.findAll({
        ...options,
        order: [["createdAt", "DESC"]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: {
        groupMemberships: groupUsers.map((groupUser) =>
          presentGroupUser(groupUser, { includeUser: true })
        ),
        users: groupUsers.map((groupUser) => presentUser(groupUser.user)),
      },
    };
  }
);

router.post(
  "groups.add_user",
  auth(),
  validate(T.GroupsAddUserSchema),
  transaction(),
  async (ctx: APIContext<T.GroupsAddUserReq>) => {
    const { id, userId, permission } = ctx.input.body;
    const actor = ctx.state.auth.user;
    const { transaction } = ctx.state;

    const user = await User.findByPk(userId, { transaction });
    authorize(actor, "read", user);

    // Load group with group users for authorization
    const group = await Group.findByPk(id, {
      transaction,
      include: [
        {
          model: GroupUser,
          as: "groupUsers",
          required: false,
          where: {
            userId: actor.id,
          },
        },
      ],
    });
    authorize(actor, "update", group);

    const userPermission = permission;

    const [groupUser] = await GroupUser.findOrCreateWithCtx(
      ctx,
      {
        where: {
          groupId: group.id,
          userId: user.id,
        },
        defaults: {
          createdById: actor.id,
          permission: userPermission || GroupPermission.Member,
        },
      },
      { name: "add_user" }
    );

    // If the user already exists in the group, update the permission if provided
    if (
      userPermission !== undefined &&
      groupUser.permission !== userPermission
    ) {
      await groupUser.updateWithCtx(ctx, { permission: userPermission });
    }

    groupUser.user = user;

    ctx.body = {
      data: {
        users: [presentUser(user)],
        groupMemberships: [presentGroupUser(groupUser, { includeUser: true })],
        groups: [await presentGroup(group)],
      },
    };
  }
);

router.post(
  "groups.remove_user",
  auth(),
  validate(T.GroupsRemoveUserSchema),
  transaction(),
  async (ctx: APIContext<T.GroupsRemoveUserReq>) => {
    const { id, userId } = ctx.input.body;
    const actor = ctx.state.auth.user;
    const { transaction } = ctx.state;

    const group = await Group.findByPk(id, {
      transaction,
      include: [
        {
          model: GroupUser,
          as: "groupUsers",
          required: false,
          where: {
            userId: actor.id,
          },
        },
      ],
    });
    authorize(actor, "update", group);

    const user = await User.findByPk(userId, { transaction });
    authorize(actor, "read", user);

    const groupUser = await GroupUser.unscoped().findOne({
      where: {
        groupId: group.id,
        userId: user.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    await groupUser?.destroyWithCtx(ctx, { name: "remove_user" });

    ctx.body = {
      data: {
        groups: [await presentGroup(group)],
      },
    };
  }
);

router.post(
  "groups.update_user",
  auth(),
  validate(T.GroupsUpdateUserSchema),
  transaction(),
  async (ctx: APIContext<T.GroupsUpdateUserReq>) => {
    const { id, userId, permission } = ctx.input.body;
    const actor = ctx.state.auth.user;
    const { transaction } = ctx.state;

    // Load group with group users for authorization
    const group = await Group.findByPk(id, {
      transaction,
      include: [
        {
          model: GroupUser,
          as: "groupUsers",
          required: false,
          where: {
            userId: actor.id,
          },
        },
      ],
    });
    authorize(actor, "update", group);

    const user = await User.findByPk(userId, { transaction });
    authorize(actor, "read", user);

    const groupUser = await GroupUser.unscoped().findOne({
      where: {
        groupId: group.id,
        userId: user.id,
      },
      transaction,
      rejectOnEmpty: true,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: GroupUser,
      },
    });

    await groupUser.updateWithCtx(ctx, { permission });
    groupUser.user = user;

    ctx.body = {
      data: {
        users: [presentUser(user)],
        groupMemberships: [presentGroupUser(groupUser, { includeUser: true })],
        groups: [await presentGroup(group)],
      },
    };
  }
);

export default router;
